const express = require('express');
const router = express.Router();
const {
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  likeLesson,
  publishLesson
} = require('../controllers/lessonController');

/**
 * Lesson Routes
 */

// Get all lessons for a course
router.get('/course/:courseId', getLessonsByCourse);

// Get lesson by ID
router.get('/:lessonId', getLessonById);

// Create new lesson (Instructor only)
router.post('/', createLesson);

// Update lesson
router.put('/:lessonId', updateLesson);

// Delete lesson
router.delete('/:lessonId', deleteLesson);

// Like a lesson
router.post('/:lessonId/like', likeLesson);

// Publish lesson
router.patch('/:lessonId/publish', publishLesson);

module.exports = router;
