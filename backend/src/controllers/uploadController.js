/**
 * Upload Controller
 * Xử lý upload file (ảnh, video, PDF, ZIP...) lên Pinata IPFS.
 *
 * Các route sử dụng controller này:
 *   POST /api/upload/file    — upload một file
 *   POST /api/upload/json    — upload JSON metadata (dùng cho NFT certificate...)
 */

const { uploadFileToPinata, uploadJSONToPinata, getIpfsUrl } = require('../config/pinata');

// File size limit: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Các loại MIME được chấp nhận
const ALLOWED_MIME_TYPES = [
  // Ảnh
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Video
  'video/mp4', 'video/webm', 'video/ogg',
  // Tài liệu
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
  'application/json',
  'text/plain', 'text/markdown',
];

/**
 * POST /api/upload/file
 * Upload một file lên Pinata IPFS.
 *
 * Request: multipart/form-data
 *   - file: file cần upload
 *   - folder (optional): tên nhóm/thư mục trên Pinata (vd: 'avatars', 'lessons')
 *
 * Response 200:
 *   { cid, url, fileName, mimeType, size }
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const folder = req.body.folder || 'uploads';

    // Kiểm tra MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      return res.status(400).json({
        message: 'File type not allowed',
        allowedTypes: ALLOWED_MIME_TYPES,
      });
    }

    // Kiểm tra kích thước
    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({
        message: `File size exceeds limit (max: ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      });
    }

    const { cid, url } = await uploadFileToPinata(buffer, originalname, folder);

    res.status(200).json({
      message: 'File uploaded successfully',
      cid,
      url,
      fileName: originalname,
      mimeType: mimetype,
      size,
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({
      message: 'Failed to upload file to Pinata',
      error: error.message,
    });
  }
};

/**
 * POST /api/upload/json
 * Upload JSON metadata lên Pinata IPFS.
 * Dùng cho: certificate metadata, NFT metadata, course metadata...
 *
 * Request body (application/json):
 *   { name: string, data: object }
 *
 * Response 200:
 *   { cid, url }
 */
const uploadJSON = async (req, res) => {
  try {
    const { name, data } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: 'data (object) is required in request body' });
    }

    const { cid, url } = await uploadJSONToPinata(data, name || 'metadata');

    res.status(200).json({
      message: 'JSON uploaded successfully',
      cid,
      url,
    });

  } catch (error) {
    console.error('JSON upload error:', error.message);
    res.status(500).json({
      message: 'Failed to upload JSON to Pinata',
      error: error.message,
    });
  }
};

/**
 * GET /api/upload/url/:cid
 * Chuyển CID thành URL đầy đủ của Pinata Gateway.
 * Tiện cho frontend khi chỉ lưu CID trong database.
 */
const getCidUrl = (req, res) => {
  const { cid } = req.params;
  if (!cid) {
    return res.status(400).json({ message: 'CID is required' });
  }
  res.status(200).json({ cid, url: getIpfsUrl(cid) });
};

module.exports = { uploadFile, uploadJSON, getCidUrl };
