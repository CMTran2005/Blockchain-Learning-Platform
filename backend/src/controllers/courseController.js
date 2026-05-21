const { db, admin } = require('../config/firebase');
const { validateCourse } = require('../models/Course');
const { uploadJSONToPinata } = require('../config/pinata');
const { contract, isContractReady } = require('../config/contract');
const { filterCourse, filterList } = require('../utils/responseFilter');
const {
  getNextAvailableBlockchainId,
  isBlockchainCourseRegistered,
  getOnChainPriceEth,
} = require('../utils/blockchainCourse');
const { ethers } = require('ethers');

/**
 * GET /api/courses
 * Lấy danh sách khoá học (filter theo category, level, status).
 */
const getAllCourses = async (req, res) => {
  try {
    const { category, level, status } = req.query;

    let queryRef = db.collection('courses').where('status', '==', status || 'active');
    if (category) queryRef = queryRef.where('category', '==', category);
    if (level) queryRef = queryRef.where('level', '==', level);

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
    let doc = await db.collection('courses').doc(courseId).get();

    // Lookup by blockchainCourseId when URL uses numeric id (e.g. /course/21)
    if (!doc.exists) {
      const chainId = parseInt(courseId, 10);
      if (!isNaN(chainId)) {
        const snap = await db.collection('courses')
          .where('blockchainCourseId', '==', chainId)
          .limit(1)
          .get();
        if (!snap.empty) doc = snap.docs[0];
      }
    }

    if (!doc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json(filterCourse({ courseId: doc.id, ...doc.data() }));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving course', error: error.message });
  }
};

/**
 * GET /api/courses/blockchain/next-id
 * Gợi ý blockchain course id tiếp theo (chưa tồn tại on-chain).
 */
const getNextBlockchainId = async (req, res) => {
  try {
    const nextId = await getNextAvailableBlockchainId();
    res.status(200).json({ blockchainCourseId: nextId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/courses
 * Tạo khoá học mới (Admin only).
 */
const createCourse = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        message: 'Request body is required (JSON). Send Content-Type: application/json',
      });
    }

    const {
      title, description, instructor, price, category, level, duration,
      blockchainCourseId: requestedChainId,
      imageUrl, videoUrl, videoProvider, videoCid, tags,
    } = req.body;

    const errors = validateCourse(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const priceEth = String(price);
    let blockchainCourseId = requestedChainId ? parseInt(requestedChainId, 10) : null;

    if (blockchainCourseId && await isBlockchainCourseRegistered(blockchainCourseId)) {
      return res.status(409).json({
        message: `Blockchain course ID ${blockchainCourseId} is already registered on-chain. Choose another ID.`,
      });
    }

    if (!blockchainCourseId) {
      blockchainCourseId = await getNextAvailableBlockchainId();
    } else {
      blockchainCourseId = await getNextAvailableBlockchainId(blockchainCourseId);
    }

    const docRef = db.collection('courses').doc();
    const courseId = docRef.id;

    const newCourse = {
      courseId,
      blockchainCourseId,
      title,
      description: description || '',
      instructor,
      price,
      priceEth,
      category,
      level: level || 'beginner',
      duration: duration || 0,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      videoProvider: videoProvider || 'youtube',
      videoCid: videoCid || '',
      lessonIds: [],
      averageRating: 0,
      reviewCount: 0,
      enrolledCount: 0,
      certificateRewardable: req.body.certificateRewardable || false,
      tags: tags || [],
      status: 'active',
      metadataCid: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user?.walletAddress || 'admin',
    };

    await docRef.set(newCourse);

    let metadataCid = '';
    let metadataUrl = '';
    try {
      const snapshot = {
        courseId,
        blockchainCourseId,
        title,
        instructor,
        price,
        priceEth,
        category,
        level: level || 'beginner',
        imageUrl: newCourse.imageUrl,
        videoUrl: newCourse.videoUrl,
        videoProvider: newCourse.videoProvider,
        videoCid: newCourse.videoCid,
        createdAt: newCourse.createdAt,
        createdBy: newCourse.createdBy,
      };
      const pinataResult = await uploadJSONToPinata(snapshot, `course_${courseId}`);
      metadataCid = pinataResult.cid;
      metadataUrl = pinataResult.url;
      await docRef.update({ metadataCid });
      newCourse.metadataCid = metadataCid;
    } catch (pinataErr) {
      console.warn('⚠️  Pinata upload failed (non-blocking):', pinataErr.message);
    }

    let contractTx = null;
    let onChainWarning = null;
    if (isContractReady() && blockchainCourseId && metadataCid) {
      try {
        const priceWei = ethers.parseEther(priceEth);
        const tx = await contract.createCourse(blockchainCourseId, metadataCid, priceWei);
        await tx.wait();
        contractTx = tx.hash;
        console.log(`✅ Course ${blockchainCourseId} registered on-chain: ${tx.hash}`);
      } catch (contractErr) {
        onChainWarning = contractErr.message;
        console.warn('⚠️  Contract createCourse failed:', contractErr.message);
      }
    } else if (isContractReady() && !metadataCid) {
      onChainWarning = 'Pinata metadata upload failed — course saved off-chain only';
    }

    res.status(201).json({
      message: 'Course created successfully',
      courseId,
      blockchainCourseId,
      metadataCid,
      metadataUrl,
      contractTx,
      onChainWarning,
      ...filterCourse(newCourse),
    });

  } catch (error) {
    console.error("=== createCourse ERROR ===", error);
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

/**
 * PUT /api/courses/:courseId
 * Cập nhật thông tin khoá học.
 */
const updateCourse = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        message: 'Request body is required (JSON). Send Content-Type: application/json',
      });
    }

    const { courseId } = req.params;
    const doc = await db.collection('courses').doc(courseId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.body.title || req.body.price !== undefined) {
      const errors = validateCourse({ title: req.body.title || doc.data().title, ...req.body });
      if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
      }
    }

    const { courseId: _, metadataCid: __, ...safeUpdate } = req.body;
    if (safeUpdate.price !== undefined) {
      safeUpdate.priceEth = String(safeUpdate.price);
    }

    const existing = doc.data();
    const chainId = safeUpdate.blockchainCourseId ?? existing.blockchainCourseId;

    if (
      safeUpdate.price !== undefined &&
      chainId &&
      (await isBlockchainCourseRegistered(chainId))
    ) {
      const onChainEth = await getOnChainPriceEth(chainId);
      if (onChainEth && onChainEth !== String(safeUpdate.price)) {
        return res.status(400).json({
          message: `Price on blockchain is ${onChainEth} ETH. Create a new course with a new Blockchain ID to change price on-chain.`,
          onChainPriceEth: onChainEth,
        });
      }
    }

    await db.collection('courses').doc(courseId).update({
      ...safeUpdate,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error("=== updateCourse ERROR ===", error);
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
};

/**
 * DELETE /api/courses/:courseId
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
 */
const searchCourses = async (req, res) => {
  try {
    const { query, category, level } = req.query;

    let queryRef = db.collection('courses').where('status', '==', 'active');
    if (category) queryRef = queryRef.where('category', '==', category);
    if (level) queryRef = queryRef.where('level', '==', level);

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

module.exports = {
  getAllCourses,
  getCourseById,
  getNextBlockchainId,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses,
};
