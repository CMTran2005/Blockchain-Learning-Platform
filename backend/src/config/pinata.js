/**
 * Pinata IPFS Configuration
 * Dùng để upload file (ảnh, video, PDF...) lên IPFS thay cho Cloudinary.
 * File được lưu vĩnh viễn trên mạng IPFS, truy cập qua Pinata Gateway.
 *
 * Docs: https://docs.pinata.cloud/api-reference/introduction
 */

const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY  = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

// ---------------------------------------------------------------------------
// Helper: lấy headers dùng JWT (ưu tiên) hoặc API Key/Secret
// ---------------------------------------------------------------------------
const getHeaders = (extra = {}) => {
  if (process.env.PINATA_JWT) {
    return { Authorization: `Bearer ${process.env.PINATA_JWT}`, ...extra };
  }
  return {
    pinata_api_key: process.env.PINATA_API_KEY,
    pinata_secret_api_key: process.env.PINATA_API_SECRET,
    ...extra,
  };
};

// ---------------------------------------------------------------------------
// uploadFileToPinata — upload Buffer hoặc Stream
// @param {Buffer|ReadableStream} fileBuffer  - nội dung file
// @param {string}               fileName     - tên file gốc (vd: "avatar.png")
// @param {string}               [folder]     - tên nhóm/thư mục trên Pinata
// @returns {Promise<{ cid: string, url: string }>}
// ---------------------------------------------------------------------------
const uploadFileToPinata = async (fileBuffer, fileName, folder = 'uploads') => {
  const form = new FormData();
  form.append('file', fileBuffer, { filename: fileName });

  // Metadata tuỳ chọn — giúp quản lý file trên Pinata dashboard
  form.append(
    'pinataMetadata',
    JSON.stringify({ name: `${folder}/${fileName}` })
  );

  // Ghim file vĩnh viễn
  form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const response = await axios.post(
    `${PINATA_API_URL}/pinning/pinFileToIPFS`,
    form,
    { headers: { ...getHeaders(), ...form.getHeaders() } }
  );

  const cid = response.data.IpfsHash;
  return {
    cid,
    url: `${PINATA_GATEWAY}/ipfs/${cid}`,
  };
};

// ---------------------------------------------------------------------------
// uploadJSONToPinata — upload object JSON (metadata NFT, course info...)
// @param {object} jsonData
// @param {string} [name]
// @returns {Promise<{ cid: string, url: string }>}
// ---------------------------------------------------------------------------
const uploadJSONToPinata = async (jsonData, name = 'metadata') => {
  const response = await axios.post(
    `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
    {
      pinataContent: jsonData,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    },
    { headers: getHeaders({ 'Content-Type': 'application/json' }) }
  );

  const cid = response.data.IpfsHash;
  return {
    cid,
    url: `${PINATA_GATEWAY}/ipfs/${cid}`,
  };
};

// ---------------------------------------------------------------------------
// getIpfsUrl — chuyển CID thành URL đầy đủ (dùng khi render ảnh/video)
// ---------------------------------------------------------------------------
const getIpfsUrl = (cid) => {
  if (!cid) return null;
  // Nếu đã là URL đầy đủ thì trả về luôn
  if (cid.startsWith('http')) return cid;
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
};

// ---------------------------------------------------------------------------
// testPinataConnection — kiểm tra kết nối khi server khởi động
// ---------------------------------------------------------------------------
const testPinataConnection = async () => {
  try {
    await axios.get(`${PINATA_API_URL}/data/testAuthentication`, {
      headers: getHeaders(),
    });
    console.log('✅ Pinata IPFS connected');
    return true;
  } catch (err) {
    console.warn('⚠️  Pinata connection failed:', err.response?.data?.error || err.message);
    return false;
  }
};

module.exports = {
  uploadFileToPinata,
  uploadJSONToPinata,
  getIpfsUrl,
  testPinataConnection,
  PINATA_GATEWAY,
};
