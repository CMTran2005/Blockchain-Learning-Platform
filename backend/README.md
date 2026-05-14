# Blockchain Learning Platform — Backend API

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [API Endpoints](#api-endpoints)
6. [Data Models](#data-models)
7. [File Upload (Pinata IPFS)](#file-upload-pinata-ipfs)
8. [Error Handling](#error-handling)
9. [Usage Examples](#usage-examples)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Backend REST API cho nền tảng học blockchain. Cung cấp 36 endpoints để quản lý khóa học, người dùng, đăng ký, bài giảng, đánh giá và upload file.

**Tech Stack:**

| Thành phần | Công nghệ |
|---|---|
| Web framework | Express.js 5.x |
| Database | Firebase Firestore (Firebase Admin SDK 13.x) |
| File storage | Pinata IPFS (ảnh, video, PDF) |
| Blockchain | Ethers.js 6.x + Ganache |
| File upload | Multer + Axios |
| Runtime | Node.js (CommonJS) |

---

## Prerequisites

Trước khi chạy, cần cài đặt và chuẩn bị:

- Node.js >= 18
- Ganache (local blockchain, chạy trên port 7545)
- Tài khoản Firebase (tải `serviceAccountKey.json` từ Firebase Console)
- Tài khoản Pinata IPFS (đăng ký miễn phí tại [pinata.cloud](https://pinata.cloud), gói free có 1GB)

---

## Quick Start

### 1. Cài dependencies

```bash
cd backend
npm install
```

### 2. Cấu hình môi trường

Sao chép `.env.example` thành `.env` và điền giá trị thực:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Firebase — tải serviceAccountKey.json từ Firebase Console > Project Settings > Service Accounts
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/serviceAccountKey.json

# Pinata IPFS — lấy JWT tại https://app.pinata.cloud/keys
PINATA_JWT=your_pinata_jwt_token
PINATA_API_KEY=your_api_key
PINATA_API_SECRET=your_api_secret
PINATA_GATEWAY=https://gateway.pinata.cloud

# Blockchain — chạy Ganache trước, lấy RPC URL và private key từ Ganache UI
RPC_URL=http://127.0.0.1:7545
PRIVATE_KEY=0x_your_ganache_private_key
CONTRACT_ADDRESS=0x_your_contract_address

# Admin wallets (phân cách bằng dấu phẩy, không có space)
ADMIN_ADDRESSES=0xaddr1,0xaddr2
```

### 3. Lấy Pinata credentials

1. Đăng ký tại [pinata.cloud](https://pinata.cloud)
2. Vào **API Keys** → tạo key mới với quyền `pinFileToIPFS`, `pinJSONToIPFS`
3. Copy **JWT token** vào `PINATA_JWT` trong `.env`

### 4. Khởi động server

```bash
# Development (hot-reload)
npm run dev

# Production
npm start
```

Server chạy tại: `http://localhost:5000`

Khi khởi động thành công, console sẽ hiển thị:
```
Server running on http://localhost:5000
Pinata IPFS connected
```

---

## Architecture

### Cấu trúc thư mục

```
backend/
├── server.js                      # Express app, middleware, routes
├── package.json
├── .env                           # Biến môi trường (không commit)
├── .env.example                   # Template cấu hình
│
├── src/config/
│   ├── firebase.js                # Firebase Admin SDK (Firestore)
│   ├── blockchain.js              # Ethers.js — Ganache provider + admin wallet
│   ├── pinata.js                  # Pinata IPFS service (upload file/JSON)
│   └── serviceAccountKey.json     # Firebase credentials (không commit)
│
├── src/models/                    # Data schemas và validation
│   ├── Course.js
│   ├── User.js
│   ├── Enrollment.js
│   ├── Lesson.js
│   └── Review.js
│
├── src/controllers/               # Business logic
│   ├── courseController.js        # 6 functions
│   ├── userController.js          # 5 functions
│   ├── enrollController.js        # 5 functions
│   ├── lessonController.js        # 7 functions
│   ├── reviewController.js        # 10 functions
│   └── uploadController.js        # 3 functions
│
├── src/routes/                    # Route definitions
│   ├── courseRoutes.js            # /api/courses
│   ├── userRoutes.js              # /api/users
│   ├── enrollRoutes.js            # /api/enrollments
│   ├── lessonRoutes.js            # /api/lessons
│   ├── reviewRoutes.js            # /api/reviews
│   └── uploadRoutes.js            # /api/upload
│
└── src/middlewares/
    ├── errorHandler.js            # Global error handling
    ├── auth.js                    # Wallet verification và RBAC
    └── validation.js              # Input validation
```

### Firestore Collections

```
Firestore/
├── courses/       — Danh sách khóa học (imageCid lưu trên Pinata IPFS)
├── users/         — Hồ sơ người dùng (avatar CID lưu trên Pinata IPFS)
├── enrollments/   — Lịch sử mua hàng (transactionHash được xác minh)
├── lessons/       — Bài giảng (thumbnailCid, attachments trên Pinata IPFS)
└── reviews/       — Đánh giá khóa học (moderation workflow)
```

### Storage Architecture

```
Frontend (React)
    |-- MetaMask (ký giao dịch)
    |
Smart Contract (Ganache)    <-- Giao dịch ETH, xác minh sở hữu
    |
Backend (Express/Node)
    |                   |
Firebase Firestore      Pinata IPFS
(metadata, users,       (ảnh, video, PDF,
 enrollments,            certificate metadata)
 reviews)
```

---

## API Endpoints

### Tổng hợp

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

### Courses API

| Method | Endpoint | Chức năng | Quyền |
|---|---|---|---|
| GET | `/api/courses` | Lấy danh sách khóa học (filter: category, level, status) | Public |
| GET | `/api/courses/:courseId` | Lấy chi tiết khóa học | Public |
| GET | `/api/courses/search` | Tìm kiếm khóa học | Public |
| POST | `/api/courses` | Tạo khóa học | Admin |
| PUT | `/api/courses/:courseId` | Cập nhật khóa học | Admin |
| DELETE | `/api/courses/:courseId` | Xóa khóa học | Admin |

**GET /api/courses** — Query parameters:

- `category` (optional): lọc theo danh mục
- `level` (optional): `beginner`, `intermediate`, `advanced`
- `status` (optional): `active` (mặc định), `inactive`, `archived`

**Response:**
```json
[
  {
    "courseId": "abc123",
    "blockchainCourseId": 1,
    "title": "Smart Contract Basics",
    "instructor": "John Doe",
    "price": 1.0,
    "category": "blockchain",
    "level": "beginner",
    "duration": 40,
    "imageCid": "bafybeig...",
    "imageUrl": "https://gateway.pinata.cloud/ipfs/bafybeig...",
    "averageRating": 4.7,
    "reviewCount": 32,
    "enrolledCount": 125,
    "certificateRewardable": true,
    "createdAt": "2026-05-01T00:00:00.000Z"
  }
]
```

> `imageUrl` được tự động tính từ `imageCid`. Frontend chỉ cần dùng `imageUrl` để hiển thị ảnh.

**POST /api/courses** — Body:

> Workflow: Upload ảnh bìa trước qua `POST /api/upload/file`, lấy `cid` trả về, rồi truyền vào `imageCid`.

```json
{
  "title": "Web3 Fundamentals",
  "description": "Introduction to Web3 and blockchain",
  "instructor": "Jane Doe",
  "price": 0.5,
  "category": "web3",
  "level": "beginner",
  "duration": 30,
  "imageCid": "bafybeig...",
  "blockchainCourseId": 2,
  "certificateRewardable": true,
  "prerequisites": []
}
```

---

### Users API

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/users` | Tạo user mới (gọi sau khi kết nối MetaMask) |
| GET | `/api/users/:walletAddress` | Lấy profile user |
| PUT | `/api/users/:walletAddress` | Cập nhật profile |
| GET | `/api/users/:walletAddress/purchased-courses` | Lấy khóa học đã mua |
| PATCH | `/api/users/:walletAddress/last-login` | Cập nhật lần đăng nhập cuối |

**POST /api/users** — Body:
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc7e7595f82f7d",
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe"
}
```

**GET /api/users/:walletAddress** — Response:
```json
{
  "walletAddress": "0x742d35...",
  "username": "john_doe",
  "avatar": "bafybeig...",
  "enrolledCourses": ["course_1", "course_2"],
  "completedCourses": ["course_1"],
  "role": "student",
  "totalSpent": 1.5,
  "joinedAt": "2026-05-01T00:00:00.000Z"
}
```

> `avatar` là CID Pinata. Dùng `GET /api/upload/url/:cid` để lấy URL đầy đủ.

---

### Enrollments API

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/enrollments/verify` | Xác minh giao dịch blockchain và tạo enrollment |
| GET | `/api/enrollments/user/:walletAddress` | Lấy danh sách enrollment của user |
| GET | `/api/enrollments/:enrollmentId` | Lấy chi tiết enrollment |
| PATCH | `/api/enrollments/:enrollmentId/progress` | Cập nhật tiến độ học |
| POST | `/api/enrollments/:enrollmentId/review` | Gửi đánh giá nhanh |

**POST /api/enrollments/verify** — Body:
```json
{
  "tx_hash": "0x123abc...",
  "walletAddress": "0x742d35...",
  "courseId": "course_abc123"
}
```

Flow xác minh:
1. Backend verify `tx_hash` trên Ganache (`provider.getTransactionReceipt`)
2. Kiểm tra `tx.from` khớp với `walletAddress`
3. Tạo enrollment record trong Firestore
4. Cập nhật `enrolledCourses` của user

---

### Lessons API

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/lessons/course/:courseId` | Lấy tất cả bài giảng của khóa học |
| GET | `/api/lessons/:lessonId` | Lấy chi tiết bài giảng (tăng views) |
| POST | `/api/lessons` | Tạo bài giảng mới |
| PUT | `/api/lessons/:lessonId` | Cập nhật bài giảng |
| DELETE | `/api/lessons/:lessonId` | Xóa bài giảng (cascade cập nhật course.lessonIds) |
| POST | `/api/lessons/:lessonId/like` | Thích bài giảng |
| PATCH | `/api/lessons/:lessonId/publish` | Publish bài giảng từ draft |

**POST /api/lessons** — Body:

> Workflow video Pinata: Upload video qua `POST /api/upload/file`, lấy URL từ IPFS gateway, truyền vào `videoUrl` với `videoProvider: "pinata"`.

```json
{
  "courseId": "course_abc123",
  "title": "Variables and Data Types",
  "order": 2,
  "duration": 30,
  "videoUrl": "https://gateway.pinata.cloud/ipfs/bafybeig...",
  "videoProvider": "pinata",
  "thumbnailCid": "bafybeig...",
  "attachments": [
    { "name": "Slides.pdf", "url": "https://gateway.pinata.cloud/ipfs/bafybeig2...", "type": "pdf" }
  ],
  "status": "draft"
}
```

**videoProvider** nhận các giá trị:
- `youtube` — YouTube embed URL
- `vimeo` — Vimeo URL
- `pinata` — File upload lên Pinata IPFS
- `other` — Nguồn khác

---

### Reviews API

| Method | Endpoint | Chức năng | Quyền |
|---|---|---|---|
| GET | `/api/reviews/course/:courseId` | Lấy reviews của khóa học | Public |
| GET | `/api/reviews/stats/:courseId` | Thống kê ratings | Public |
| GET | `/api/reviews/:reviewId` | Lấy chi tiết review | Public |
| POST | `/api/reviews` | Tạo review mới | Student (đã mua) |
| PUT | `/api/reviews/:reviewId` | Cập nhật review | Author |
| DELETE | `/api/reviews/:reviewId` | Xóa review | Author/Admin |
| PATCH | `/api/reviews/:reviewId/approve` | Phê duyệt review | Admin/Instructor |
| POST | `/api/reviews/:reviewId/flag` | Flag spam/nội dung xấu | Authenticated |
| POST | `/api/reviews/:reviewId/helpful` | Vote helpful/unhelpful | Authenticated |
| POST | `/api/reviews/:reviewId/reply` | Trả lời review | Instructor/Admin |

**POST /api/reviews** — Body:
```json
{
  "courseId": "course_abc123",
  "userWallet": "0x742d35...",
  "enrollmentId": "enr_0x742d35_1234",
  "rating": 5,
  "title": "Excellent course!",
  "content": "Very well taught, great content and examples."
}
```

Ràng buộc:
- `rating`: 1–5
- `content`: 10–5000 ký tự
- Mỗi user chỉ được review 1 lần cho mỗi khóa học
- Status mặc định: `pending` (cần admin approve trước khi hiển thị)

---

## File Upload (Pinata IPFS)

| Method | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/upload/file` | Upload file lên Pinata IPFS |
| POST | `/api/upload/json` | Upload JSON metadata lên IPFS |
| GET | `/api/upload/url/:cid` | Chuyển CID thành URL đầy đủ |

### POST /api/upload/file

```
Content-Type: multipart/form-data

Fields:
  file    — file cần upload (bắt buộc)
  folder  — tên nhóm trên Pinata (tuỳ chọn, vd: "avatars", "lessons")
```

**Ví dụ với JavaScript:**
```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('folder', 'avatars');

const res = await fetch('http://localhost:5000/api/upload/file', {
  method: 'POST',
  body: formData,
});
const { cid, url } = await res.json();
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "cid": "bafybeig...",
  "url": "https://gateway.pinata.cloud/ipfs/bafybeig...",
  "fileName": "avatar.png",
  "mimeType": "image/png",
  "size": 204800
}
```

**Định dạng file hỗ trợ:**
- Ảnh: `jpg`, `png`, `gif`, `webp`, `svg`
- Video: `mp4`, `webm`, `ogg`
- Tài liệu: `pdf`, `zip`, `json`, `txt`, `md`
- Kích thước tối đa: **100MB**

### POST /api/upload/json

Dùng cho certificate NFT metadata, course metadata.

```json
{
  "name": "certificate_0x742d35_course1",
  "data": {
    "name": "Smart Contract Basics Certificate",
    "description": "Awarded to John Doe for completing the course",
    "courseId": "course_abc123",
    "completedAt": "2026-05-14T00:00:00.000Z"
  }
}
```

### GET /api/upload/url/:cid

```bash
GET /api/upload/url/bafybeig...
```

```json
{
  "cid": "bafybeig...",
  "url": "https://gateway.pinata.cloud/ipfs/bafybeig..."
}
```

---

## Data Models

### courses

```javascript
{
  courseId: String,               // Firestore document ID
  blockchainCourseId: Number,     // ID trên Smart Contract
  title: String,
  description: String,
  instructor: String,
  price: Number,                  // ETH (số thực, vd: 0.5)
  category: String,
  level: "beginner" | "intermediate" | "advanced",
  duration: Number,               // Giờ
  imageCid: String,               // CID Pinata IPFS
  videoUrl: String,               // URL video giới thiệu khóa học
  content: String,
  lessonIds: Array,               // IDs của lessons thuộc khóa học
  averageRating: Number,          // 0–5, tính tự động từ reviews
  reviewCount: Number,
  enrolledCount: Number,
  certificateRewardable: Boolean,
  prerequisites: Array,           // IDs khóa học tiên quyết
  tags: Array,
  status: "active" | "inactive" | "archived",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: String               // wallet admin
}
```

### users

```javascript
{
  walletAddress: String,          // Primary key (Ethereum address, lowercase)
  username: String,
  email: String,
  fullName: String,
  avatar: String,                 // CID Pinata IPFS
  bio: String,
  enrolledCourses: Array,         // IDs khóa học đang học
  completedCourses: Array,        // IDs khóa học đã hoàn thành
  bookmarkedCourses: Array,       // IDs khóa học đã bookmark
  role: "student" | "instructor" | "admin",
  reputation: Number,
  totalSpent: Number,             // ETH đã chi (số thực)
  joinedAt: Timestamp,
  lastLogin: Timestamp,
  isActive: Boolean
}
```

> Không có trường `purchasedCourses`. Thông tin mua hàng được lưu trong collection `enrollments`. Trường `enrolledCourses` dùng để hiển thị nhanh mà không cần query enrollments mỗi lần.

### enrollments

```javascript
{
  enrollmentId: String,
  userWallet: String,
  courseId: String,
  transactionHash: String,        // Blockchain tx hash (đã xác minh)
  purchasePrice: Number,          // ETH
  purchasedAt: Timestamp,
  status: "success" | "pending" | "failed",
  progress: Number,               // 0–100 (%)
  startedAt: Timestamp,
  completedAt: Timestamp | null,
  certificateIssued: Boolean,
  certificateHash: String | null, // On-chain certificate hash
  rating: Number | null,          // Quick rating 1–5
  review: String | null           // Quick review text
}
```

### lessons

```javascript
{
  lessonId: String,
  courseId: String,
  blockchainCourseId: Number,
  title: String,
  description: String,
  order: Number,
  duration: Number,               // Phút
  videoUrl: String,               // YouTube/Vimeo URL hoặc IPFS gateway URL
  videoProvider: "youtube" | "vimeo" | "pinata" | "other",
  thumbnailCid: String,           // CID Pinata IPFS
  content: String,                // HTML/Markdown
  transcript: String,
  attachments: Array,             // [{ name, url, type }]
  quiz: Object | null,
  status: "draft" | "published" | "archived",
  isLocked: Boolean,
  prerequisiteLesson: String | null,
  views: Number,
  likes: Number,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: String
}
```

### reviews

```javascript
{
  reviewId: String,
  courseId: String,
  userWallet: String,
  enrollmentId: String,
  rating: Number,                 // 1–5
  title: String,
  content: String,                // 10–5000 ký tự
  verified: Boolean,              // Đã xác minh mua hàng
  helpful: Number,
  unhelpful: Number,
  replies: Array,                 // [{ replyId, repliedBy, role, content, createdAt }]
  status: "pending" | "approved" | "rejected" | "flagged",
  flagged: Boolean,
  flagReason: String | null,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  approvedAt: Timestamp | null,
  approvedBy: String | null
}
```

---

## Error Handling

### Định dạng lỗi chuẩn

```json
{
  "message": "Mô tả lỗi",
  "error": "Chi tiết kỹ thuật",
  "statusCode": 400
}
```

### HTTP Status Codes

| Code | Ý nghĩa |
|---|---|
| 200 | OK — Thành công |
| 201 | Created — Tạo mới thành công |
| 400 | Bad Request — Input không hợp lệ |
| 401 | Unauthorized — Thiếu hoặc sai thông tin xác thực |
| 403 | Forbidden — Không có quyền |
| 404 | Not Found — Không tìm thấy |
| 409 | Conflict — Tài nguyên đã tồn tại |
| 500 | Server Error — Lỗi server |

---

## Usage Examples

### Upload avatar và cập nhật profile

```bash
# Bước 1: Upload ảnh
curl -X POST http://localhost:5000/api/upload/file \
  -F "file=@avatar.png" \
  -F "folder=avatars"
# Response: { "cid": "bafybeig...", "url": "https://..." }

# Bước 2: Cập nhật avatar user
curl -X PUT http://localhost:5000/api/users/0x742d35... \
  -H "Content-Type: application/json" \
  -d '{"avatar": "bafybeig..."}'
```

### Tạo khóa học với ảnh bìa

```bash
# Bước 1: Upload ảnh bìa
curl -X POST http://localhost:5000/api/upload/file \
  -F "file=@cover.jpg" \
  -F "folder=courses"
# Response: { "cid": "bafybeig_image..." }

# Bước 2: Tạo khóa học
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced Solidity",
    "instructor": "Alice Smith",
    "price": 2.0,
    "category": "solidity",
    "level": "advanced",
    "duration": 50,
    "imageCid": "bafybeig_image...",
    "blockchainCourseId": 5
  }'
```

### Xác minh giao dịch mua khóa học

```bash
curl -X POST http://localhost:5000/api/enrollments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "tx_hash": "0x123abc456def...",
    "walletAddress": "0x742d35...",
    "courseId": "course_abc123"
  }'
```

### Upload certificate metadata lên IPFS

```bash
curl -X POST http://localhost:5000/api/upload/json \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cert_course1_alice",
    "data": {
      "name": "Smart Contract Certificate",
      "recipient": "0x742d35...",
      "courseId": "course_abc123",
      "completedAt": "2026-05-14T00:00:00.000Z"
    }
  }'
```

### Health check

```bash
curl http://localhost:5000/api/health
```

---

## Troubleshooting

### Server không khởi động — Cannot find module

```
Error: Cannot find module 'multer'
```

Chạy `npm install` để cài lại dependencies.

---

### Pinata kết nối thất bại

```
Pinata connection failed: Unauthorized
```

- Kiểm tra `PINATA_JWT` trong `.env`
- Tạo JWT mới tại https://app.pinata.cloud/keys
- Đảm bảo JWT có quyền `pinFileToIPFS`, `pinJSONToIPFS`

---

### Firebase Permission Denied

```
PERMISSION_DENIED: Missing or insufficient permissions
```

- Kiểm tra đường dẫn `serviceAccountKey.json` trong `FIREBASE_SERVICE_ACCOUNT_PATH`
- Đảm bảo file credentials đúng project Firebase

---

### Transaction Not Found (Ganache)

```json
{ "message": "The transaction did not exist or failed!" }
```

- Đảm bảo Ganache đang chạy trên port 7545
- Kiểm tra `RPC_URL` trong `.env`
- Đảm bảo transaction đã được mine

---

### File quá lớn

```json
{ "message": "File too large" }
```

Giới hạn upload là **100MB**. Nén video/ảnh trước khi upload.

---

## Resources

- Pinata Docs: https://docs.pinata.cloud
- Firebase Firestore: https://firebase.google.com/docs/firestore
- Ethers.js v6: https://docs.ethers.org/v6
- Ganache: https://trufflesuite.com/ganache
