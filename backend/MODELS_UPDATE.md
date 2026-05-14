# Backend Update Summary — Lesson & Review Models

## Những Thay Đổi Chính

### 2 Models Mới

#### Lesson.js — Quản lý bài giảng

```javascript
lessonSchema {
  lessonId, courseId, blockchainCourseId,
  title, description, order, duration,
  videoUrl, videoProvider, thumbnailCid,
  content, transcript,
  attachments[], quiz,
  status (draft / published / archived),
  isLocked, prerequisiteLesson,
  views, likes,
  createdAt, updatedAt, createdBy
}
```

Tính năng:
- Video quản lý linh hoạt (YouTube, Vimeo, Pinata IPFS)
- Nội dung chi tiết: transcript, attachments
- Quiz tích hợp cuối bài
- Prerequisite: khoá bài cho đến khi hoàn thành bài trước
- Theo dõi views và likes
- Workflow: draft → published → archived

#### Review.js — Đánh giá và bình luận

```javascript
reviewSchema {
  reviewId, courseId, userWallet, enrollmentId,
  rating (1-5), title, content,
  verified, helpful, unhelpful,
  replies[],
  status (pending / approved / rejected / flagged),
  flagged, flagReason,
  createdAt, updatedAt, approvedAt, approvedBy
}
```

Tính năng:
- Hệ thống 5 sao
- Badge xác minh mua hàng (verified purchase)
- Helpful / Unhelpful votes
- Instructor/Admin reply
- Moderation workflow: pending → approved
- Phát hiện spam (flagged)

---

### Course Model — Cập Nhật

Các trường mới thêm vào:
- `blockchainCourseId` — ID trên blockchain để tham chiếu smart contract
- `lessonIds[]` — Mảng ID liên kết tới lessons collection
- `certificateRewardable` — Khoá học có cấp chứng chỉ không
- `prerequisites[]` — Danh sách khóa học tiên quyết
- `averageRating` — Tính tự động từ reviews

Các trường đã chuyển sang model khác:
- `lessons` (chi tiết) → đã tách ra thành collection `lessons` riêng, Course chỉ giữ `lessonIds`

Lý do: giảm tải data trong courses collection, lessons có thể query riêng, performance tốt hơn khi số lượng lessons lớn.

---

### 7 Lesson Controllers

| Function | Method | Endpoint | Chức năng |
|---|---|---|---|
| `getLessonsByCourse` | GET | `/api/lessons/course/:courseId` | Lấy tất cả lessons của khóa học |
| `getLessonById` | GET | `/api/lessons/:lessonId` | Lấy chi tiết bài giảng |
| `createLesson` | POST | `/api/lessons` | Tạo bài giảng mới |
| `updateLesson` | PUT | `/api/lessons/:lessonId` | Cập nhật bài giảng |
| `deleteLesson` | DELETE | `/api/lessons/:lessonId` | Xóa bài giảng |
| `likeLesson` | POST | `/api/lessons/:lessonId/like` | Thích bài giảng |
| `publishLesson` | PATCH | `/api/lessons/:lessonId/publish` | Publish từ draft |

---

### 10 Review Controllers

| Function | Method | Endpoint | Chức năng |
|---|---|---|---|
| `getReviewsByCourse` | GET | `/api/reviews/course/:courseId` | Lấy reviews của khóa học |
| `getCourseReviewStats` | GET | `/api/reviews/stats/:courseId` | Thống kê ratings |
| `getReviewById` | GET | `/api/reviews/:reviewId` | Chi tiết review |
| `createReview` | POST | `/api/reviews` | Tạo review mới |
| `updateReview` | PUT | `/api/reviews/:reviewId` | Cập nhật review |
| `deleteReview` | DELETE | `/api/reviews/:reviewId` | Xóa review |
| `approveReview` | PATCH | `/api/reviews/:reviewId/approve` | Phê duyệt (Admin) |
| `flagReview` | POST | `/api/reviews/:reviewId/flag` | Flag spam |
| `markHelpful` | POST | `/api/reviews/:reviewId/helpful` | Mark helpful |
| `replyToReview` | POST | `/api/reviews/:reviewId/reply` | Trả lời review |

---

## Tổng Số API Endpoints

| Nhóm | Số endpoint |
|---|---|
| Courses | 6 |
| Users | 5 |
| Enrollments | 5 |
| Lessons | 7 |
| Reviews | 10 |
| Upload | 3 |
| **Tổng** | **36** |

---

## Database Relationships

```
courses (1) ──── (Many) lessons
    |
    |──── enrollments ──── users
    |
    └──── reviews ──────── users
```

**5 Collections:**
- courses
- users
- enrollments
- lessons
- reviews

---

## Validation

**Lesson:**
- `courseId` bắt buộc
- `title` bắt buộc, không được để trống
- `order` phải là số dương (1, 2, 3...)
- `duration` không âm (phút)
- `videoProvider` phải là: `youtube`, `vimeo`, `pinata`, `other`
- `status` phải là: `draft`, `published`, `archived`

**Review:**
- `courseId` bắt buộc
- `userWallet` phải là địa chỉ Ethereum hợp lệ
- `rating` từ 1 đến 5
- `content` từ 10 đến 5000 ký tự
- `status` phải là: `pending`, `approved`, `rejected`, `flagged`

---

## Lesson Flow

```
1. Instructor tạo course
2. Instructor tạo lessons (trạng thái draft)
3. Publish lessons khi sẵn sàng
4. Student xem lessons đã published
5. Views và likes được cập nhật tự động
```

## Review Flow

```
1. Student mua khóa học
2. Hoàn thành khóa học
3. Gửi review (trạng thái pending)
4. Instructor/Admin approve
5. Review hiện trên trang khóa học
6. Người dùng khác vote helpful/unhelpful
```

---

## Frontend Integration

**Lessons:**
```javascript
// Lấy danh sách bài giảng
GET /api/lessons/course/{courseId}

// Xem bài giảng
GET /api/lessons/{lessonId}

// Like bài giảng
POST /api/lessons/{lessonId}/like
```

**Reviews:**
```javascript
// Xem reviews
GET /api/reviews/course/{courseId}
GET /api/reviews/stats/{courseId}

// Gửi review
POST /api/reviews
// Body: { courseId, userWallet, rating, content, enrollmentId }

// Vote helpful
POST /api/reviews/{reviewId}/helpful
```
