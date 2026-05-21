const express = require('express');
const router = express.Router();
const adminAuth = require('../middlewares/adminAuth');
const {
  getAllCourses,
  getCourseById,
  getNextBlockchainId,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses
} = require('../controllers/courseController');

/**
 * Course Routes
 * GET routes are public, write routes require admin auth.
 */

// Public — Get all courses
router.get('/', getAllCourses);

// Public — Search courses
router.get('/search', searchCourses);

// Public — Next available blockchain course id
router.get('/blockchain/next-id', getNextBlockchainId);

// Public — Get course by ID
router.get('/:courseId', getCourseById);

// Admin — Create new course
router.post('/', adminAuth, createCourse);

// Admin — Update course
router.put('/:courseId', adminAuth, updateCourse);

// Admin — Delete course
router.delete('/:courseId', adminAuth, deleteCourse);

module.exports = router;
