/**
 * Lesson Model
 * Cấu trúc dữ liệu cho một bài giảng trong khóa học.
 *
 * Lưu ý thiết kế:
 *  - `videoUrl` có thể là:
 *      - URL YouTube/Vimeo (videoProvider: 'youtube' | 'vimeo')
 *      - IPFS gateway URL từ Pinata (videoProvider: 'pinata')
 *  - `thumbnailCid` lưu CID Pinata nếu thumbnail upload lên IPFS.
 *  - `attachments` gộp cả resources (link) và file đính kèm (CID Pinata):
 *      [{ name, url, type }]  — url có thể là HTTP hoặc IPFS gateway
 *  - `isLocked` — bài bị khoá cho đến khi user hoàn thành `prerequisiteLesson`.
 */
const lessonSchema = {
  lessonId: String,               // ID duy nhất (tạo trong controller)
  courseId: String,               // Tham chiếu tới courses collection
  blockchainCourseId: Number,     // ID trên Smart Contract (để verify quyền xem)
  title: String,                  // Tên bài giảng
  description: String,            // Mô tả ngắn
  order: Number,                  // Thứ tự bài trong khóa học (1, 2, 3...)
  duration: Number,               // Thời lượng (phút)
  videoUrl: String,               // URL video (YouTube, Vimeo hoặc IPFS gateway)
  videoProvider: String,          // 'youtube' | 'vimeo' | 'pinata' | 'other'
  thumbnailCid: String,           // CID Pinata ảnh thumbnail (dùng getIpfsUrl())
  content: String,                // Nội dung bài học (HTML / Markdown)
  transcript: String,             // Phiên âm / subtitle video
  attachments: Array,             // Tài liệu đính kèm (PDF, ZIP, link...)
  // Ví dụ: [{ name: "Slides.pdf", url: "https://...", type: "pdf" }]
  quiz: Object,                   // Quiz cuối bài (tuỳ chọn)
  // Ví dụ: { questions: [...], passingScore: 70 }
  status: String,                 // 'draft' | 'published' | 'archived'
  isLocked: Boolean,              // Khoá bài nếu chưa hoàn thành bài trước
  prerequisiteLesson: String,     // lessonId cần hoàn thành trước (nullable)
  views: Number,                  // Lượt xem
  likes: Number,                  // Lượt thích
  createdAt: Date,                // Ngày tạo
  updatedAt: Date,                // Ngày cập nhật
  createdBy: String,              // Wallet người tạo (instructor/admin)
};

/**
 * Validate dữ liệu Lesson trước khi ghi vào Firestore.
 * @param {object} data
 * @returns {string[]} Danh sách lỗi (rỗng = hợp lệ)
 */
const validateLesson = (data) => {
  const errors = [];

  if (!data.courseId || typeof data.courseId !== 'string') {
    errors.push('Course ID is required');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('Lesson title is required and must be a non-empty string');
  }

  if (typeof data.order !== 'number' || data.order < 1) {
    errors.push('Order must be a positive number (1, 2, 3...)');
  }

  if (data.duration !== undefined && (typeof data.duration !== 'number' || data.duration < 0)) {
    errors.push('Duration must be a non-negative number (minutes)');
  }

  if (
    data.videoProvider &&
    !['youtube', 'vimeo', 'pinata', 'other'].includes(data.videoProvider)
  ) {
    errors.push('videoProvider must be: youtube, vimeo, pinata, or other');
  }

  if (data.status && !['draft', 'published', 'archived'].includes(data.status)) {
    errors.push('Status must be: draft, published, or archived');
  }

  return errors;
};

module.exports = { lessonSchema, validateLesson };
