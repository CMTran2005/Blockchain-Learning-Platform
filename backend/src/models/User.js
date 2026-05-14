/**
 * User Model
 * Cấu trúc dữ liệu cho một user trong hệ thống.
 *
 * Lưu ý thiết kế:
 *  - `walletAddress` là primary key (Ethereum address, lowercase).
 *  - KHÔNG có `purchasedCourses` — thông tin mua hàng đã được lưu đầy đủ
 *    trong Enrollment collection (tránh trùng lặp & mất đồng bộ).
 *  - `enrolledCourses` dùng để hiển thị nhanh "Khóa học đang học" mà không cần
 *    query Enrollment mỗi lần (denormalization có chủ đích).
 *  - `completedCourses` — subset của enrolledCourses, tiện cho badge/progress.
 *  - `avatar` lưu CID của Pinata IPFS (hoặc URL đầy đủ). Dùng getIpfsUrl(cid)
 *    để chuyển thành URL hiển thị.
 */
const userSchema = {
  walletAddress: String,      // Địa chỉ ví Ethereum (primary key, lowercase)
  username: String,           // Tên hiển thị
  email: String,              // Email (tuỳ chọn)
  fullName: String,           // Họ tên đầy đủ
  avatar: String,             // CID Pinata IPFS hoặc URL ảnh avatar
  bio: String,                // Giới thiệu bản thân
  enrolledCourses: Array,     // IDs khóa học đã đăng ký / đang học
  completedCourses: Array,    // IDs khóa học đã hoàn thành
  bookmarkedCourses: Array,   // IDs khóa học đã bookmark
  role: String,               // 'student' | 'instructor' | 'admin'
  reputation: Number,         // Điểm uy tín tích luỹ
  totalSpent: Number,         // Tổng ETH đã chi (số thực, vd: 1.75)
  joinedAt: Date,             // Ngày đăng ký tài khoản
  lastLogin: Date,            // Lần đăng nhập cuối
  isActive: Boolean,          // Trạng thái tài khoản
};

/**
 * Validate dữ liệu User trước khi ghi vào Firestore.
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
