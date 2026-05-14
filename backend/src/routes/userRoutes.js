const express = require('express');
const router = express.Router();
const {
  getUserByWallet,
  createUser,
  updateUser,
  getUserPurchasedCourses,
  updateLastLogin
} = require('../controllers/userController');

/**
 * User Routes
 */

// Create new user
router.post('/', createUser);

// Get user by wallet address
router.get('/:walletAddress', getUserByWallet);

// Update user profile
router.put('/:walletAddress', updateUser);

// Get user's purchased courses
router.get('/:walletAddress/purchased-courses', getUserPurchasedCourses);

// Update last login time
router.patch('/:walletAddress/last-login', updateLastLogin);

module.exports = router;
