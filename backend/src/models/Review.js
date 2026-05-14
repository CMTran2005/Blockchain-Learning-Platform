/**
 * Review Model
 * Cấu trúc dữ liệu cho một đánh giá khóa học.
 *
 * Lưu ý thiết kế:
 *  - `verified` = true nếu user có enrollmentId hợp lệ (đã mua thực sự).
 *  - `status` mặc định là 'pending' — admin/instructor phải approve trước khi hiển thị.
 *  - `blockchainCourseId` đã bị loại bỏ — không cần thiết vì có thể lấy từ
 *    courses collection qua courseId khi cần.
 *  - `replies` — array các phản hồi từ instructor/admin:
 *      [{ replyId, repliedBy, role, content, createdAt }]
 */
const reviewSchema = {
  reviewId: String,               // ID duy nhất (tạo trong controller)
  courseId: String,               // Tham chiếu tới courses collection
  userWallet: String,             // Địa chỉ ví người viết review (lowercase)
  enrollmentId: String,           // Tham chiếu enrollment (dùng để xác minh đã mua)
  rating: Number,                 // Số sao (1-5)
  title: String,                  // Tiêu đề review (tuỳ chọn)
  content: String,                // Nội dung review (10-5000 ký tự)
  verified: Boolean,              // Đã xác minh mua hàng (= !!enrollmentId)
  helpful: Number,                // Số vote "hữu ích"
  unhelpful: Number,              // Số vote "không hữu ích"
  replies: Array,                 // Phản hồi từ instructor/admin
  status: String,                 // 'pending' | 'approved' | 'rejected' | 'flagged'
  flagged: Boolean,               // Đã bị gắn cờ spam/nội dung không phù hợp?
  flagReason: String,             // Lý do: 'spam' | 'inappropriate' | 'misleading' | 'offensive'
  createdAt: Date,                // Ngày tạo
  updatedAt: Date,                // Ngày cập nhật
  approvedAt: Date,               // Ngày được phê duyệt (nullable)
  approvedBy: String,             // Wallet admin/instructor đã duyệt (nullable)
};

/**
 * Validate dữ liệu Review trước khi ghi vào Firestore.
 * @param {object} data
 * @returns {string[]} Danh sách lỗi (rỗng = hợp lệ)
 */
const validateReview = (data) => {
  const errors = [];

  if (!data.courseId || typeof data.courseId !== 'string') {
    errors.push('Course ID is required');
  }

  if (!data.userWallet || typeof data.userWallet !== 'string') {
    errors.push('User wallet is required');
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(data.userWallet)) {
    errors.push('Invalid wallet address format');
  }

  if (!data.rating || typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
    errors.push('Rating must be a number between 1 and 5');
  }

  if (!data.content || typeof data.content !== 'string' || data.content.trim().length < 10) {
    errors.push('Review content must be at least 10 characters');
  }

  if (data.content && data.content.length > 5000) {
    errors.push('Review content must not exceed 5000 characters');
  }

  if (data.status && !['pending', 'approved', 'rejected', 'flagged'].includes(data.status)) {
    errors.push('Status must be: pending, approved, rejected, or flagged');
  }

  return errors;
};

module.exports = { reviewSchema, validateReview };
