/**
 * Response Filter Utility
 * Lọc bỏ các field nội bộ (backend/admin-only) trước khi trả về frontend.
 *
 * Firebase vẫn lưu đầy đủ tất cả field.
 * Chỉ loại bỏ khỏi API response để giảm payload và ẩn dữ liệu nội bộ.
 */

// ---------------------------------------------------------------------------
// Danh sách field bị loại khỏi response (backend/admin-only)
// ---------------------------------------------------------------------------

const COURSE_INTERNAL_FIELDS   = ['metadataCid', 'createdAt', 'updatedAt', 'createdBy'];
const LESSON_INTERNAL_FIELDS   = ['blockchainCourseId', 'views', 'createdAt', 'updatedAt', 'createdBy'];
const USER_INTERNAL_FIELDS     = ['lastLogin', 'isActive', 'joinedAt'];
const ENROLLMENT_INTERNAL_FIELDS = ['blockchainCourseId'];
const REVIEW_INTERNAL_FIELDS   = ['enrollmentId', 'flagged', 'flagReason', 'updatedAt', 'approvedAt', 'approvedBy'];

// ---------------------------------------------------------------------------
// Helper: loại bỏ các field khỏi một object
// ---------------------------------------------------------------------------
const omit = (obj, fields) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  fields.forEach(f => delete result[f]);
  return result;
};

// ---------------------------------------------------------------------------
// Filter functions — dùng trong controllers
// ---------------------------------------------------------------------------

/** Lọc response của một Course */
const filterCourse = (course) => omit(course, COURSE_INTERNAL_FIELDS);

/** Lọc response của một Lesson */
const filterLesson = (lesson) => omit(lesson, LESSON_INTERNAL_FIELDS);

/** Lọc response của một User */
const filterUser = (user) => omit(user, USER_INTERNAL_FIELDS);

/** Lọc response của một Enrollment */
const filterEnrollment = (enrollment) => omit(enrollment, ENROLLMENT_INTERNAL_FIELDS);

/** Lọc response của một Review */
const filterReview = (review) => omit(review, REVIEW_INTERNAL_FIELDS);

/** Lọc một mảng (dùng cho list endpoints) */
const filterList = (list, filterFn) => list.map(filterFn);

module.exports = {
  filterCourse,
  filterLesson,
  filterUser,
  filterEnrollment,
  filterReview,
  filterList,
};
