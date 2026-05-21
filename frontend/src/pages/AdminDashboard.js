import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchCourses, createCourse, updateCourse, deleteCourse,
  uploadMedia, uploadVideoToPinata, fetchNextBlockchainId, isAdmin,
} from '../utils/api';

const CATEGORIES = ['Programming', 'Security', 'Blockchain', 'AI/ML', 'Design', 'Marketing', 'Gaming', 'Finance', 'Business'];
const LEVELS     = ['beginner', 'intermediate', 'advanced'];

const emptyCourse = {
  title: '', description: '', instructor: '', price: 0, priceEth: '0',
  category: 'Programming', level: 'beginner', duration: '', tags: '',
  imageUrl: '', videoUrl: '', videoCid: '', videoProvider: 'youtube', blockchainCourseId: null,
};

const AdminDashboard = ({ account, showToast }) => {
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [formOpen, setFormOpen]   = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [formData, setFormData]   = useState({ ...emptyCourse });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [saving, setSaving]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const adminOk = isAdmin(account);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoFileName(file.name);
  };

  const handleEdit = (course) => {
    setFormData({
      title: course.title || '',
      description: course.description || '',
      instructor: course.instructor || '',
      price: course.price || parseFloat(course.priceEth) || 0,
      priceEth: course.priceEth || String(course.price || '0'),
      category: course.category || 'Programming',
      level: course.level || 'beginner',
      duration: course.duration || '',
      tags: (course.tags || []).join(', '),
      imageUrl: course.image || course.imageUrl || '',
      videoUrl: course.videoUrl || '',
      videoCid: course.videoCid || '',
      videoProvider: course.videoProvider || 'youtube',
      blockchainCourseId: course.blockchainCourseId ?? null,
      courseId: course.courseId || `course_${course.id}`,
    });
    setImagePreview(course.image || course.imageUrl || '');
    setImageFile(null);
    setVideoFile(null);
    setVideoFileName('');
    setEditMode(true);
    setFormOpen(true);
  };

  const handleCreate = async () => {
    let nextChainId = courses.reduce((max, c) => Math.max(max, c.blockchainCourseId || 0), 0) + 1;
    try {
      nextChainId = await fetchNextBlockchainId();
    } catch {
      // fallback to local max + 1
    }
    setFormData({ ...emptyCourse, blockchainCourseId: nextChainId });
    setImagePreview('');
    setImageFile(null);
    setVideoFile(null);
    setVideoFileName('');
    setEditMode(false);
    setFormOpen(true);
  };

  const handleDelete = async (course) => {
    try {
      await deleteCourse(course.courseId || `course_${course.id}`, account);
      showToast(`Deleted: ${course.title}`, 'success');
      setDeleteConfirm(null);
      loadCourses();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminOk) { showToast('Admin access required', 'error'); return; }
    setSaving(true);

    try {
      let imageUrl = formData.imageUrl;
      let videoUrl = formData.videoUrl;
      let videoCid = formData.videoCid || '';
      let videoProvider = formData.videoProvider;

      if (imageFile) {
        try {
          const result = await uploadMedia(imageFile, 'courses');
          imageUrl = result.url;
        } catch (uploadErr) {
          showToast('Image upload failed — using URL if provided.', 'info');
        }
      }

      if (videoFile) {
        try {
          if (videoProvider === 'pinata') {
            showToast('Uploading video to Pinata IPFS...', 'info');
            const result = await uploadVideoToPinata(videoFile, 'courses');
            videoUrl = result.url;
            videoCid = result.cid;
            videoProvider = 'pinata';
          } else {
            showToast('Uploading video to Cloudinary...', 'info');
            const result = await uploadMedia(videoFile, 'courses');
            videoUrl = result.url;
            videoProvider = 'cloudinary';
          }
        } catch (uploadErr) {
          showToast(uploadErr.message || 'Video upload failed', 'error');
          setSaving(false);
          return;
        }
      }

      const coursePayload = {
        title:              formData.title,
        description:        formData.description,
        instructor:         formData.instructor,
        price:              parseFloat(formData.price),
        category:           formData.category,
        level:              formData.level,
        duration:           formData.duration,
        imageUrl,
        videoUrl,
        videoCid,
        videoProvider,
        tags:               formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        blockchainCourseId: formData.blockchainCourseId ? parseInt(formData.blockchainCourseId, 10) : null,
      };

      if (editMode) {
        await updateCourse(formData.courseId, coursePayload, account);
        showToast('Course updated successfully!', 'success');
      } else {
        const created = await createCourse(coursePayload, account);
        if (created.onChainWarning) {
          showToast(`Saved off-chain: ${created.onChainWarning}`, 'info');
        } else if (created.contractTx) {
          showToast(`Course #${created.blockchainCourseId} registered on blockchain!`, 'success');
        } else {
          showToast('Course created successfully!', 'success');
        }
      }

      setFormOpen(false);
      loadCourses();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!account) return (
    <div className="empty-page">
      <div className="empty-icon">🔗</div>
      <h2>Connect your wallet to access Admin Dashboard</h2>
    </div>
  );

  if (!adminOk) return (
    <div className="empty-page">
      <div className="empty-icon">🚫</div>
      <h2>Access Denied</h2>
      <p style={{ color: 'var(--text-muted)' }}>Your wallet is not authorized as admin.</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
        Wallet: {account}
      </p>
    </div>
  );

  const totalStudents = courses.reduce((s, c) => s + (c.studentsEnrolled || 0), 0);
  const totalEth = courses.reduce((s, c) => s + parseFloat(c.priceEth || 0), 0).toFixed(3);

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">🛠 Admin Dashboard</h1>
          <p className="admin-subtitle">Manage courses, lessons, and platform content</p>
        </div>
        <button className="btn-admin-create" onClick={handleCreate}>
          + Create Course
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-icon">📚</span>
          <div>
            <div className="admin-stat-value">{courses.length}</div>
            <div className="admin-stat-label">Total Courses</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">👥</span>
          <div>
            <div className="admin-stat-value">{totalStudents.toLocaleString()}</div>
            <div className="admin-stat-label">Total Students</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">⟠</span>
          <div>
            <div className="admin-stat-value">{totalEth} ETH</div>
            <div className="admin-stat-label">Course Value</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">🟢</span>
          <div>
            <div className="admin-stat-value">{courses.filter(c => c.status === 'active' || !c.status).length}</div>
            <div className="admin-stat-label">Active</div>
          </div>
        </div>
      </div>

      {/* Course Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Students</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="admin-loading">Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan="8" className="admin-loading">No courses found. Create your first course!</td></tr>
            ) : (
              courses.map(course => (
                <tr key={course.id || course.courseId}>
                  <td className="admin-td-id">{course.id}</td>
                  <td>
                    <img src={course.image || course.imageUrl} alt="" className="admin-thumb" />
                  </td>
                  <td className="admin-td-title">{course.title}</td>
                  <td>
                    <span className="admin-cat-badge">{course.category}</span>
                  </td>
                  <td className="admin-td-price">⟠ {course.priceEth} ETH</td>
                  <td>{(course.studentsEnrolled || 0).toLocaleString()}</td>
                  <td>⭐ {course.rating}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn-admin-edit" onClick={() => handleEdit(course)} title="Edit">
                        ✏️
                      </button>
                      <button className="btn-admin-delete" onClick={() => setDeleteConfirm(course)} title="Delete">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {formOpen && (
        <div className="admin-modal-overlay" onClick={() => !saving && setFormOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editMode ? '✏️ Edit Course' : '➕ Create New Course'}</h2>
              <button className="admin-modal-close" onClick={() => !saving && setFormOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-grid">
                <div className="admin-form-group full">
                  <label>Title *</label>
                  <input name="title" value={formData.title} onChange={handleInputChange} required placeholder="Enter course title" />
                </div>

                <div className="admin-form-group full">
                  <label>Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Course description..." />
                </div>

                <div className="admin-form-group">
                  <label>Instructor *</label>
                  <input name="instructor" value={formData.instructor} onChange={handleInputChange} required placeholder="Instructor name" />
                </div>

                <div className="admin-form-group">
                  <label>Price (ETH) *</label>
                  <input name="price" type="number" step="0.001" min="0" value={formData.price} onChange={handleInputChange} required />
                </div>

                <div className="admin-form-group">
                  <label>Category *</label>
                  <select name="category" className="admin-form-select" value={formData.category} onChange={handleInputChange}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Level</label>
                  <select name="level" className="admin-form-select" value={formData.level} onChange={handleInputChange}>
                    {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Duration</label>
                  <input name="duration" value={formData.duration} onChange={handleInputChange} placeholder="e.g. 12 hours" />
                </div>

                <div className="admin-form-group">
                  <label>Blockchain Course ID</label>
                  <input name="blockchainCourseId" type="number" min="1" value={formData.blockchainCourseId || ''} onChange={handleInputChange} placeholder="Auto-assigned" />
                </div>

                <div className="admin-form-group full">
                  <label>Tags (comma-separated)</label>
                  <input name="tags" value={formData.tags} onChange={handleInputChange} placeholder="blockchain, solidity, web3" />
                </div>

                {/* Image Upload */}
                <div className="admin-form-group full">
                  <label>Course Image</label>
                  <div className="admin-upload-area">
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="admin-image-preview" />
                    )}
                    <div className="admin-upload-controls">
                      <input type="file" accept="image/*" onChange={handleImageSelect} id="image-upload" className="admin-file-input" />
                      <label htmlFor="image-upload" className="btn-admin-upload">
                        📁 Choose Image File
                      </label>
                      <span className="admin-upload-or">OR</span>
                      <input name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="Paste image URL directly" className="admin-url-input" />
                    </div>
                  </div>
                </div>

                {/* Video URL */}
                <div className="admin-form-group full">
                  <label>Course Video</label>
                  <div className="admin-upload-area admin-media-panel">
                    <div className="admin-video-type-row">
                      <select name="videoProvider" value={formData.videoProvider} onChange={handleInputChange} className="admin-form-select admin-video-select">
                        <option value="youtube">YouTube Embed URL</option>
                        <option value="vimeo">Vimeo Embed URL</option>
                        <option value="pinata">Upload file → Pinata IPFS</option>
                        <option value="cloudinary">Upload file → Cloudinary</option>
                      </select>
                    </div>

                    {(formData.videoProvider === 'pinata' || formData.videoProvider === 'cloudinary') && (
                      <div className="admin-upload-controls">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime"
                          onChange={handleVideoSelect}
                          id="video-upload"
                          className="admin-file-input"
                        />
                        <label htmlFor="video-upload" className="btn-admin-upload">🎬 Choose Video File</label>
                        {videoFileName && <span className="admin-file-name">{videoFileName}</span>}
                      </div>
                    )}

                    <span className="admin-upload-or">OR paste URL</span>
                    <input
                      name="videoUrl"
                      value={formData.videoUrl}
                      onChange={handleInputChange}
                      placeholder={
                        formData.videoProvider === 'youtube'
                          ? 'https://www.youtube.com/embed/VIDEO_ID'
                          : formData.videoProvider === 'vimeo'
                            ? 'https://player.vimeo.com/video/...'
                            : 'Pinata gateway or Cloudinary URL'
                      }
                      className="admin-url-input full-width"
                    />
                    {formData.videoCid && <p className="admin-cid-hint">IPFS CID: {formData.videoCid}</p>}
                  </div>
                </div>
              </div>

              <div className="admin-form-actions">
                <button type="button" className="btn-admin-cancel" onClick={() => setFormOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin-save" disabled={saving}>
                  {saving ? <span className="loader-sm" /> : (editMode ? 'Update Course' : 'Publish Course')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-delete-icon">⚠️</div>
            <h3>Delete Course?</h3>
            <p>Are you sure you want to delete "<strong>{deleteConfirm.title}</strong>"? This action cannot be undone.</p>
            <div className="admin-delete-actions">
              <button className="btn-admin-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-admin-delete-confirm" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
