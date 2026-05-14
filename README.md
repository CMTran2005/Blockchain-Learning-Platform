# Blockchain Learning Platform (E-Learning dApp)

Hệ thống website học trực tuyến phi tập trung (dApp). Dự án cho phép người dùng kết nối ví MetaMask, thực hiện mua khóa học bằng đồng ETH và xác thực quyền sở hữu vĩnh viễn trên mạng lưới Blockchain.

---

## I. Kiến trúc hệ thống (System Architecture)
Dự án được vận hành theo mô hình 3 lớp tách biệt nhằm tối ưu hóa việc cộng tác qua GitHub:
- **Frontend:** React.js - Giao diện người dùng và trải nghiệm học tập.
- **Backend Bridge**: Express.js + Ethers.js - API server kết nối Frontend với Blockchain và Database.
- **Smart Contract:** Solidity - Ngôn ngữ lập trình xử lý logic và lưu trữ giao dịch trên Blockchain.
- **Local Network:** Ganache - Mạng Blockchain giả lập dùng để triển khai và thử nghiệm.
- **Wallet:** MetaMask - Công cụ quản lý ví và xác thực các giao dịch tài chính.
- **Database:** Firebase Firestore - Lưu trữ metadata (khóa học, user, enrollment, review).
- **File Storage:** Pinata IPFS - Lưu trữ phi tập trung cho ảnh, video, PDF (thay Cloudinary).

---

## II. Phân công nhiệm vụ (GitHub Roles)

### 1. Blockchain Developer (Smart Contract)
- **Thư mục quản lý:** `smart-contract/`
- **Nhiệm vụ:**
  - Lập trình file `Course.sol` quản lý danh sách khóa học và cơ chế sở hữu.
  - Triển khai các hàm nghiệp vụ: `buyCourse`, `getMyCourses`, `getCoursePrice`.
  - Xây dựng các tính năng nâng cao: `withdraw` (rút tiền), `isCoursePurchased` (kiểm tra sở hữu).
  - Xuất file ABI và địa chỉ Contract sau khi deploy thành công lên Ganache.

### 2. Backend Developer (Integration & Logic)
- **Thư mục quản lý:** `backend/`
- **Nhiệm vụ:**
  - Xây dựng 36 REST API endpoints (Courses, Users, Enrollments, Lessons, Reviews, Upload).
  - Tích hợp **Ethers.js** để verify giao dịch blockchain từ Ganache.
  - Tích hợp **Pinata IPFS** để upload và quản lý file phi tập trung.
  - Quản lý **Firebase Firestore** cho metadata (user, khóa học, enrollment, review).
  - Xử lý xác thực qua **wallet address** (không dùng username/password).
  - Xây dựng middleware: auth (wallet verification), validation, error handling.

### 3. Frontend Developer (UI/UX)
- **Thư mục quản lý:** `frontend/src/pages/` & `frontend/src/components/`
- **Nhiệm vụ:**
  - Thiết kế giao diện Navbar, CourseCard, trình phát video và bộ lọc tìm kiếm.
  - Phát triển trang chủ, trang chi tiết khóa học và trang My Courses.
  - Gọi các hàm dịch vụ từ Backend để xử lý hiển thị logic mua hàng và thông báo trạng thái.

---

## III. Thiết kế Database trên Blockchain
Hệ thống sử dụng trạng thái của Smart Contract để lưu trữ dữ liệu thay cho SQL:
- **Cấu trúc dữ liệu:** `mapping(address => uint[]) public userCourses;`
- Nguyên lý: Mỗi địa chỉ ví sẽ ánh xạ đến một mảng các số nguyên (ID khóa học). Khi mua thành công, ID khóa học sẽ được đẩy (push) vào mảng của ví đó.

---

## IV. Chức năng hệ thống (API Interface)
### 1. Chức năng Blockchain (On-chain)

| Tên Hàm / Sự kiện | Loại | Mô tả nhiệm vụ |
| :--- | :--- | :--- |
| `connectWallet()` | Logic | Yêu cầu kết nối MetaMask và trả về địa chỉ ví người dùng. |
| `buyCourse(id)` | Giao dịch | Gửi ETH mua khóa học, kích hoạt popup xác nhận của MetaMask. |
| `getMyCourses()` | Truy vấn | Lấy danh sách ID các khóa học đã sở hữu để hiển thị cho người dùng. |
| `isCoursePurchased`| Kiểm tra | Xác định ví đã mua khóa học chưa để chuyển đổi nút Mua thành Xem nội dung. |
| `withdraw()` | Quản trị | Cho phép chủ sở hữu nền tảng rút tiền ETH thu được về ví cá nhân. |
| `CoursePurchased` | Sự kiện | Tự động thông báo và cập nhật giao diện ngay khi giao dịch hoàn tất. |

### 2. Các tính năng bổ trợ (Off-chain)
| Tên tính năng | Thành phần | Mô tả chi tiết |
| :--- | :--- | :--- |
| Quản lý Metadata | JSON Data | Hiển thị thông tin khóa học (Mô tả, nội dung, ảnh bìa) từ file cấu trúc nội bộ. |
| Phân quyền xem Video | Logic Gate | Tự động khóa/mở trình phát video dựa trên xác thực quyền sở hữu từ Blockchain. |
| Tìm kiếm & Bộ lọc | Search Engine | Hỗ trợ người dùng tìm kiếm khóa học theo từ khóa và phân loại theo chủ đề. |
| Hệ thống thông báo | Toast UI | Phản hồi trạng thái giao dịch theo thời gian thực (Đang xử lý, Thành công, Lỗi). |
| Responsive Design | CSS Layout | Đảm bảo giao diện hiển thị tối ưu trên cả máy tính, máy tính bảng và điện thoại. |
