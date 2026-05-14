/**
 * Lesson Model
 * Cấu trúc dữ liệu cho một bài giảng trong khóa học.
 *
 * Kiến trúc lưu trữ:
 *  - Firebase: lưu toàn bộ metadata lesson, videoUrl (Cloudinary), thumbnailUrl (Cloudinary)
 *  - Cloudinary: lưu video bài giảng (videoUrl) và ảnh thumbnail (thumbnailUrl)
 *    Ngoại lệ: nếu videoProvider = 'youtube' | 'vimeo', videoUrl là embed link bên ngoài.
 *  - attachments: mảng { name, url, type } — url là Cloudinary URL hoặc link ngoài
 */
const lessonSchema = {
  lessonId: String,               // ID duy nhất (vd: lesson_<courseId>_<timestamp>)
  courseId: String,               // Tham chiếu tới courses collection
  blockchainCourseId: Number,     // ID trên Smart Contract (để verify quyền xem)
  title: String,                  // Tên bài giảng
  description: String,            // Mô tả ngắn
  order: Number,                  // Thứ tự bài trong khóa học (1, 2, 3...)
  duration: Number,               // Thời lượng (phút)
  videoUrl: String,               // URL video từ Cloudinary hoặc YouTube/Vimeo embed
  videoProvider: String,          // 'cloudinary' | 'youtube' | 'vimeo'
  thumbnailUrl: String,           // URL ảnh thumbnail từ Cloudinary
  content: String,                // Nội dung bài học (HTML / Markdown)
  attachments: Array,             // Tài liệu đính kèm từ Cloudinary
  // Ví dụ: [{ name: "Slides.pdf", url: "https://res.cloudinary.com/...", type: "pdf" }]
  quiz: Object,                   // Quiz cuối bài (tuỳ chọn)
  // Ví dụ: { questions: [...], passingScore: 70 }
  status: String,                 // 'draft' | 'published' | 'archived'
  isLocked: Boolean,              // Khoá bài nếu chưa hoàn thành bài trước
  prerequisiteLesson: String,     // lessonId cần hoàn thành trước (nullable)
  views: Number,                  // Lượt xem (lưu Firebase, không on-chain)
  createdAt: Date,                // Ngày tạo
  updatedAt: Date,                // Ngày cập nhật
  createdBy: String,              // Wallet người tạo (instructor/admin)
};

/**
 * Validate dữ liệu Lesson trước khi ghi vào Firebase.
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
    !['cloudinary', 'youtube', 'vimeo'].includes(data.videoProvider)
  ) {
    errors.push('videoProvider must be: cloudinary, youtube, or vimeo');
  }

  if (data.status && !['draft', 'published', 'archived'].includes(data.status)) {
    errors.push('Status must be: draft, published, or archived');
  }

  return errors;
};

module.exports = { lessonSchema, validateLesson };
