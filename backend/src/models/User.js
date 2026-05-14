/**
 * User Model
 * Cấu trúc dữ liệu cho một user trong hệ thống.
 *
 * Kiến trúc lưu trữ:
 *  - Firebase: lưu toàn bộ profile, avatarUrl (Cloudinary)
 *  - Cloudinary: lưu ảnh avatar (avatarUrl)
 *  - Smart Contract: nguồn truth cho enrollment và certificate
 *    (enrolledCourses ở đây là cache nhanh, truth thật nằm on-chain)
 *
 *  `walletAddress` là primary key — Ethereum address lowercase.
 *  `enrolledCourses` là denormalized cache; truth thật là contract.isEnrolled().
 */
const userSchema = {
  walletAddress: String,      // Địa chỉ ví Ethereum (primary key, lowercase)
  username: String,           // Tên hiển thị
  email: String,              // Email (tuỳ chọn)
  fullName: String,           // Họ tên đầy đủ
  avatarUrl: String,          // URL ảnh avatar từ Cloudinary
  bio: String,                // Giới thiệu bản thân
  enrolledCourses: Array,     // Cache IDs khoá học đang học (sync từ contract)
  completedCourses: Array,    // Cache IDs khoá học đã hoàn thành
  role: String,               // 'student' | 'instructor' | 'admin'
  totalSpent: Number,         // Tổng ETH đã chi (cache từ blockchain)
  joinedAt: Date,             // Ngày đăng ký tài khoản
  lastLogin: Date,            // Lần đăng nhập cuối
  isActive: Boolean,          // Trạng thái tài khoản
};

/**
 * Validate dữ liệu User trước khi ghi vào Firebase.
 * @param {object} data
 * @returns {string[]} Danh sách lỗi (rỗng = hợp lệ)
 */
const validateUser = (data) => {
  const errors = [];

  if (!data.walletAddress || typeof data.walletAddress !== 'string') {
    errors.push('Wallet address is required');
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(data.walletAddress)) {
    errors.push('Invalid wallet address format (must be 0x + 40 hex characters)');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.role && !['student', 'instructor', 'admin'].includes(data.role)) {
    errors.push('Role must be: student, instructor, or admin');
  }

  return errors;
};

module.exports = { userSchema, validateUser };
