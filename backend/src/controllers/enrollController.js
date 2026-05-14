const { provider } = require('../config/blockchain');
const { db, admin } = require('../config/firebase');
const { validateEnrollment } = require('../models/Enrollment');

/**
 * Verify purchase and create enrollment
 */
const verifyPurchase = async (req, res) => {
  const { tx_hash, walletAddress, courseId } = req.body;

  try {
    // Validate input
    if (!tx_hash || !walletAddress || !courseId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const receipt = await provider.getTransactionReceipt(tx_hash);
    
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ message: "The transaction did not exist or failed!" });
    }

    const tx = await provider.getTransaction(tx_hash);
    if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ message: "The wallet address does not match the sender!" });
    }

    const lowerAddress = walletAddress.toLowerCase();
    const enrollmentId = `enr_${tx_hash.substring(0, 10)}_${Date.now()}`;
    
    // Get course info for enrollment
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ message: "Course not found" });
    }

    const coursePrice = courseDoc.data().price || 0;

    // Create enrollment
    await db.collection('enrollments').doc(enrollmentId).set({
      enrollmentId: enrollmentId,
      userWallet: lowerAddress,
      courseId: courseId,
      transactionHash: tx_hash,
      purchasePrice: coursePrice,
      purchasedAt: new Date().toISOString(),
      status: 'success',
      progress: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      certificateIssued: false,
      certificateHash: null,
      rating: null,
      review: null
    });

    // Update user's purchased courses
    const userRef = db.collection('users').doc(lowerAddress);
    await userRef.update({
      purchasedCourses: admin.firestore.FieldValue.arrayUnion(courseId),
      totalSpent: admin.firestore.FieldValue.increment(coursePrice)
    }, { merge: true });

    // Update course enrollment count
    await db.collection('courses').doc(courseId).update({
      enrolledCount: admin.firestore.FieldValue.increment(1)
    });

    res.status(200).json({ 
      message: "Verification successful! You now own the course.",
      enrollmentId: enrollmentId
    });

  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "System error", error: error.message });
  }
};

/**
 * Get user enrollments
 */
const getUserEnrollments = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const lowerAddress = walletAddress.toLowerCase();

    const snapshot = await db.collection('enrollments')
      .where('userWallet', '==', lowerAddress)
      .get();

    const enrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(enrollments);

  } catch (error) {
    res.status(500).json({ message: "Error retrieving enrollments", error: error.message });
  }
};

/**
 * Get enrollment by ID
 */
const getEnrollmentById = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const doc = await db.collection('enrollments').doc(enrollmentId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });

  } catch (error) {
    res.status(500).json({ message: "Error retrieving enrollment", error: error.message });
  }
};

/**
 * Update enrollment progress
 */
const updateEnrollmentProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { progress, completedAt } = req.body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ message: "Progress must be a number between 0 and 100" });
    }

    const updateData = { progress };
    if (progress === 100 && !completedAt) {
      updateData.completedAt = new Date().toISOString();
    }

    await db.collection('enrollments').doc(enrollmentId).update(updateData);
    res.status(200).json({ message: "Enrollment progress updated" });

  } catch (error) {
    res.status(500).json({ message: "Error updating enrollment", error: error.message });
  }
};

/**
 * Submit course review
 */
const submitReview = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    await db.collection('enrollments').doc(enrollmentId).update({
      rating,
      review: review || ''
    });

    res.status(200).json({ message: "Review submitted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error submitting review", error: error.message });
  }
};

module.exports = { 
  verifyPurchase,
  getUserEnrollments,
  getEnrollmentById,
  updateEnrollmentProgress,
  submitReview
};