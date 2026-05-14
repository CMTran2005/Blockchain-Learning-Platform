/**
 * Enrollment Model
 * Cấu trúc dữ liệu cho một lần đăng ký / mua khóa học.
 *
 * Kiến trúc lưu trữ:
 *  - Smart Contract: nguồn truth — isEnrolled(), getProgress(), getCertificate()
 *  - Firebase: lưu enrollment record để query nhanh, lưu certificateCid
 *  - Pinata IPFS: lưu certificate metadata JSON (certificateCid)
 *
 *  Luồng tạo enrollment:
 *    1. User gửi ETH → Smart Contract (purchaseCourse)
 *    2. Backend verify tx_hash trên blockchain
 *    3. Ghi enrollment record vào Firebase
 *
 *  Luồng cấp certificate:
 *    1. Progress đạt 100% → upload cert JSON lên Pinata → nhận CID
 *    2. Gọi contract.issueCertificate(wallet, courseId, cid)
 *    3. Lưu certificateCid vào Firebase enrollment record
 */
const enrollmentSchema = {
  enrollmentId: String,       // ID duy nhất (vd: enr_<txHash[0:10]>_<timestamp>)
  userWallet: String,         // Địa chỉ ví người mua (lowercase)
  courseId: String,           // Firestore course document ID
  blockchainCourseId: Number, // ID khoá học trên Smart Contract
  transactionHash: String,    // Hash giao dịch mua hàng (đã verify on-chain)
  purchasePrice: Number,      // Giá khi mua (ETH, vd: 0.05)
  purchasedAt: Date,          // Thời điểm mua
  status: String,             // 'success' | 'pending' | 'failed'
  progress: Number,           // Tiến độ học (0–100%), sync với contract
  completedAt: Date,          // Thời điểm hoàn thành (null nếu chưa xong)
  certificateIssued: Boolean, // Đã cấp chứng chỉ on-chain?
  certificateCid: String,     // CID Pinata của certificate metadata JSON
  certificateTxHash: String,  // Hash giao dịch issueCertificate on-chain
};

/**
 * Validate dữ liệu Enrollment trước khi ghi vào Firebase.
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
