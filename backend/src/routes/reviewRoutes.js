const express = require('express');
const router = express.Router();
const {
  getReviewsByCourse,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  markHelpful,
  flagReview,
  replyToReview,
  getCourseReviewStats
} = require('../controllers/reviewController');

/**
 * Review Routes
 */

// Get reviews stats for a course
router.get('/stats/:courseId', getCourseReviewStats);

// Get all reviews for a course
router.get('/course/:courseId', getReviewsByCourse);

// Get review by ID
router.get('/:reviewId', getReviewById);

// Create new review
router.post('/', createReview);

// Update review
router.put('/:reviewId', updateReview);

// Delete review
router.delete('/:reviewId', deleteReview);

// Approve review (Admin/Instructor)
router.patch('/:reviewId/approve', approveReview);

// Mark review as helpful
router.post('/:reviewId/helpful', markHelpful);

// Flag review as inappropriate
router.post('/:reviewId/flag', flagReview);

// Reply to review
router.post('/:reviewId/reply', replyToReview);

module.exports = router;
