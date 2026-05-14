// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlockchainLearning
 * @notice Smart contract quản lý khoá học, enrollment và certificate
 *         cho nền tảng Blockchain Learning Platform.
 *
 * Vai trò trong kiến trúc:
 *  - Lưu enrollment on-chain (trustless, không thể giả mạo)
 *  - Lưu progress on-chain
 *  - Lưu certificate CID (Pinata IPFS) on-chain (bất biến)
 *  - Firebase + Pinata lưu metadata chi tiết; contract là nguồn truth
 */
contract BlockchainLearning {

    // -----------------------------------------------------------------------
    // State variables
    // -----------------------------------------------------------------------

    address public owner;
    uint256 public courseCount;

    struct Course {
        uint256 courseId;
        uint256 priceWei;       // Giá khoá học tính bằng Wei
        string  metadataCid;    // CID Pinata của course snapshot JSON
        bool    active;
        address createdBy;
    }

    struct Certificate {
        string  cid;            // CID Pinata của certificate metadata JSON
        uint256 issuedAt;       // Block timestamp khi cấp
    }

    // courseId => Course
    mapping(uint256 => Course) public courses;

    // userAddress => courseId => enrolled
    mapping(address => mapping(uint256 => bool)) public enrollments;

    // userAddress => courseId => progress (0-100)
    mapping(address => mapping(uint256 => uint8)) public progressMap;

    // userAddress => courseId => Certificate
    mapping(address => mapping(uint256 => Certificate)) public certificates;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event CourseCreated(uint256 indexed courseId, string metadataCid, uint256 priceWei);
    event CoursePurchased(address indexed buyer, uint256 indexed courseId, uint256 pricePaid);
    event ProgressUpdated(address indexed user, uint256 indexed courseId, uint8 progress);
    event CertificateIssued(address indexed user, uint256 indexed courseId, string cid);
    event Withdrawn(address indexed to, uint256 amount);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier courseExists(uint256 courseId) {
        require(courses[courseId].courseId != 0, "Course does not exist");
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // -----------------------------------------------------------------------
    // Write functions (Admin)
    // -----------------------------------------------------------------------

    /**
     * @notice Tạo khoá học mới trên blockchain.
     * @param courseId      ID khoá học (phải unique, dương)
     * @param metadataCid   CID Pinata của course snapshot JSON
     * @param priceWei      Giá khoá học tính bằng Wei
     */
    function createCourse(
        uint256 courseId,
        string calldata metadataCid,
        uint256 priceWei
    ) external onlyOwner {
        require(courseId > 0, "courseId must be positive");
        require(courses[courseId].courseId == 0, "Course already exists");
        require(bytes(metadataCid).length > 0, "metadataCid required");

        courses[courseId] = Course({
            courseId:    courseId,
            priceWei:    priceWei,
            metadataCid: metadataCid,
            active:      true,
            createdBy:   msg.sender
        });
        courseCount++;

        emit CourseCreated(courseId, metadataCid, priceWei);
    }

    /**
     * @notice Cập nhật tiến độ học của user (chỉ backend admin).
     */
    function updateProgress(
        address user,
        uint256 courseId,
        uint8   progress
    ) external onlyOwner courseExists(courseId) {
        require(enrollments[user][courseId], "User not enrolled");
        require(progress <= 100, "Progress must be 0-100");

        progressMap[user][courseId] = progress;
        emit ProgressUpdated(user, courseId, progress);
    }

    /**
     * @notice Cấp chứng chỉ on-chain khi user hoàn thành khoá học.
     * @param cid   CID Pinata của certificate metadata JSON
     */
    function issueCertificate(
        address user,
        uint256 courseId,
        string calldata cid
    ) external onlyOwner courseExists(courseId) {
        require(enrollments[user][courseId], "User not enrolled");
        require(progressMap[user][courseId] == 100, "Course not completed");
        require(bytes(cid).length > 0, "Certificate CID required");
        require(bytes(certificates[user][courseId].cid).length == 0, "Certificate already issued");

        certificates[user][courseId] = Certificate({
            cid:      cid,
            issuedAt: block.timestamp
        });

        emit CertificateIssued(user, courseId, cid);
    }

    /**
     * @notice Rút ETH về ví owner.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner).transfer(balance);
        emit Withdrawn(owner, balance);
    }

    // -----------------------------------------------------------------------
    // Write functions (User)
    // -----------------------------------------------------------------------

    /**
     * @notice Mua khoá học bằng ETH.
     */
    function purchaseCourse(uint256 courseId) external payable courseExists(courseId) {
        Course storage course = courses[courseId];
        require(course.active, "Course is not active");
        require(msg.value >= course.priceWei, "Insufficient ETH sent");
        require(!enrollments[msg.sender][courseId], "Already enrolled");

        enrollments[msg.sender][courseId] = true;

        emit CoursePurchased(msg.sender, courseId, msg.value);

        // Hoàn trả phần dư nếu gửi quá
        if (msg.value > course.priceWei) {
            payable(msg.sender).transfer(msg.value - course.priceWei);
        }
    }

    // -----------------------------------------------------------------------
    // Read functions (Public)
    // -----------------------------------------------------------------------

    function isEnrolled(address user, uint256 courseId) external view returns (bool) {
        return enrollments[user][courseId];
    }

    function getProgress(address user, uint256 courseId) external view returns (uint8) {
        return progressMap[user][courseId];
    }

    function getCertificate(address user, uint256 courseId)
        external view returns (string memory cid, uint256 issuedAt)
    {
        Certificate storage cert = certificates[user][courseId];
        return (cert.cid, cert.issuedAt);
    }

    function getCourse(uint256 courseId)
        external view returns (uint256 id, uint256 priceWei, string memory metadataCid, bool active)
    {
        Course storage c = courses[courseId];
        return (c.courseId, c.priceWei, c.metadataCid, c.active);
    }
}
