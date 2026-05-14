const { db, admin }   = require('../config/firebase');
const { validateUser } = require('../models/User');
const { filterUser }   = require('../utils/responseFilter');

/**
 * GET /api/users/:walletAddress
 * Lấy thông tin user theo wallet address.
 */
const getUserByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const doc = await db.collection('users').doc(walletAddress.toLowerCase()).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(filterUser({ id: doc.id, ...doc.data() }));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user', error: error.message });
  }
};

/**
 * POST /api/users
 * Tạo user mới khi lần đầu kết nối ví.
 */
const createUser = async (req, res) => {
  try {
    const { walletAddress, username, email, fullName } = req.body;

    const errors = validateUser(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const existingUser = await db.collection('users').doc(walletAddress.toLowerCase()).get();
    if (existingUser.exists) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const newUser = {
      walletAddress:    walletAddress.toLowerCase(),
      username:         username || `user_${walletAddress.substring(2, 8)}`,
      email:            email || '',
      fullName:         fullName || '',
      avatarUrl:        req.body.avatarUrl || '',
      bio:              req.body.bio || '',
      enrolledCourses:  [],
      completedCourses: [],
      role:             req.body.role || 'student',
      totalSpent:       0,
      joinedAt:         new Date().toISOString(),
      lastLogin:        new Date().toISOString(),
      isActive:         true,
    };

    await db.collection('users').doc(walletAddress.toLowerCase()).set(newUser);
    res.status(201).json({ message: 'User created successfully', ...filterUser(newUser) });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

/**
 * PUT /api/users/:walletAddress
 * Cập nhật profile user.
 */
const updateUser = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const lowerAddress = walletAddress.toLowerCase();

    const userDoc = await db.collection('users').doc(lowerAddress).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Không cho phép update walletAddress, role, isActive qua endpoint này
    const { walletAddress: _, role: __, isActive: ___, ...updateData } = req.body;

    await db.collection('users').doc(lowerAddress).update(updateData);
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

/**
 * GET /api/users/:walletAddress/courses
 * Lấy danh sách khoá học đã mua của user.
 */
const getUserPurchasedCourses = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const lowerAddress = walletAddress.toLowerCase();

    const userDoc = await db.collection('users').doc(lowerAddress).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const enrolledCourseIds = userDoc.data().enrolledCourses || [];
    if (enrolledCourseIds.length === 0) {
      return res.status(200).json([]);
    }

    const courses = [];
    for (const courseId of enrolledCourseIds) {
      const courseDoc = await db.collection('courses').doc(courseId).get();
      if (courseDoc.exists) {
        courses.push({ id: courseDoc.id, ...courseDoc.data() });
      }
    }

    // Import filterCourse inline (tránh circular dependency)
    const { filterCourse, filterList } = require('../utils/responseFilter');
    res.status(200).json(filterList(courses, filterCourse));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving courses', error: error.message });
  }
};

/**
 * PATCH /api/users/:walletAddress/login
 * Cập nhật lastLogin — dùng khi user kết nối ví.
 */
const updateLastLogin = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    await db.collection('users').doc(walletAddress.toLowerCase()).set({
      lastLogin: new Date().toISOString(),
    }, { merge: true });

    res.status(200).json({ message: 'Last login updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating last login', error: error.message });
  }
};

module.exports = {
  getUserByWallet,
  createUser,
  updateUser,
  getUserPurchasedCourses,
  updateLastLogin,
};
