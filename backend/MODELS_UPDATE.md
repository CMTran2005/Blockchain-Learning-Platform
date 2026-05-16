# Models Update — Hybrid Architecture Migration

**Ngày cập nhật**: 2026-05-14

## Tổng quan thay đổi

Cập nhật toàn bộ data models theo kiến trúc **4-service hybrid**:

| Service | Vai trò |
|---|---|
| Firebase Firestore | Database chính — metadata, links, records |
| Cloudinary | Media storage — video, ảnh, PDF |
| Pinata IPFS | Immutable proof — certificate JSON, course snapshot |
| Smart Contract | On-chain truth — enrollment, progress, certificate |

---

## Chi tiết thay đổi từng model

### Course.js
| Field cũ | Field mới | Lý do |
|---|---|---|
| `imageCid` (Pinata) | `imageUrl` (Cloudinary URL) | Ảnh → Cloudinary |
| `videoUrl` (generic) | Giữ nguyên | URL Cloudinary hoặc YouTube |
| `content` | **Xoá** | Không cần, đã có `description` |
| `prerequisites` | **Xoá** | Không cần cho MVP |
| `metadataCid` | `metadataCid` | CID Pinata của course snapshot JSON |

### Lesson.js
| Field cũ | Field mới | Lý do |
|---|---|---|
| `thumbnailCid` (Pinata) | `thumbnailUrl` (Cloudinary URL) | Ảnh → Cloudinary |
| `videoProvider` | Cập nhật values | `'cloudinary'\|'youtube'\|'vimeo'` |
| `likes` | **Xoá** | Không cần cho MVP |
| `transcript` | Giữ nguyên | Text nhỏ, OK trong Firebase |

### User.js
| Field cũ | Field mới | Lý do |
|---|---|---|
| `avatar` (CID) | `avatarUrl` (Cloudinary URL) | Ảnh → Cloudinary |
| `bookmarkedCourses` | **Xoá** | Không cần cho MVP |
| `reputation` | **Xoá** | Không cần cho MVP |
| `purchasedCourses` | **Xoá** | Dùng enrollments collection thay |

### Enrollment.js
| Field cũ | Field mới | Lý do |
|---|---|---|
| `certificateHash` | `certificateCid` | CID Pinata (thay vì hash on-chain) |
| `rating`, `review` | **Xoá** | Chuyển hẳn về Review collection |
| `startedAt` | **Xoá** | Dùng `purchasedAt` thay |
| `blockchainCourseId` | `blockchainCourseId` | Cần để gọi contract |
| `certificateTxHash` | `certificateTxHash` | Hash giao dịch issueCertificate |

### Review.js
| Field cũ | Field mới | Lý do |
|---|---|---|
| `blockchainCourseId` | **Xoá** | Lấy từ courses collection khi cần |
| `unhelpful` | **Xoá** | Đơn giản hoá |
| `content` max | 5000 → 2000 ký tự | Hợp lý hơn cho UX |

---

## Files mới tạo

| File | Mô tả |
|---|---|
| `backend/src/config/cloudinary.js` | Config Cloudinary SDK |
| `backend/src/config/contract.js` | Config smart contract + ABI |
| `smart-contract/contracts/BlockchainLearning.sol` | Smart contract Solidity |
| `smart-contract/scripts/deploy.js` | Deploy script (Hardhat) |
| `smart-contract/hardhat.config.js` | Hardhat config (Ganache) |
| `smart-contract/package.json` | Smart contract dependencies |

## Files đã thay đổi lớn

| File | Thay đổi |
|---|---|
| `uploadController.js` | Split: `/media` → Cloudinary, `/json` → Pinata |
| `courseController.js` | `createCourse` upload Pinata snapshot + đăng ký on-chain |
| `enrollController.js` | `progress=100` tự động cấp certificate qua Pinata + contract |
| `uploadRoutes.js` | Routes đổi tên: `/file` → `/media`, `/url/:cid` → `/ipfs/:cid` |
| `enrollRoutes.js` | Xoá route `submitReview` (đã chuyển về reviewController) |
| `server.js` | Test connection cả 3 services khi khởi động |

---

## Breaking Changes

> Frontend cần cập nhật:
> - Upload endpoint: `POST /api/upload/file` → `POST /api/upload/media`
> - CID URL endpoint: `GET /api/upload/url/:cid` → `GET /api/upload/ipfs/:cid`
> - Course field: `imageCid` → `imageUrl` (Cloudinary URL thay vì CID)
> - Lesson field: `thumbnailCid` → `thumbnailUrl`
> - User field: `avatar` → `avatarUrl`
> - Enrollment: không còn `submitReview` trong enroll routes
