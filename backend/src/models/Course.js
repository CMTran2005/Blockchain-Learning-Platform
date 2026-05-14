/**
 * Course Model
 * Cấu trúc dữ liệu cho một khóa học.
 *
 * Lưu ý thiết kế:
 *  - `blockchainCourseId` là ID tương ứng trên Smart Contract (Ganache).
 *    Đây là trường quan trọng để verify giao dịch mua hàng.
 *  - `imageCid` lưu CID Pinata IPFS của ảnh thumbnail/cover.
 *    Dùng getIpfsUrl(imageCid) để chuyển thành URL hiển thị.
 *  - `videoUrl` là URL video giới thiệu (có thể là YouTube hoặc IPFS gateway URL).
 *  - `averageRating` được tính lại mỗi khi có review mới được duyệt.
 *  - `lessonIds` lưu mảng ID các lesson (denormalized để load nhanh).
 */
const courseSchema = {
  courseId: String,               // Firestore document ID (primary key)
  blockchainCourseId: Number,     // ID trên Smart Contract — dùng để verify mua hàng
  title: String,                  // Tên khóa học
  description: String,            // Mô tả chi tiết
  instructor: String,             // Tên / wallet giảng viên
  price: Number,                  // Giá ETH (số thực, vd: 0.5 | 1.25)
  category: String,               // Thể loại (blockchain, web3, solidity...)
  level: String,                  // 'beginner' | 'intermediate' | 'advanced'
  duration: Number,               // Tổng thời gian học (giờ)
  imageCid: String,               // CID Pinata IPFS ảnh bìa — dùng getIpfsUrl()
  videoUrl: String,               // URL video giới thiệu (YouTube hoặc IPFS gateway)
  content: String,                // Mô tả ngắn / nội dung giới thiệu
  lessonIds: Array,               // Mảng ID lessons (tham chiếu tới lessons collection)
  averageRating: Number,          // Đánh giá trung bình (0-5), tính từ reviews
  reviewCount: Number,            // Tổng số review đã được duyệt
  enrolledCount: Number,          // Số học viên đã đăng ký
  certificateRewardable: Boolean, // Có cấp chứng chỉ khi hoàn thành?
  prerequisites: Array,           // IDs khóa học cần hoàn thành trước
  tags: Array,                    // Từ khoá tìm kiếm
  status: String,                 // 'active' | 'inactive' | 'archived'
  createdAt: Date,                // Ngày tạo
  updatedAt: Date,                // Ngày cập nhật
  createdBy: String,              // Wallet admin tạo khoá học
};

/**
 * Validate dữ liệu Course trước khi ghi vào Firestore.
 * @param {object} data
 * @returns {string[]} Danh sách lỗi (rỗng = hợp lệ)
 */
const validateCourse = (data) => {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('Title is required and must be a non-empty string');
  }

  if (!data.instructor || typeof data.instructor !== 'string') {
    errors.push('Instructor is required');
  }

  if (typeof data.price !== 'number' || data.price < 0) {
    errors.push('Price must be a non-negative number (ETH)');
  }

  if (!data.category || typeof data.category !== 'string') {
    errors.push('Category is required');
  }

  if (data.level && !['beginner', 'intermediate', 'advanced'].includes(data.level)) {
    errors.push('Level must be: beginner, intermediate, or advanced');
  }

  if (
    data.blockchainCourseId !== undefined &&
    data.blockchainCourseId !== null &&
    (typeof data.blockchainCourseId !== 'number' || data.blockchainCourseId < 0)
  ) {
    errors.push('blockchainCourseId must be a non-negative number');
  }

  return errors;
};

module.exports = { courseSchema, validateCourse };
