const { provider }               = require('../config/blockchain');
const { db, admin }              = require('../config/firebase');
const { validateEnrollment }     = require('../models/Enrollment');
const { uploadJSONToPinata }     = require('../config/pinata');
const { contract, isContractReady } = require('../config/contract');
const { filterEnrollment, filterList } = require('../utils/responseFilter');

/**
 * POST /api/enrollments/verify
 * Verify giao dịch mua khoá học on-chain và tạo enrollment record trong Firebase.
 *
 * Luồng:
 *  1. Kiểm tra tx_hash hợp lệ trên blockchain
 *  2. Xác minh sender khớp walletAddress
 *  3. Tạo enrollment record trong Firebase
 *  4. Cập nhật enrolledCourses trong user doc
 */
const verifyPurchase = async (req, res) => {
  const { tx_hash, walletAddress, courseId } = req.body;

  try {
    if (!tx_hash || !walletAddress || !courseId) {
      return res.status(400).json({ message: 'Missing required fields: tx_hash, walletAddress, courseId' });
    }

    // Verify transaction on-chain
    const receipt = await provider.getTransactionReceipt(tx_hash);
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ message: 'Transaction does not exist or failed on-chain' });
    }

    const tx = await provider.getTransaction(tx_hash);
    if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ message: 'Wallet address does not match transaction sender' });
    }

    const lowerAddress  = walletAddress.toLowerCase();
    const enrollmentId  = `enr_${tx_hash.substring(2, 12)}_${Date.now()}`;

    // Lấy thông tin khoá học
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const courseData    = courseDoc.data();
    const coursePrice   = courseData.price || 0;
    const blockchainCourseId = courseData.blockchainCourseId || null;

    // Tạo enrollment record trong Firebase
    const enrollmentData = {
      enrollmentId,
      userWallet:         lowerAddress,
      courseId,
      blockchainCourseId,
      transactionHash:    tx_hash,
      purchasePrice:      coursePrice,
      purchasedAt:        new Date().toISOString(),
      status:             'success',
      progress:           0,
      completedAt:        null,
      certificateIssued:  false,
      certificateCid:     null,
      certificateTxHash:  null,
    };

    await db.collection('enrollments').doc(enrollmentId).set(enrollmentData);

    // Cập nhật user doc
    await db.collection('users').doc(lowerAddress).set({
      enrolledCourses: admin.firestore.FieldValue.arrayUnion(courseId),
      totalSpent:      admin.firestore.FieldValue.increment(coursePrice),
    }, { merge: true });

    // Cập nhật enrolledCount trên course
    await db.collection('courses').doc(courseId).update({
      enrolledCount: admin.firestore.FieldValue.increment(1),
    });

    res.status(200).json({
      message:      'Purchase verified successfully. You are now enrolled.',
      enrollmentId,
    });

  } catch (error) {
    console.error('verifyPurchase error:', error);
    res.status(500).json({ message: 'System error during verification', error: error.message });
  }
};

/**
 * GET /api/enrollments/user/:walletAddress
 * Lấy danh sách enrollments của một user.
 */
const getUserEnrollments = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const lowerAddress = walletAddress.toLowerCase();

    const snapshot = await db.collection('enrollments')
      .where('userWallet', '==', lowerAddress)
      .get();

    const enrollments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(filterList(enrollments, filterEnrollment));

  } catch (error) {
    res.status(500).json({ message: 'Error retrieving enrollments', error: error.message });
  }
};

/**
 * GET /api/enrollments/:enrollmentId
 * Lấy thông tin một enrollment.
 */
const getEnrollmentById = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const doc = await db.collection('enrollments').doc(enrollmentId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.status(200).json(filterEnrollment({ id: doc.id, ...doc.data() }));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving enrollment', error: error.message });
  }
};

/**
 * PATCH /api/enrollments/:enrollmentId/progress
 * Cập nhật tiến độ học.
 *
 * Khi progress = 100:
 *  1. Upload certificate metadata lên Pinata → nhận certificateCid
 *  2. Gọi contract.issueCertificate() on-chain
 *  3. Cập nhật Firebase enrollment record
 */
const updateEnrollmentProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { progress } = req.body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ message: 'Progress must be a number between 0 and 100' });
    }

    // Lấy enrollment hiện tại
    const enrollDoc = await db.collection('enrollments').doc(enrollmentId).get();
    if (!enrollDoc.exists) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    const enrollment = enrollDoc.data();
    const updateData = { progress };

    if (progress === 100 && !enrollment.completedAt) {
      updateData.completedAt = new Date().toISOString();

      // --- Phát hành Certificate ---
      let certificateCid      = null;
      let certificateTxHash   = null;
      let certificateIssued   = false;

      // Bước 1: Lấy thông tin khoá học để tạo cert metadata
      const courseDoc = await db.collection('courses').doc(enrollment.courseId).get();
      const courseData = courseDoc.exists ? courseDoc.data() : {};

      // Bước 2: Upload certificate JSON lên Pinata
      try {
        const certMetadata = {
          type:              'BlockchainLearning Certificate',
          recipient:         enrollment.userWallet,
          courseId:          enrollment.courseId,
          blockchainCourseId: enrollment.blockchainCourseId,
          courseName:        courseData.title || '',
          instructor:        courseData.instructor || '',
          completedAt:       updateData.completedAt,
          enrollmentId,
          transactionHash:   enrollment.transactionHash,
        };

        const pinataResult = await uploadJSONToPinata(
          certMetadata,
          `certificate_${enrollment.userWallet}_${enrollment.courseId}`
        );
        certificateCid = pinataResult.cid;
        console.log(`✅ Certificate metadata uploaded to Pinata: ${certificateCid}`);
      } catch (pinataErr) {
        console.warn('⚠️  Certificate Pinata upload failed:', pinataErr.message);
      }

      // Bước 3: Gọi contract.issueCertificate() nếu sẵn sàng
      if (
        isContractReady() &&
        certificateCid &&
        enrollment.blockchainCourseId &&
        courseData.certificateRewardable
      ) {
        try {
          const tx = await contract.issueCertificate(
            enrollment.userWallet,
            enrollment.blockchainCourseId,
            certificateCid
          );
          await tx.wait();
          certificateTxHash = tx.hash;
          certificateIssued = true;
          console.log(`✅ Certificate issued on-chain: ${tx.hash}`);
        } catch (contractErr) {
          console.warn('⚠️  contract.issueCertificate failed:', contractErr.message);
        }
      }

      updateData.certificateIssued  = certificateIssued;
      updateData.certificateCid     = certificateCid;
      updateData.certificateTxHash  = certificateTxHash;

      // Cập nhật completedCourses trên user doc
      await db.collection('users').doc(enrollment.userWallet).set({
        completedCourses: admin.firestore.FieldValue.arrayUnion(enrollment.courseId),
      }, { merge: true });
    }

    await db.collection('enrollments').doc(enrollmentId).update(updateData);

    res.status(200).json({
      message:          'Progress updated successfully',
      progress,
      certificateIssued: updateData.certificateIssued || false,
      certificateCid:   updateData.certificateCid    || null,
    });

  } catch (error) {
    console.error('updateEnrollmentProgress error:', error);
    res.status(500).json({ message: 'Error updating progress', error: error.message });
  }
};

module.exports = {
  verifyPurchase,
  getUserEnrollments,
  getEnrollmentById,
  updateEnrollmentProgress,
};