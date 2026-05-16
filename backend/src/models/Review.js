/**
 * Review Model
 * Cấu trúc dữ liệu cho một đánh giá khóa học.
 *
 * Kiến trúc lưu trữ:
 *  - Firebase: lưu toàn bộ review data
 *  - Smart Contract: verified = true nếu contract.isEnrolled() trả về true
 *
 *  `verified` được set dựa trên việc kiểm tra enrollment on-chain.
 *  `status` mặc định 'pending' — admin phải approve trước khi hiển thị.
 */
const reviewSchema = {
  reviewId: String,               // ID duy nhất (vd: review_<courseId>_<wallet[0:8]>_<ts>)
  courseId: String,               // Tham chiếu tới courses collection
  userWallet: String,             // Địa chỉ ví người viết review (lowercase)
  enrollmentId: String,           // Tham chiếu enrollment (để xác minh đã mua)
  rating: Number,                 // Số sao (1–5)
  title: String,                  // Tiêu đề review (tuỳ chọn)
  content: String,                // Nội dung review (10–2000 ký tự)
  verified: Boolean,              // Đã xác minh mua hàng on-chain?
  helpful: Number,                // Số vote "hữu ích"
  status: String,                 // 'pending' | 'approved' | 'rejected' | 'flagged'
  flagged: Boolean,               // Đã bị gắn cờ spam?
  flagReason: String,             // Lý do gắn cờ (nullable)
  replies: Array,                 // Phản hồi từ instructor/admin
  // [{ replyId, repliedBy, role, content, createdAt }]
  createdAt: Date,                // Ngày tạo
  updatedAt: Date,                // Ngày cập nhật
  approvedAt: Date,               // Ngày được phê duyệt (nullable)
  approvedBy: String,             // Wallet admin đã duyệt (nullable)
};

/**
 * Validate dữ liệu Review trước khi ghi vào Firebase.
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

  if (data.content && data.content.length > 2000) {
    errors.push('Review content must not exceed 2000 characters');
  }

  if (data.status && !['pending', 'approved', 'rejected', 'flagged'].includes(data.status)) {
    errors.push('Status must be: pending, approved, rejected, or flagged');
  }

  return errors;
};

module.exports = { reviewSchema, validateReview };
