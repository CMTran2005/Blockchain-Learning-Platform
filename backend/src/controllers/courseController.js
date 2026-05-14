const { db, admin } = require('../config/firebase');
const { validateCourse } = require('../models/Course');
const { getIpfsUrl } = require('../config/pinata');

/**
 * Get all courses
 */
const getAllCourses = async (req, res) => {
  try {
    const { category, level, status } = req.query;

    let queryRef = db.collection('courses');

    // Filter theo status (mặc định lấy active)
    queryRef = queryRef.where('status', '==', status || 'active');
    if (category) queryRef = queryRef.where('category', '==', category);
    if (level)    queryRef = queryRef.where('level', '==', level);

    const snapshot = await queryRef.get();
    const courses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        courseId: doc.id,
        ...data,
        // Chuyển CID thành URL đầy đủ cho frontend
        imageUrl: getIpfsUrl(data.imageCid),
      };
    });

    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Unable to retrieve course data!', error: error.message });
  }
};

/**
 * Get course by ID
 */
const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const doc = await db.collection('courses').doc(courseId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ 
      courseId: doc.id, 
      ...doc.data() 
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving course", error: error.message });
  }
};

/**
 * Create new course (Admin only)
 */
const createCourse = async (req, res) => {
  try {
    const { title, description, instructor, price, category, level, duration } = req.body;

    // Validate
    const errors = validateCourse(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const docRef = db.collection('courses').doc();
    const courseId = docRef.id;

    const newCourse = {
      courseId,
      title,
      description: description || '',
      instructor,
      price,
      category,
      level: level || 'beginner',
      duration: duration || 0,
      // imageCid: CID từ Pinata sau khi upload ảnh bìa (dùng POST /api/upload/file trước)
      imageCid: req.body.imageCid || '',
      videoUrl: req.body.videoUrl || '',
      content: req.body.content || '',
      lessonIds: [],
      averageRating: 0,
      reviewCount: 0,
      enrolledCount: 0,
      certificateRewardable: req.body.certificateRewardable || false,
      prerequisites: req.body.prerequisites || [],
      tags: req.body.tags || [],
      status: 'active',
      blockchainCourseId: req.body.blockchainCourseId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user?.walletAddress || 'admin',
    };

    await docRef.set(newCourse);
    res.status(201).json({
      message: 'Course created successfully',
      courseId,
      imageUrl: getIpfsUrl(newCourse.imageCid),
      ...newCourse,
    });

  } catch (error) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

/**
 * Update course
 */
const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // Validate if price or title is being updated
    if (req.body.title || req.body.price) {
      const errors = validateCourse({ title: req.body.title, ...req.body });
      if (errors.length > 0) {
        return res.status(400).json({ message: "Validation failed", errors });
      }
    }

    await db.collection('courses').doc(courseId).update(updateData);
    res.status(200).json({ message: "Course updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error updating course", error: error.message });
  }
};

/**
 * Delete course
 */
const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const doc = await db.collection('courses').doc(courseId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Course not found" });
    }

    await db.collection('courses').doc(courseId).delete();
    res.status(200).json({ message: "Course deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting course", error: error.message });
  }
};

/**
 * Search courses
 */
const searchCourses = async (req, res) => {
  try {
    const { query, category, level } = req.query;

    let queryRef = db.collection('courses').where('status', '==', 'active');

    if (category) {
      queryRef = queryRef.where('category', '==', category);
    }

    if (level) {
      queryRef = queryRef.where('level', '==', level);
    }

    const snapshot = await queryRef.get();
    let courses = snapshot.docs.map(doc => ({ 
      courseId: doc.id, 
      ...doc.data() 
    }));

    // Filter by search query (title or description)
    if (query) {
      const lowerQuery = query.toLowerCase();
      courses = courses.filter(course =>
        course.title?.toLowerCase().includes(lowerQuery) ||
        course.description?.toLowerCase().includes(lowerQuery)
      );
    }

    res.status(200).json(courses);

  } catch (error) {
    res.status(500).json({ message: "Error searching courses", error: error.message });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses
};