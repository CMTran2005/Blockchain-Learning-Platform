/**
 * Upload Routes
 * /api/upload — Phân luồng upload theo service:
 *   POST /api/upload/media    → Cloudinary (video, ảnh, PDF...)
 *   POST /api/upload/json     → Pinata IPFS (metadata JSON)
 *   GET  /api/upload/ipfs/:cid → Lấy URL từ CID Pinata
 */

const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const { uploadMedia, uploadJSON, getCidUrl } = require('../controllers/uploadController');

// Multer: lưu vào memory (pass Buffer trực tiếp cho Cloudinary / Pinata)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (cho video)
});

// POST /api/upload/media — upload file media lên Cloudinary
router.post('/media', upload.single('file'), uploadMedia);

// POST /api/upload/json  — upload JSON metadata lên Pinata IPFS
router.post('/json', uploadJSON);

// GET /api/upload/ipfs/:cid — chuyển CID thành URL Pinata Gateway
router.get('/ipfs/:cid', getCidUrl);

module.exports = router;
