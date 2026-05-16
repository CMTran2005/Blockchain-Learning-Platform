/**
 * Cloudinary Configuration
 * Dùng để upload file media (video, ảnh, PDF...) lên Cloudinary CDN.
 *
 * Vai trò trong kiến trúc:
 *  - Cloudinary: lưu trữ file media lớn (video bài giảng, ảnh thumbnail, avatar, PDF)
 *  - Pinata IPFS: chỉ lưu metadata JSON bất biến (certificate, course snapshot)
 *  - Firebase: lưu URL Cloudinary và CID Pinata để tham chiếu
 *
 * Docs: https://cloudinary.com/documentation/node_integration
 */

const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ---------------------------------------------------------------------------
// ALLOWED_TYPES — phân loại resource_type cho Cloudinary
// ---------------------------------------------------------------------------
const MEDIA_CONFIG = {
  image: {
    resourceType: 'image',
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSizeMB: 10,
  },
  video: {
    resourceType: 'video',
    mimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    maxSizeMB: 500,
  },
  raw: {
    resourceType: 'raw',
    mimeTypes: [
      'application/pdf',
      'application/zip', 'application/x-zip-compressed',
      'text/plain', 'text/markdown',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxSizeMB: 100,
  },
};

/**
 * Xác định resourceType từ MIME type
 */
const getResourceType = (mimetype) => {
  for (const [, config] of Object.entries(MEDIA_CONFIG)) {
    if (config.mimeTypes.includes(mimetype)) return config.resourceType;
  }
  return 'auto';
};

// ---------------------------------------------------------------------------
// uploadToCloudinary — upload Buffer lên Cloudinary
// @param {Buffer}  buffer       - nội dung file
// @param {string}  fileName     - tên file gốc
// @param {string}  [folder]     - thư mục trên Cloudinary (vd: 'avatars', 'lessons')
// @param {string}  [mimetype]   - MIME type để xác định resourceType
// @returns {Promise<{ url: string, publicId: string, resourceType: string }>}
// ---------------------------------------------------------------------------
const uploadToCloudinary = async (buffer, fileName, folder = 'uploads', mimetype = '') => {
  const resourceType = getResourceType(mimetype) || 'auto';
  // Loại bỏ extension khỏi public_id (Cloudinary tự thêm)
  const publicId = `${folder}/${Date.now()}_${fileName.replace(/\.[^/.]+$/, '')}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false,
        use_filename: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          size: result.bytes,
        });
      }
    );
    uploadStream.end(buffer);
  });
};

// ---------------------------------------------------------------------------
// deleteFromCloudinary — xoá file khỏi Cloudinary
// @param {string} publicId
// @param {string} [resourceType] - 'image' | 'video' | 'raw'
// ---------------------------------------------------------------------------
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

// ---------------------------------------------------------------------------
// testCloudinaryConnection — kiểm tra kết nối khi server khởi động
// ---------------------------------------------------------------------------
const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connected:', process.env.CLOUDINARY_CLOUD_NAME);
    return true;
  } catch (err) {
    console.warn('⚠️  Cloudinary connection failed:', err.message);
    return false;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  testCloudinaryConnection,
  MEDIA_CONFIG,
  getResourceType,
};
