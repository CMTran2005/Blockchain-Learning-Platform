const { db, admin }        = require('../config/firebase');
const { validateReview }   = require('../models/Review');
const { filterReview, filterList } = require('../utils/responseFilter');

/**
 * GET /api/reviews/course/:courseId
 * Lấy reviews của một khoá học (chỉ trả về approved).
 */
const getReviewsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const snapshot = await db.collection('reviews')
      .where('courseId', '==', courseId)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit) + parseInt(offset))
      .get();

    const reviews = snapshot.docs
      .slice(parseInt(offset))
      .map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(filterList(reviews, filterReview));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving reviews', error: error.message });
  }
};

/**
 * GET /api/reviews/:reviewId
 * Lấy chi tiết một review.
 */
const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const doc = await db.collection('reviews').doc(reviewId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json(filterReview({ id: doc.id, ...doc.data() }));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving review', error: error.message });
  }
};

/**
 * POST /api/reviews
 * Tạo review mới (phải có enrollment hợp lệ).
 */
const createReview = async (req, res) => {
  try {
    const { courseId, userWallet, rating, content, enrollmentId } = req.body;

    const errors = validateReview(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Kiểm tra đã review chưa
    const existingReview = await db.collection('reviews')
      .where('courseId', '==', courseId)
      .where('userWallet', '==', userWallet.toLowerCase())
      .get();

    if (!existingReview.empty) {
      return res.status(409).json({ message: 'You have already reviewed this course' });
    }

    // Xác minh enrollment (đã mua thật)
    let verified = false;
    if (enrollmentId) {
      const enrollDoc = await db.collection('enrollments').doc(enrollmentId).get();
      verified = enrollDoc.exists && enrollDoc.data().userWallet === userWallet.toLowerCase();
    }

    const reviewId = `review_${courseId}_${userWallet.substring(2, 10)}_${Date.now()}`;

    const newReview = {
      reviewId,
      courseId,
      userWallet:  userWallet.toLowerCase(),
      enrollmentId: enrollmentId || null,
      rating,
      title:       req.body.title || '',
      content,
      verified,
      helpful:     0,
      status:      'pending',
      flagged:     false,
      flagReason:  null,
      replies:     [],
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      approvedAt:  null,
      approvedBy:  null,
    };

    await db.collection('reviews').doc(reviewId).set(newReview);

    res.status(201).json({
      message: 'Review submitted successfully (pending approval)',
      ...filterReview(newReview),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating review', error: error.message });
  }
};

/**
 * PUT /api/reviews/:reviewId
 * Chỉnh sửa review (chỉ tác giả).
 */
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userWallet } = req.body;

    const doc = await db.collection('reviews').doc(reviewId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (doc.data().userWallet !== userWallet.toLowerCase()) {
      return res.status(403).json({ message: 'You can only edit your own review' });
    }

    await db.collection('reviews').doc(reviewId).update({
      ...req.body,
      updatedAt: new Date().toISOString(),
      status:    'pending', // Reset to pending khi chỉnh sửa
    });

    res.status(200).json({ message: 'Review updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating review', error: error.message });
  }
};

/**
 * DELETE /api/reviews/:reviewId
 * Xoá review (chỉ tác giả).
 */
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userWallet } = req.body;

    const doc = await db.collection('reviews').doc(reviewId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (doc.data().userWallet !== userWallet.toLowerCase()) {
      return res.status(403).json({ message: 'You can only delete your own review' });
    }

    await db.collection('reviews').doc(reviewId).delete();
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
};

/**
 * PATCH /api/reviews/:reviewId/approve
 * Duyệt review (Admin only).
 */
const approveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { approvedBy } = req.body;

    await db.collection('reviews').doc(reviewId).update({
      status:     'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: approvedBy,
    });

    res.status(200).json({ message: 'Review approved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error approving review', error: error.message });
  }
};

/**
 * PATCH /api/reviews/:reviewId/helpful
 * Vote review là hữu ích.
 */
const markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    await db.collection('reviews').doc(reviewId).update({
      helpful: admin.firestore.FieldValue.increment(1),
    });

    res.status(200).json({ message: 'Review marked as helpful' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking review', error: error.message });
  }
};

/**
 * PATCH /api/reviews/:reviewId/flag
 * Gắn cờ review (Admin only).
 */
const flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    await db.collection('reviews').doc(reviewId).update({
      flagged:    true,
      flagReason: reason,
      status:     'flagged',
    });

    res.status(200).json({ message: 'Review flagged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error flagging review', error: error.message });
  }
};

/**
 * POST /api/reviews/:reviewId/reply
 * Phản hồi review (Instructor/Admin).
 */
const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { repliedBy, role, content } = req.body;

    const reply = {
      replyId:   `reply_${Date.now()}`,
      repliedBy,
      role,
      content,
      createdAt: new Date().toISOString(),
    };

    await db.collection('reviews').doc(reviewId).update({
      replies: admin.firestore.FieldValue.arrayUnion(reply),
    });

    res.status(200).json({ message: 'Reply added successfully', reply });
  } catch (error) {
    res.status(500).json({ message: 'Error replying to review', error: error.message });
  }
};

/**
 * GET /api/reviews/course/:courseId/stats
 * Thống kê đánh giá của khoá học.
 */
const getCourseReviewStats = async (req, res) => {
  try {
    const { courseId } = req.params;

    const snapshot = await db.collection('reviews')
      .where('courseId', '==', courseId)
      .where('status', '==', 'approved')
      .get();

    const reviews = snapshot.docs.map(doc => doc.data());

    const stats = {
      totalReviews:   reviews.length,
      averageRating:  reviews.length > 0
        ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      },
      verifiedReviews: reviews.filter(r => r.verified).length,
      totalHelpful:    reviews.reduce((sum, r) => sum + (r.helpful || 0), 0),
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving stats', error: error.message });
  }
};

module.exports = {
  getReviewsByCourse,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  markHelpful,
  flagReview,
  replyToReview,
  getCourseReviewStats,
};
