/**
 * Upload Controller
 * Phân luồng upload theo kiến trúc 4-service:
 *
 *  POST /api/upload/media  → Cloudinary (video, ảnh, PDF, slides...)
 *  POST /api/upload/json   → Pinata IPFS (metadata JSON: course snapshot, certificate)
 *  GET  /api/upload/ipfs/:cid → Chuyển CID thành URL Pinata Gateway
 */

const { uploadToCloudinary, MEDIA_CONFIG, getResourceType } = require('../config/cloudinary');
const { uploadJSONToPinata, uploadFileToPinata, getIpfsUrl } = require('../config/pinata');

// Tổng hợp tất cả MIME types được chấp nhận
const ALL_ALLOWED_MIMES = Object.values(MEDIA_CONFIG).flatMap(c => c.mimeTypes);
const MAX_SIZE_BYTES     = 500 * 1024 * 1024; // 500 MB hard limit

// ---------------------------------------------------------------------------
// POST /api/upload/media
// Upload file media (video, ảnh, PDF...) lên Cloudinary.
//
// Request: multipart/form-data
//   - file   : file cần upload
//   - folder : thư mục trên Cloudinary (vd: 'avatars', 'lessons', 'courses')
//
// Response 200: { url, publicId, resourceType, fileName, mimeType, size }
// ---------------------------------------------------------------------------
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const folder = req.body.folder || 'uploads';

    // Kiểm tra MIME type
    if (!ALL_ALLOWED_MIMES.includes(mimetype)) {
      return res.status(400).json({
        message: 'File type not allowed',
        allowedTypes: ALL_ALLOWED_MIMES,
      });
    }

    // Kiểm tra kích thước
    if (size > MAX_SIZE_BYTES) {
      return res.status(400).json({
        message: `File size exceeds limit (max: ${MAX_SIZE_BYTES / 1024 / 1024}MB)`,
      });
    }

    const result = await uploadToCloudinary(buffer, originalname, folder, mimetype);

    res.status(200).json({
      message: 'File uploaded to Cloudinary successfully',
      url:          result.url,
      publicId:     result.publicId,
      resourceType: result.resourceType,
      fileName:     originalname,
      mimeType:     mimetype,
      size,
    });

  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    res.status(500).json({
      message: 'Failed to upload file to Cloudinary',
      error: error.message,
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/upload/json
// Upload JSON metadata lên Pinata IPFS.
// Dùng cho: certificate metadata, course snapshot (ghi vào smart contract).
//
// Request body (application/json):
//   { name: string, data: object }
//
// Response 200: { cid, url }
// ---------------------------------------------------------------------------
const uploadJSON = async (req, res) => {
  try {
    const { name, data } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: 'data (object) is required in request body' });
    }

    const { cid, url } = await uploadJSONToPinata(data, name || 'metadata');

    res.status(200).json({
      message: 'JSON metadata uploaded to Pinata IPFS successfully',
      cid,
      url,
    });

  } catch (error) {
    console.error('Pinata JSON upload error:', error.message);
    res.status(500).json({
      message: 'Failed to upload JSON to Pinata',
      error: error.message,
    });
  }
};

// ---------------------------------------------------------------------------
// GET /api/upload/ipfs/:cid
// Chuyển CID Pinata thành URL đầy đủ.
// ---------------------------------------------------------------------------
const getCidUrl = (req, res) => {
  const { cid } = req.params;
  if (!cid) {
    return res.status(400).json({ message: 'CID is required' });
  }
  res.status(200).json({ cid, url: getIpfsUrl(cid) });
};

// ---------------------------------------------------------------------------
// POST /api/upload/ipfs
// Upload file (video, etc.) lên Pinata IPFS.
//
// Request: multipart/form-data — file, optional folder
// Response 200: { cid, url, fileName, mimeType, size }
// ---------------------------------------------------------------------------
const VIDEO_MIMES = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
];

const uploadIpfs = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const folder = req.body.folder || 'courses';

    if (!VIDEO_MIMES.includes(mimetype)) {
      return res.status(400).json({
        message: 'Only video files are allowed for IPFS upload',
        allowedTypes: VIDEO_MIMES,
      });
    }

    if (size > MAX_SIZE_BYTES) {
      return res.status(400).json({
        message: `File size exceeds limit (max: ${MAX_SIZE_BYTES / 1024 / 1024}MB)`,
      });
    }

    const { cid, url } = await uploadFileToPinata(buffer, originalname, folder);

    res.status(200).json({
      message: 'Video uploaded to Pinata IPFS successfully',
      cid,
      url,
      fileName: originalname,
      mimeType: mimetype,
      size,
    });
  } catch (error) {
    console.error('Pinata file upload error:', error.message);
    res.status(500).json({
      message: 'Failed to upload file to Pinata',
      error: error.message,
    });
  }
};

module.exports = { uploadMedia, uploadJSON, uploadIpfs, getCidUrl };
