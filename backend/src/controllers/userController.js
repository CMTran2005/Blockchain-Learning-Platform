const { db, admin } = require('../config/firebase');
const { validateUser } = require('../models/User');

/**
 * Get user by wallet address
 */
const getUserByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const doc = await db.collection('users').doc(walletAddress.toLowerCase()).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });

  } catch (error) {
    res.status(500).json({ message: "Error retrieving user", error: error.message });
  }
};

/**
 * Create new user
 */
const createUser = async (req, res) => {
  try {
    const { walletAddress, username, email, fullName } = req.body;

    // Validate
    const errors = validateUser(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').doc(walletAddress.toLowerCase()).get();
    if (existingUser.exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const newUser = {
      walletAddress: walletAddress.toLowerCase(),
      username: username || `user_${walletAddress.substring(2, 8)}`,
      email: email || '',
      fullName: fullName || '',
      avatar: req.body.avatar || '',  // CID Pinata IPFS (dùng POST /api/upload/file)
      bio: req.body.bio || '',
      enrolledCourses: [],
      completedCourses: [],
      bookmarkedCourses: [],
      role: req.body.role || 'student',
      reputation: 0,
      joinedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true,
      totalSpent: 0,
    };

    await db.collection('users').doc(walletAddress.toLowerCase()).set(newUser);
    res.status(201).json({ message: "User created successfully", ...newUser });

  } catch (error) {
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

/**
 * Update user profile
 */
const updateUser = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const lowerAddress = walletAddress.toLowerCase();

    // Check if user exists
    const userDoc = await db.collection('users').doc(lowerAddress).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't allow updating wallet address
    const { walletAddress: _, ...updateData } = req.body;

    await db.collection('users').doc(lowerAddress).update(updateData);
    res.status(200).json({ message: "User updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

/**
 * Get user's purchased courses
 */
const getUserPurchasedCourses = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const lowerAddress = walletAddress.toLowerCase();

    const userDoc = await db.collection('users').doc(lowerAddress).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const purchasedCourseIds = userDoc.data().purchasedCourses || [];

    if (purchasedCourseIds.length === 0) {
      return res.status(200).json([]);
    }

    const courses = [];
    for (const courseId of purchasedCourseIds) {
      const courseDoc = await db.collection('courses').doc(courseId).get();
      if (courseDoc.exists) {
        courses.push({ id: courseDoc.id, ...courseDoc.data() });
      }
    }

    res.status(200).json(courses);

  } catch (error) {
    res.status(500).json({ message: "Error retrieving purchased courses", error: error.message });
  }
};

/**
 * Update last login time
 */
const updateLastLogin = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const lowerAddress = walletAddress.toLowerCase();

    await db.collection('users').doc(lowerAddress).update({
      lastLogin: new Date().toISOString()
    }, { merge: true });

    res.status(200).json({ message: "Last login updated" });

  } catch (error) {
    res.status(500).json({ message: "Error updating last login", error: error.message });
  }
};

module.exports = {
  getUserByWallet,
  createUser,
  updateUser,
  getUserPurchasedCourses,
  updateLastLogin
};
