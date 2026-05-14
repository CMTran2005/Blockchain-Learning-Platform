const express = require('express');
const router = express.Router();
const {
  verifyPurchase,
  getUserEnrollments,
  getEnrollmentById,
  updateEnrollmentProgress,
  submitReview
} = require('../controllers/enrollController');

/**
 * Enrollment Routes
 */

// Verify purchase and create enrollment
router.post('/verify', verifyPurchase);

// Get user enrollments
router.get('/user/:walletAddress', getUserEnrollments);

// Get enrollment by ID
router.get('/:enrollmentId', getEnrollmentById);

// Update enrollment progress
router.patch('/:enrollmentId/progress', updateEnrollmentProgress);

// Submit course review
router.post('/:enrollmentId/review', submitReview);

module.exports = router;