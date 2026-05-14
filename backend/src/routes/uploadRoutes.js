/**
 * Upload Routes
 * /api/upload — Upload file / JSON lên Pinata IPFS
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();

const { uploadFile, uploadJSON, getCidUrl } = require('../controllers/uploadController');

// Multer: lưu vào memory (không ghi ra disk), để pass Buffer cho Pinata
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// POST /api/upload/file — upload một file
router.post('/file', upload.single('file'), uploadFile);

// POST /api/upload/json — upload JSON metadata
router.post('/json', uploadJSON);

// GET /api/upload/url/:cid — lấy URL từ CID
router.get('/url/:cid', getCidUrl);

module.exports = router;
