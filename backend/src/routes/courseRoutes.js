const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses
} = require('../controllers/courseController');

/**
 * Course Routes
 */

// Get all courses
router.get('/', getAllCourses);

// Search courses
router.get('/search', searchCourses);

// Get course by ID
router.get('/:courseId', getCourseById);

// Create new course (POST must be after specific GET routes)
router.post('/', createCourse);

// Update course
router.put('/:courseId', updateCourse);

// Delete course
router.delete('/:courseId', deleteCourse);

module.exports = router;
