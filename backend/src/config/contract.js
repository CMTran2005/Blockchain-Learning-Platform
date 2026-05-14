/**
 * Smart Contract Configuration
 * Kết nối tới BlockchainLearning smart contract trên EVM (Ganache/Testnet).
 *
 * Vai trò trong kiến trúc:
 *  - Smart Contract: lưu enrollment, progress, certificate on-chain (trustless)
 *  - Pinata: lưu metadata JSON, trả về CID được ghi vào contract
 *  - Firebase: lưu transactionHash để tham chiếu nhanh
 *
 * ABI tương ứng với: smart-contract/contracts/BlockchainLearning.sol
 */

const { ethers } = require('ethers');
const { provider, adminWallet } = require('./blockchain');
require('dotenv').config();

// ---------------------------------------------------------------------------
// ABI — Human-readable format (ethers.js v6)
// Đồng bộ với BlockchainLearning.sol
// ---------------------------------------------------------------------------
const CONTRACT_ABI = [
  // Events
  'event CourseCreated(uint256 indexed courseId, string metadataCid, uint256 priceWei)',
  'event CoursePurchased(address indexed buyer, uint256 indexed courseId, uint256 pricePaid)',
  'event ProgressUpdated(address indexed user, uint256 indexed courseId, uint8 progress)',
  'event CertificateIssued(address indexed user, uint256 indexed courseId, string cid)',

  // Write functions (cần adminWallet ký)
  'function createCourse(uint256 courseId, string calldata metadataCid, uint256 priceWei) external',
  'function purchaseCourse(uint256 courseId) external payable',
  'function updateProgress(address user, uint256 courseId, uint8 _progress) external',
  'function issueCertificate(address user, uint256 courseId, string calldata cid) external',
  'function withdraw() external',

  // Read functions (chỉ cần provider)
  'function isEnrolled(address user, uint256 courseId) external view returns (bool)',
  'function getProgress(address user, uint256 courseId) external view returns (uint8)',
  'function getCertificate(address user, uint256 courseId) external view returns (string memory cid, uint256 issuedAt)',
  'function getCourse(uint256 courseId) external view returns (uint256 id, uint256 priceWei, string memory metadataCid, bool active)',
  'function courseCount() external view returns (uint256)',
  'function owner() external view returns (address)',
];

// ---------------------------------------------------------------------------
// Khởi tạo contract instance
// ---------------------------------------------------------------------------
let contract = null;
let contractReadOnly = null;

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

try {
  if (CONTRACT_ADDRESS && !CONTRACT_ADDRESS.includes('your_contract')) {
    // Read-write instance (dùng adminWallet nếu có)
    const signer = adminWallet || provider;
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Read-only instance (dùng cho query công khai)
    contractReadOnly = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    console.log('✅ Smart Contract connected:', CONTRACT_ADDRESS);
  } else {
    console.warn('⚠️  CONTRACT_ADDRESS not configured — on-chain features disabled');
  }
} catch (err) {
  console.warn('⚠️  Contract init failed:', err.shortMessage || err.message);
}

// ---------------------------------------------------------------------------
// Helper: kiểm tra contract đã sẵn sàng chưa
// ---------------------------------------------------------------------------
const isContractReady = () => !!contract;

module.exports = {
  contract,
  contractReadOnly,
  CONTRACT_ABI,
  isContractReady,
};
