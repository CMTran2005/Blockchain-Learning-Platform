const { db, admin }              = require('../config/firebase');
const { validateCourse }         = require('../models/Course');
const { uploadJSONToPinata }     = require('../config/pinata');
const { contract, isContractReady } = require('../config/contract');
const { filterCourse, filterList } = require('../utils/responseFilter');
const { ethers }            = require('ethers');

/**
 * GET /api/courses
 * Lấy danh sách khoá học (filter theo category, level, status).
 */
const getAllCourses = async (req, res) => {
  try {
    const { category, level, status } = req.query;

    let queryRef = db.collection('courses').where('status', '==', status || 'active');
    if (category) queryRef = queryRef.where('category', '==', category);
    if (level)    queryRef = queryRef.where('level',    '==', level);

    const snapshot = await queryRef.get();
    const courses = snapshot.docs.map(doc => ({ courseId: doc.id, ...doc.data() }));

    res.status(200).json(filterList(courses, filterCourse));
  } catch (error) {
    res.status(500).json({ message: 'Unable to retrieve course data', error: error.message });
  }
};

/**
 * GET /api/courses/:courseId
 * Lấy thông tin một khoá học theo ID.
 */
const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const doc = await db.collection('courses').doc(courseId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json(filterCourse({ courseId: doc.id, ...doc.data() }));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving course', error: error.message });
  }
};

/**
 * POST /api/courses
 * Tạo khoá học mới (Admin only).
 *
 * Luồng:
 *  1. Validate input
 *  2. Lưu course vào Firebase
 *  3. Upload course snapshot JSON lên Pinata → nhận metadataCid
 *  4. Cập nhật metadataCid vào Firebase
 *  5. (Nếu contract sẵn sàng) Gọi contract.createCourse(blockchainCourseId, cid, priceWei)
 */
const createCourse = async (req, res) => {
  try {
    const { title, description, instructor, price, category, level, duration, blockchainCourseId } = req.body;

    const errors = validateCourse(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const docRef  = db.collection('courses').doc();
    const courseId = docRef.id;

    const newCourse = {
      courseId,
      blockchainCourseId: blockchainCourseId ?? null,
      title,
      description:          description || '',
      instructor,
      price,
      category,
      level:                level || 'beginner',
      duration:             duration || 0,
      imageUrl:             req.body.imageUrl || '',    // URL Cloudinary (upload trước qua /api/upload/media)
      lessonIds:            [],
      averageRating:        0,
      reviewCount:          0,
      enrolledCount:        0,
      certificateRewardable: req.body.certificateRewardable || false,
      tags:                 req.body.tags || [],
      status:               'active',
      metadataCid:          '',                         // Sẽ cập nhật sau khi upload Pinata
      createdAt:            new Date().toISOString(),
      updatedAt:            new Date().toISOString(),
      createdBy:            req.user?.walletAddress || 'admin',
    };

    // Bước 1: Lưu vào Firebase
    await docRef.set(newCourse);

    // Bước 2: Upload course snapshot lên Pinata IPFS
    let metadataCid = '';
    let metadataUrl = '';
    try {
      const snapshot = {
        courseId,
        blockchainCourseId: blockchainCourseId ?? null,
        title,
        instructor,
        price,
        category,
        level: level || 'beginner',
        createdAt: newCourse.createdAt,
        createdBy: newCourse.createdBy,
      };
      const pinataResult = await uploadJSONToPinata(snapshot, `course_${courseId}`);
      metadataCid = pinataResult.cid;
      metadataUrl = pinataResult.url;

      // Cập nhật CID vào Firebase
      await docRef.update({ metadataCid });
    } catch (pinataErr) {
      console.warn('⚠️  Pinata upload failed (non-blocking):', pinataErr.message);
    }

    // Bước 3: Đăng ký on-chain nếu contract sẵn sàng và blockchainCourseId được cung cấp
    let contractTx = null;
    if (isContractReady() && blockchainCourseId && metadataCid) {
      try {
        const priceWei = ethers.parseEther(String(price));
        const tx = await contract.createCourse(blockchainCourseId, metadataCid, priceWei);
        await tx.wait();
        contractTx = tx.hash;
        console.log(`✅ Course ${blockchainCourseId} registered on-chain: ${tx.hash}`);
      } catch (contractErr) {
        console.warn('⚠️  Contract createCourse failed (non-blocking):', contractErr.message);
      }
    }

    res.status(201).json({
      message: 'Course created successfully',
      courseId,
      metadataCid,
      metadataUrl,
      contractTx,
      ...filterCourse(newCourse),
    });

  } catch (error) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

/**
 * PUT /api/courses/:courseId
 * Cập nhật thông tin khoá học.
 */
const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (req.body.title || req.body.price) {
      const errors = validateCourse({ title: req.body.title, ...req.body });
      if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }
    }

    // Không cho phép update courseId, metadataCid (immutable sau khi ghi on-chain)
    const { courseId: _, metadataCid: __, ...safeUpdate } = req.body;

    await db.collection('courses').doc(courseId).update({
      ...safeUpdate,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
};

/**
 * DELETE /api/courses/:courseId
 * Xoá khoá học (Admin only).
 */
const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const doc = await db.collection('courses').doc(courseId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await db.collection('courses').doc(courseId).delete();
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
};

/**
 * GET /api/courses/search
 * Tìm kiếm khoá học theo từ khoá.
 */
const searchCourses = async (req, res) => {
  try {
    const { query, category, level } = req.query;

    let queryRef = db.collection('courses').where('status', '==', 'active');
    if (category) queryRef = queryRef.where('category', '==', category);
    if (level)    queryRef = queryRef.where('level',    '==', level);

    const snapshot = await queryRef.get();
    let courses = snapshot.docs.map(doc => ({ courseId: doc.id, ...doc.data() }));

    if (query) {
      const lowerQuery = query.toLowerCase();
      courses = courses.filter(c =>
        c.title?.toLowerCase().includes(lowerQuery) ||
        c.description?.toLowerCase().includes(lowerQuery)
      );
    }

    res.status(200).json(filterList(courses, filterCourse));
  } catch (error) {
    res.status(500).json({ message: 'Error searching courses', error: error.message });
  }
};

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse, searchCourses };