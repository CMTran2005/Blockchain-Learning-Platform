/**
 * Enrollment Model
 * Cấu trúc dữ liệu cho một lần đăng ký / mua khóa học.
 *
 * Lưu ý thiết kế:
 *  - Mỗi enrollment được tạo SAU KHI giao dịch blockchain thành công
 *    (verifyPurchase kiểm tra transactionHash trên Ganache).
 *  - `rating` và `review` lưu tại đây để quick-access (không cần join Review).
 *    Review đầy đủ (với helpful votes, replies...) nằm trong reviews collection.
 *  - `certificateHash` là hash chứng chỉ on-chain khi progress = 100%.
 */
const enrollmentSchema = {
  enrollmentId: String,       // ID duy nhất (vd: enr_<txHash[0:10]>_<timestamp>)
  userWallet: String,         // Địa chỉ ví người mua (lowercase)
  courseId: String,           // ID khóa học trong Firestore
  transactionHash: String,    // Hash giao dịch blockchain (đã verify)
  purchasePrice: Number,      // Giá khi mua (ETH số thực, vd: 0.5)
  purchasedAt: Date,          // Thời điểm mua
  status: String,             // 'success' | 'pending' | 'failed'
  progress: Number,           // Tiến độ học (0-100%)
  startedAt: Date,            // Lần đầu vào học
  completedAt: Date,          // Thời điểm hoàn thành (null nếu chưa xong)
  certificateIssued: Boolean, // Đã cấp chứng chỉ?
  certificateHash: String,    // Hash chứng chỉ on-chain (nullable)
  rating: Number,             // Sao đánh giá nhanh (1-5, nullable)
  review: String,             // Bình luận ngắn (nullable)
};

/**
 * Validate dữ liệu Enrollment trước khi ghi vào Firestore.
 * @param {object} data
 * @returns {string[]} Danh sách lỗi (rỗng = hợp lệ)
 */
const validateEnrollment = (data) => {
  const errors = [];

  if (!data.userWallet || typeof data.userWallet !== 'string') {
    errors.push('User wallet is required');
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(data.userWallet)) {
    errors.push('Invalid wallet address format');
  }

  if (!data.courseId || typeof data.courseId !== 'string') {
    errors.push('Course ID is required');
  }

  if (!data.transactionHash || typeof data.transactionHash !== 'string') {
    errors.push('Transaction hash is required');
  }

  if (typeof data.purchasePrice !== 'number' || data.purchasePrice < 0) {
    errors.push('Purchase price must be a non-negative number (ETH)');
  }

  if (data.status && !['success', 'pending', 'failed'].includes(data.status)) {
    errors.push('Status must be: success, pending, or failed');
  }

  return errors;
};

module.exports = { enrollmentSchema, validateEnrollment };
