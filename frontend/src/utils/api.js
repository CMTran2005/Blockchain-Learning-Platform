/**
 * API Service Layer
 * Central module for all Backend API calls.
 * Falls back to courses.json when API is unavailable.
 */
import coursesDataFallback from './courses.json';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const apiRequest = async (path, options = {}) => {
  const { headers: customHeaders = {}, ...fetchOptions } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...customHeaders,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API request failed');
  }
  return res.json();
};

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

/**
 * Fetch all courses from API. Falls back to courses.json on error.
 */
export const fetchCourses = async () => {
  try {
    const data = await apiRequest('/api/courses');
    if (!data || data.length === 0) return normalizeCourses(coursesDataFallback);
    return normalizeCourses(data);
  } catch (err) {
    console.warn('API unavailable, using fallback data:', err.message);
    return normalizeCourses(coursesDataFallback);
  }
};

/**
 * Fetch single course by Firebase doc id, blockchain course id, or courses.json id.
 */
export const fetchCourseById = async (id) => {
  const idStr = String(id);

  // 1) Firestore document id (e.g. 21bhW5v5PfcFGLWFVhEq)
  try {
    const data = await apiRequest(`/api/courses/${encodeURIComponent(idStr)}`);
    return normalizeCourse(data);
  } catch {
    // continue
  }

  // 2) Blockchain numeric id or match from course list
  try {
    const all = await fetchCourses();
    const numId = Number(idStr);
    const found = all.find(
      (c) =>
        c.courseId === idStr ||
        c.blockchainCourseId === numId ||
        c.id === numId ||
        String(c.id) === idStr
    );
    if (found) return found;
  } catch (err) {
    console.warn('fetchCourseById list lookup failed:', err.message);
  }

  // 3) Static fallback
  const fallback = coursesDataFallback.find((c) => c.id === parseInt(idStr, 10));
  return fallback ? normalizeCourse(fallback) : null;
};

/**
 * Normalize API course data to match the format our components expect.
 * Handles both Firebase format and courses.json format.
 */
const PINATA_GATEWAY = process.env.REACT_APP_PINATA_GATEWAY || 'https://gateway.pinata.cloud';

/** Build playable video URL from stored fields. */
export const getIpfsVideoUrl = (videoUrl, videoCid) => {
  if (videoUrl) return videoUrl;
  if (videoCid) {
    if (videoCid.startsWith('http')) return videoCid;
    return `${PINATA_GATEWAY}/ipfs/${videoCid}`;
  }
  return '';
};

const normalizeCourse = (c) => {
  if (!c) return null;
  const chainId = c.blockchainCourseId != null ? c.blockchainCourseId : null;
  const fallbackId = c.id ?? c.courseId;
  const web3Purchasable = chainId != null && !isNaN(Number(chainId));

  return {
    ...c,
    id: web3Purchasable ? chainId : fallbackId,
    blockchainCourseId: chainId,
    web3Purchasable,
    title: c.title,
    description: c.description,
    instructor: c.instructor,
    priceEth: c.priceEth || String(c.price ?? '0'),
    image: c.imageUrl || c.image || 'https://images.unsplash.com/photo-1639762681485-074b7f4aec4a?w=800&q=80',
    videoUrl: c.videoUrl || '',
    videoProvider: c.videoProvider || 'youtube',
    videoCid: c.videoCid || '',
    category: c.category,
    rating: c.averageRating || c.rating || 0,
    duration: c.duration || '0 hours',
    studentsEnrolled: c.enrolledCount || c.studentsEnrolled || 0,
    tags: c.tags || [],
    courseId: c.courseId || (typeof fallbackId === 'string' ? fallbackId : `course_${fallbackId}`),
  };
};

const normalizeCourses = (list) => list.map(normalizeCourse);

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

/**
 * Fetch lessons for a course.
 */
export const fetchLessonsByCourse = async (courseId) => {
  try {
    return await apiRequest(`/api/lessons/course/${courseId}`);
  } catch (err) {
    console.warn('Failed to fetch lessons:', err.message);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Admin — Course CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new course (admin only).
 */
export const createCourse = async (courseData, walletAddress) => {
  return apiRequest('/api/courses', {
    method: 'POST',
    headers: { 'x-wallet-address': walletAddress },
    body: JSON.stringify(courseData),
  });
};

/**
 * Update an existing course (admin only).
 */
export const updateCourse = async (courseId, courseData, walletAddress) => {
  return apiRequest(`/api/courses/${courseId}`, {
    method: 'PUT',
    headers: { 'x-wallet-address': walletAddress },
    body: JSON.stringify(courseData),
  });
};

/**
 * Delete a course (admin only).
 */
export const deleteCourse = async (courseId, walletAddress) => {
  return apiRequest(`/api/courses/${courseId}`, {
    method: 'DELETE',
    headers: { 'x-wallet-address': walletAddress },
  });
};

// ---------------------------------------------------------------------------
// Upload — Cloudinary & Pinata
// ---------------------------------------------------------------------------

/**
 * Upload a media file (image/video) to Cloudinary via backend.
 * @param {File} file
 * @param {string} folder — e.g. 'courses', 'avatars'
 * @returns {{ url, publicId, resourceType }}
 */
/**
 * Upload video file to Pinata IPFS.
 * @returns {{ cid, url, fileName }}
 */
export const uploadVideoToPinata = async (file, folder = 'courses') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch(`${API_URL}/api/upload/ipfs`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Pinata video upload failed');
  }
  return res.json();
};

/**
 * Fetch next available blockchain course id from backend.
 */
export const fetchNextBlockchainId = async () => {
  const data = await apiRequest('/api/courses/blockchain/next-id');
  return data.blockchainCourseId;
};

export const uploadMedia = async (file, folder = 'courses') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch(`${API_URL}/api/upload/media`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Upload failed');
  }
  return res.json();
};

/**
 * Check if a wallet address is an admin.
 */
export const isAdmin = (walletAddress) => {
  if (!walletAddress) return false;
  const admins = (process.env.REACT_APP_ADMIN_ADDRESSES || '').split(',').map(a => a.trim().toLowerCase());
  return admins.includes(walletAddress.toLowerCase());
};
