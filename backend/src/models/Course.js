/**
 * Course Model
 * Cấu trúc dữ liệu cho một khóa học.
 *
 * Kiến trúc lưu trữ:
 *  - Firebase: lưu toàn bộ metadata, imageUrl (Cloudinary), metadataCid (Pinata)
 *  - Cloudinary: lưu ảnh thumbnail/cover (imageUrl)
 *  - Pinata IPFS: lưu course snapshot JSON bất biến (metadataCid)
 *  - Smart Contract: đăng ký courseId + metadataCid + priceWei on-chain
 *
 *  `blockchainCourseId` phải là số nguyên dương, tương ứng với courseId trên contract.
 *  `metadataCid`  là CID Pinata của course snapshot JSON (ghi vào contract khi tạo khoá học).
 *  `imageUrl`     là URL Cloudinary của ảnh bìa khoá học.
 */
const courseSchema = {
  courseId: String,               // Firestore document ID (primary key)
  blockchainCourseId: Number,     // ID trên Smart Contract (số nguyên dương, dùng để verify)
  title: String,                  // Tên khóa học
  description: String,            // Mô tả chi tiết
  instructor: String,             // Tên hoặc wallet address giảng viên
  price: Number,                  // Giá ETH (số thực, vd: 0.05 | 0.5)
  category: String,               // Thể loại (blockchain, web3, solidity, defi...)
  level: String,                  // 'beginner' | 'intermediate' | 'advanced'
  duration: Number,               // Tổng thời gian học (giờ)
  imageUrl: String,               // URL ảnh bìa từ Cloudinary
  lessonIds: Array,               // Mảng ID lessons (denormalized để load nhanh)
  averageRating: Number,          // Đánh giá trung bình (0-5)
  reviewCount: Number,            // Tổng số review đã duyệt
  enrolledCount: Number,          // Số học viên đã đăng ký
  certificateRewardable: Boolean, // Có cấp chứng chỉ on-chain khi hoàn thành?
  tags: Array,                    // Từ khoá tìm kiếm
  status: String,                 // 'active' | 'inactive' | 'archived'
  metadataCid: String,            // CID Pinata của course snapshot JSON (ghi vào smart contract)
  createdAt: Date,                // Ngày tạo
  updatedAt: Date,                // Ngày cập nhật
  createdBy: String,              // Wallet admin tạo khoá học
};

/**
 * Validate dữ liệu Course trước khi ghi vào Firebase.
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
    (typeof data.blockchainCourseId !== 'number' || data.blockchainCourseId < 1)
  ) {
    errors.push('blockchainCourseId must be a positive integer');
  }

  return errors;
};

module.exports = { courseSchema, validateCourse };
