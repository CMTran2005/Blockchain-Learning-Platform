# Blockchain Learning Platform — Backend API

## Kiến trúc 4-Service

| Service | Vai trò | Lý do chọn |
|---|---|---|
| **Firebase Firestore** | Database chính — lưu metadata, links, records | Query nhanh, realtime, free tier |
| **Cloudinary** | Media storage — video, ảnh, PDF, slides | CDN toàn cầu, streaming video, 25GB free |
| **Pinata IPFS** | Immutable proof — certificate JSON, course snapshot | Bất biến, on-chain reference, 1GB free đủ cho JSON |
| **Smart Contract (EVM)** | On-chain truth — enrollment, progress, certificate | Trustless, không thể giả mạo |

### Luồng dữ liệu

```
Upload media   → Cloudinary → URL → Firebase
Tạo khoá học  → Firebase + Pinata (snapshot JSON) → CID → Smart Contract
Mua khoá học  → Smart Contract (ETH) → tx_hash → Firebase (enrollment)
Hoàn thành    → Pinata (cert JSON) → CID → Smart Contract → Firebase
Verify cert   → Smart Contract (CID) → Pinata (JSON) → Hiển thị
```

---

## Cài đặt

```bash
cd backend
npm install
cp .env.example .env
# Điền đầy đủ credentials vào .env
npm run dev
```

## Cấu hình `.env`

```env
PORT=5000
CLIENT_URL=http://localhost:3000

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./src/config/serviceAccountKey.json

# Cloudinary (https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Pinata IPFS (https://pinata.cloud)
PINATA_JWT=your_jwt_token
PINATA_GATEWAY=https://gateway.pinata.cloud

# Blockchain
RPC_URL=http://127.0.0.1:7545
PRIVATE_KEY=0xyour_private_key
CONTRACT_ADDRESS=0xyour_contract_address
ADMIN_ADDRESSES=0xyour_admin_wallet
```

---

## Deploy Smart Contract

```bash
cd smart-contract
npm install
npm run deploy        # Deploy lên Ganache
# Sao chép CONTRACT_ADDRESS vào backend/.env
```

---

## API Endpoints

### 📁 Upload (`/api/upload`)

| Method | Endpoint | Mô tả | Service |
|---|---|---|---|
| POST | `/api/upload/media` | Upload video/ảnh/PDF | Cloudinary |
| POST | `/api/upload/json` | Upload metadata JSON | Pinata IPFS |
| GET | `/api/upload/ipfs/:cid` | Lấy URL từ CID | Pinata |

**Upload media** — `POST /api/upload/media`
```
multipart/form-data
  file   : file cần upload (video, ảnh, PDF, ZIP...)
  folder : thư mục (vd: 'avatars', 'lessons', 'courses')

Response: { url, publicId, resourceType, fileName, mimeType, size }
```

**Upload JSON** — `POST /api/upload/json`
```json
{ "name": "course_snapshot", "data": { ... } }
Response: { "cid": "bafyrei...", "url": "https://gateway.pinata.cloud/ipfs/..." }
```

---

### 📚 Courses (`/api/courses`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/courses` | Danh sách khoá học |
| GET | `/api/courses/search` | Tìm kiếm |
| GET | `/api/courses/:courseId` | Chi tiết khoá học |
| POST | `/api/courses` | Tạo khoá học (Admin) |
| PUT | `/api/courses/:courseId` | Cập nhật (Admin) |
| DELETE | `/api/courses/:courseId` | Xoá (Admin) |

**Tạo khoá học** — `POST /api/courses`
```json
{
  "title": "Blockchain cơ bản",
  "instructor": "0xabc...",
  "price": 0.05,
  "category": "blockchain",
  "level": "beginner",
  "blockchainCourseId": 1,
  "imageUrl": "https://res.cloudinary.com/..."
}
```
> Tự động upload course snapshot lên Pinata và đăng ký on-chain nếu contract sẵn sàng.

---

### 🎓 Enrollments (`/api/enrollments`)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/enrollments/verify` | Verify giao dịch mua và tạo enrollment |
| GET | `/api/enrollments/user/:walletAddress` | Enrollments của user |
| GET | `/api/enrollments/:enrollmentId` | Chi tiết enrollment |
| PATCH | `/api/enrollments/:enrollmentId/progress` | Cập nhật tiến độ |

**Verify mua hàng** — `POST /api/enrollments/verify`
```json
{ "tx_hash": "0x...", "walletAddress": "0x...", "courseId": "firestore_id" }
```

**Cập nhật progress** — `PATCH /api/enrollments/:id/progress`
```json
{ "progress": 100 }
```
> Khi progress = 100: tự động upload certificate lên Pinata và gọi `issueCertificate()` on-chain.

---

### 👤 Users (`/api/users`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/users/:walletAddress` | Lấy thông tin user |
| POST | `/api/users` | Tạo user mới |
| PUT | `/api/users/:walletAddress` | Cập nhật profile |
| GET | `/api/users/:walletAddress/courses` | Khoá học đã mua |
| PATCH | `/api/users/:walletAddress/login` | Cập nhật lastLogin |

---

### 📖 Lessons (`/api/lessons`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/lessons/course/:courseId` | Bài học theo khoá |
| GET | `/api/lessons/:lessonId` | Chi tiết bài học |
| POST | `/api/lessons` | Tạo bài học (Admin) |
| PUT | `/api/lessons/:lessonId` | Cập nhật (Admin) |
| DELETE | `/api/lessons/:lessonId` | Xoá (Admin) |
| PATCH | `/api/lessons/:lessonId/publish` | Publish bài học |

---

### ⭐ Reviews (`/api/reviews`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/reviews/course/:courseId` | Reviews của khoá học |
| POST | `/api/reviews` | Tạo review |
| PUT | `/api/reviews/:reviewId` | Cập nhật review |
| DELETE | `/api/reviews/:reviewId` | Xoá review |
| PATCH | `/api/reviews/:reviewId/approve` | Duyệt (Admin) |
| PATCH | `/api/reviews/:reviewId/helpful` | Vote hữu ích |
| POST | `/api/reviews/:reviewId/reply` | Phản hồi |
| GET | `/api/reviews/course/:courseId/stats` | Thống kê |

---

## Data Models

### Course
```
courseId            String    Firestore ID
blockchainCourseId  Number    ID trên Smart Contract
title               String
instructor          String    Tên hoặc wallet
price               Number    ETH
category            String
level               String    beginner|intermediate|advanced
imageUrl            String    Cloudinary URL
metadataCid         String    Pinata CID (course snapshot)
lessonIds           Array
averageRating       Number
enrolledCount       Number
certificateRewardable Boolean
status              String    active|inactive|archived
```

### Enrollment
```
enrollmentId        String
userWallet          String    Ethereum address
courseId            String
blockchainCourseId  Number
transactionHash     String    On-chain tx hash
purchasePrice       Number    ETH
progress            Number    0-100
certificateIssued   Boolean
certificateCid      String    Pinata CID (cert metadata)
certificateTxHash   String    On-chain tx hash
```

### Lesson
```
lessonId            String
courseId            String
title               String
order               Number
duration            Number    Phút
videoUrl            String    Cloudinary URL hoặc YouTube/Vimeo
videoProvider       String    cloudinary|youtube|vimeo
thumbnailUrl        String    Cloudinary URL
attachments         Array     [{name, url, type}]
status              String    draft|published|archived
```

---

## Smart Contract Functions

| Function | Mô tả | Caller |
|---|---|---|
| `createCourse(id, cid, price)` | Đăng ký khoá học on-chain | Admin |
| `purchaseCourse(courseId)` payable | Mua khoá học | User |
| `updateProgress(user, courseId, progress)` | Cập nhật tiến độ | Admin |
| `issueCertificate(user, courseId, cid)` | Cấp chứng chỉ | Admin |
| `isEnrolled(user, courseId)` | Kiểm tra enrollment | Public |
| `getCertificate(user, courseId)` | Lấy CID certificate | Public |
| `withdraw()` | Rút ETH về ví owner | Admin |
