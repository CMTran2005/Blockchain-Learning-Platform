const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:7545');

// adminWallet dùng để server ký giao dịch on-chain (nếu cần).
// Nếu PRIVATE_KEY chưa được cấu hình trong .env, server vẫn khởi động bình thường
// nhưng các tính năng cần ký giao dịch sẽ không hoạt động.
let adminWallet = null;
try {
  if (process.env.PRIVATE_KEY && !process.env.PRIVATE_KEY.includes('your_ganache')) {
    adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('✅ Blockchain wallet connected:', adminWallet.address);
  } else {
    console.warn('⚠️  PRIVATE_KEY not configured — blockchain signing disabled');
  }
} catch (err) {
  console.warn('⚠️  Blockchain wallet init failed:', err.shortMessage || err.message);
}

module.exports = { provider, adminWallet };