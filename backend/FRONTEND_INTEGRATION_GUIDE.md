# Backend — Tổng Quan Tích Hợp Frontend

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Web framework | Express.js |
| Database | Firebase Firestore (5 collections) |
| File storage | Pinata IPFS (ảnh, video, PDF) |
| Blockchain | Ethers.js + Ganache |
| Wallet | MetaMask (phía frontend) |

---

## Cấu Trúc Backend

```
backend/
├── server.js                      # Main Express server
├── package.json
├── .env                           # Cấu hình môi trường (không commit)
├── .env.example                   # Template .env
├── README.md                      # API documentation đầy đủ
│
├── src/config/
│   ├── firebase.js                # Firebase Firestore setup
│   ├── blockchain.js              # Ethers.js + Ganache provider
│   ├── pinata.js                  # Pinata IPFS service
│   └── serviceAccountKey.json     # Firebase credentials (không commit)
│
├── src/models/                    # Data schemas + validation
│   ├── Course.js                  # imageCid (Pinata), averageRating
│   ├── User.js                    # avatar CID (Pinata), wallet-based
│   ├── Enrollment.js              # transactionHash, progress, certificate
│   ├── Lesson.js                  # videoProvider (pinata/youtube/vimeo)
│   └── Review.js                  # Moderation: pending → approved
│
├── src/controllers/               # Business logic
│   ├── courseController.js        # 6 functions
│   ├── userController.js          # 5 functions
│   ├── enrollController.js        # 5 functions
│   ├── lessonController.js        # 7 functions
│   ├── reviewController.js        # 10 functions
│   └── uploadController.js        # 3 functions
│
├── src/routes/                    # API routes
│   ├── courseRoutes.js            # /api/courses (6 endpoints)
│   ├── userRoutes.js              # /api/users (5 endpoints)
│   ├── enrollRoutes.js            # /api/enrollments (5 endpoints)
│   ├── lessonRoutes.js            # /api/lessons (7 endpoints)
│   ├── reviewRoutes.js            # /api/reviews (10 endpoints)
│   └── uploadRoutes.js            # /api/upload (3 endpoints)
│
└── src/middlewares/
    ├── errorHandler.js            # Xử lý lỗi toàn cục
    ├── auth.js                    # Xác thực wallet address
    └── validation.js              # Input validation
```

---

## 36 API Endpoints

Tham khảo documentation đầy đủ tại [README.md](README.md).

### Courses API (6 endpoints)

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/courses` | Lấy danh sách khóa học (filter: category, level, status) |
| GET | `/api/courses/:courseId` | Lấy chi tiết khóa học |
| GET | `/api/courses/search` | Tìm kiếm khóa học |
| POST | `/api/courses` | Tạo khóa học (Admin) |
| PUT | `/api/courses/:courseId` | Cập nhật khóa học |
| DELETE | `/api/courses/:courseId` | Xóa khóa học |

### Users API (5 endpoints)

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/users` | Tạo user mới (sau khi connect MetaMask) |
| GET | `/api/users/:walletAddress` | Lấy profile user |
| PUT | `/api/users/:walletAddress` | Cập nhật profile |
| GET | `/api/users/:walletAddress/purchased-courses` | Lấy khóa học đã mua |
| PATCH | `/api/users/:walletAddress/last-login` | Cập nhật lần đăng nhập |

### Enrollments API (5 endpoints)

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/enrollments/verify` | Xác minh giao dịch blockchain và tạo enrollment |
| GET | `/api/enrollments/user/:walletAddress` | Lấy enrollments của user |
| GET | `/api/enrollments/:enrollmentId` | Lấy chi tiết enrollment |
| PATCH | `/api/enrollments/:enrollmentId/progress` | Cập nhật tiến độ học |
| POST | `/api/enrollments/:enrollmentId/review` | Gửi đánh giá nhanh |

### Lessons API (7 endpoints)

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/lessons/course/:courseId` | Lấy tất cả bài giảng của khóa học |
| GET | `/api/lessons/:lessonId` | Lấy chi tiết bài giảng (tăng views) |
| POST | `/api/lessons` | Tạo bài giảng mới |
| PUT | `/api/lessons/:lessonId` | Cập nhật bài giảng |
| DELETE | `/api/lessons/:lessonId` | Xóa bài giảng |
| POST | `/api/lessons/:lessonId/like` | Thích bài giảng |
| PATCH | `/api/lessons/:lessonId/publish` | Publish từ draft |

### Reviews API (10 endpoints)

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/reviews/course/:courseId` | Lấy reviews của khóa học |
| GET | `/api/reviews/stats/:courseId` | Thống kê ratings |
| GET | `/api/reviews/:reviewId` | Chi tiết review |
| POST | `/api/reviews` | Tạo review mới |
| PUT | `/api/reviews/:reviewId` | Cập nhật review (author) |
| DELETE | `/api/reviews/:reviewId` | Xóa review |
| PATCH | `/api/reviews/:reviewId/approve` | Phê duyệt (Admin/Instructor) |
| POST | `/api/reviews/:reviewId/flag` | Flag spam/nội dung xấu |
| POST | `/api/reviews/:reviewId/helpful` | Vote helpful/unhelpful |
| POST | `/api/reviews/:reviewId/reply` | Trả lời review (Instructor/Admin) |

### Upload API — Pinata IPFS (3 endpoints)

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/upload/file` | Upload file lên Pinata IPFS |
| POST | `/api/upload/json` | Upload JSON metadata lên IPFS |
| GET | `/api/upload/url/:cid` | Chuyển CID thành URL đầy đủ |

**Workflow upload ảnh bìa khóa học:**

```
1. POST /api/upload/file  →  { cid: "bafybeig..." }
2. POST /api/courses      →  { imageCid: "bafybeig..." }
3. GET  /api/courses      →  { imageUrl: "https://gateway.pinata.cloud/ipfs/bafybeig..." }
```

---

## Data Models (Firestore Collections)

### courses

```javascript
{
  courseId: String,               // Firestore doc ID
  blockchainCourseId: Number,     // ID trên Smart Contract
  title, description, instructor: String,
  price: Number,                  // ETH (số thực: 0.5, 1.25...)
  category, level, status: String,
  duration: Number,               // Giờ
  imageCid: String,               // CID Pinata IPFS
  videoUrl: String,
  lessonIds: Array,
  averageRating: Number,          // 0–5 (tính từ reviews)
  reviewCount, enrolledCount: Number,
  certificateRewardable: Boolean,
  tags, prerequisites: Array,
  createdAt, updatedAt: Timestamp,
  createdBy: String               // wallet admin
}
```

### users

```javascript
{
  walletAddress: String,          // Primary key (lowercase)
  username, email, fullName, bio: String,
  avatar: String,                 // CID Pinata IPFS
  enrolledCourses: Array,         // IDs khóa học đang học
  completedCourses: Array,
  bookmarkedCourses: Array,
  role: "student" | "instructor" | "admin",
  reputation, totalSpent: Number, // totalSpent tính bằng ETH
  joinedAt, lastLogin: Timestamp,
  isActive: Boolean
}
```

### enrollments

```javascript
{
  enrollmentId: String,
  userWallet, courseId: String,
  transactionHash: String,        // Verified blockchain tx
  purchasePrice: Number,          // ETH
  status: "success" | "pending" | "failed",
  progress: Number,               // 0–100 (%)
  purchasedAt, startedAt, completedAt: Timestamp,
  certificateIssued: Boolean,
  certificateHash: String | null,
  rating: Number | null,
  review: String | null
}
```

### lessons

```javascript
{
  lessonId, courseId: String,
  blockchainCourseId: Number,
  title, description, content, transcript: String,
  order, duration, views, likes: Number,
  videoUrl: String,
  videoProvider: "youtube" | "vimeo" | "pinata" | "other",
  thumbnailCid: String,           // CID Pinata IPFS
  attachments: Array,             // [{ name, url, type }]
  quiz: Object | null,
  status: "draft" | "published" | "archived",
  isLocked: Boolean,
  prerequisiteLesson: String | null,
  createdAt, updatedAt: Timestamp,
  createdBy: String
}
```

### reviews

```javascript
{
  reviewId, courseId, userWallet, enrollmentId: String,
  rating: Number,                 // 1–5
  title, content: String,
  verified: Boolean,              // Đã xác minh mua hàng
  helpful, unhelpful: Number,
  replies: Array,                 // [{ replyId, repliedBy, role, content, createdAt }]
  status: "pending" | "approved" | "rejected" | "flagged",
  flagged: Boolean,
  flagReason: String | null,
  createdAt, updatedAt: Timestamp,
  approvedAt: Timestamp | null,
  approvedBy: String | null
}
```

---

## Middlewares

### auth.js

```javascript
verifyWalletAddress(req, res, next)
  // Validate format: 0x[40 hex chars]
  // Attach to req.user.walletAddress

verifyAdmin(req, res, next)
  // Check wallet in ADMIN_ADDRESSES env
```

### errorHandler.js

- Firestore errors → 403/404
- Blockchain errors → 400
- Validation errors → 400
- JSON response chuẩn

### validation.js

- `validateEthereumAddress(address)`
- `validateTransactionHash(hash)`
- `validateCourseInput`, `validateUserInput`, `validateEnrollmentInput`

---

## Environment Variables

```env
PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/serviceAccountKey.json

# Pinata IPFS
PINATA_JWT=your_jwt_token
PINATA_API_KEY=your_api_key
PINATA_API_SECRET=your_api_secret
PINATA_GATEWAY=https://gateway.pinata.cloud

# Blockchain
RPC_URL=http://127.0.0.1:7545
PRIVATE_KEY=0x_ganache_private_key
CONTRACT_ADDRESS=0x_contract_address

# Admin
ADMIN_ADDRESSES=0xAddr1,0xAddr2
```

---

## Frontend Integration Checklist

### Phase 1 — Setup

- [ ] `npm install`
- [ ] Cấu hình `.env` (Firebase + Pinata + Ganache)
- [ ] Khởi động Ganache trên port 7545

### Phase 2 — User Management

- [ ] Connect MetaMask → `POST /api/users` (tạo user nếu chưa có)
- [ ] Lấy profile → `GET /api/users/:wallet`
- [ ] Upload avatar: `POST /api/upload/file`, rồi `PUT /api/users/:wallet`

### Phase 3 — Course Browsing

- [ ] `GET /api/courses` (dùng `imageUrl` để hiển thị ảnh)
- [ ] `GET /api/courses/search`
- [ ] `GET /api/courses/:courseId`

### Phase 4 — Purchase Flow

- [ ] MetaMask sign transaction → lấy `tx_hash`
- [ ] `POST /api/enrollments/verify`
- [ ] Hiển thị thông báo thành công

### Phase 5 — Learning

- [ ] `GET /api/enrollments/user/:wallet`
- [ ] `GET /api/lessons/course/:courseId`
- [ ] `PATCH /api/enrollments/:id/progress`

### Phase 6 — Reviews

- [ ] `POST /api/reviews` (sau khi hoàn thành khóa học)
- [ ] `GET /api/reviews/course/:courseId` (hiển thị)

---

## Khởi Động

```bash
cd backend
npm install
npm run dev
# Server: http://localhost:5000
```

**Health check:**
```bash
curl http://localhost:5000/api/health
```
