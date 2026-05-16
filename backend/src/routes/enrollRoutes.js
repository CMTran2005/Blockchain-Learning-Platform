const express = require('express');
const router  = express.Router();
const {
  verifyPurchase,
  getUserEnrollments,
  getEnrollmentById,
  updateEnrollmentProgress,
} = require('../controllers/enrollController');

// Verify purchase and create enrollment
router.post('/verify', verifyPurchase);

// Get user enrollments
router.get('/user/:walletAddress', getUserEnrollments);

// Get enrollment by ID
router.get('/:enrollmentId', getEnrollmentById);

// Update enrollment progress (triggers certificate issuance at 100%)
router.patch('/:enrollmentId/progress', updateEnrollmentProgress);

module.exports = router;