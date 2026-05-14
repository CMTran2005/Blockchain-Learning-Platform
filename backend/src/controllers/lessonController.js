const { db, admin }      = require('../config/firebase');
const { validateLesson } = require('../models/Lesson');
const { filterLesson, filterList } = require('../utils/responseFilter');

/**
 * GET /api/lessons/course/:courseId
 * Lấy tất cả bài học của một khoá học.
 */
const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const snapshot = await db.collection('lessons')
      .where('courseId', '==', courseId)
      .orderBy('order', 'asc')
      .get();

    const lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(filterList(lessons, filterLesson));

  } catch (error) {
    res.status(500).json({ message: 'Error retrieving lessons', error: error.message });
  }
};

/**
 * GET /api/lessons/:lessonId
 * Lấy chi tiết một bài học.
 */
const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const doc = await db.collection('lessons').doc(lessonId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Tăng lượt xem (lưu Firebase, không expose ra frontend)
    await doc.ref.update({ views: admin.firestore.FieldValue.increment(1) });

    res.status(200).json(filterLesson({ id: doc.id, ...doc.data() }));

  } catch (error) {
    res.status(500).json({ message: 'Error retrieving lesson', error: error.message });
  }
};

/**
 * POST /api/lessons
 * Tạo bài học mới (Admin/Instructor only).
 */
const createLesson = async (req, res) => {
  try {
    const { courseId, blockchainCourseId, title, order, videoUrl } = req.body;

    const errors = validateLesson(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const lessonId = `lesson_${courseId}_${Date.now()}`;

    const newLesson = {
      lessonId,
      courseId,
      blockchainCourseId: blockchainCourseId || null,
      title,
      description:        req.body.description || '',
      order,
      duration:           req.body.duration || 0,
      videoUrl:           videoUrl || '',
      videoProvider:      req.body.videoProvider || 'cloudinary',
      thumbnailUrl:       req.body.thumbnailUrl || '',
      content:            req.body.content || '',
      attachments:        req.body.attachments || [],
      quiz:               req.body.quiz || null,
      status:             'draft',
      isLocked:           req.body.isLocked || false,
      prerequisiteLesson: req.body.prerequisiteLesson || null,
      views:              0,
      createdAt:          new Date().toISOString(),
      updatedAt:          new Date().toISOString(),
      createdBy:          req.user?.walletAddress || 'admin',
    };

    await db.collection('lessons').doc(lessonId).set(newLesson);

    // Thêm lessonId vào course
    await db.collection('courses').doc(courseId).update({
      lessonIds: admin.firestore.FieldValue.arrayUnion(lessonId),
    });

    res.status(201).json({
      message: 'Lesson created successfully',
      ...filterLesson(newLesson),
    });

  } catch (error) {
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
};

/**
 * PUT /api/lessons/:lessonId
 * Cập nhật bài học.
 */
const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const errors = validateLesson(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    await db.collection('lessons').doc(lessonId).update({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Lesson updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating lesson', error: error.message });
  }
};

/**
 * DELETE /api/lessons/:lessonId
 * Xoá bài học.
 */
const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const doc = await db.collection('lessons').doc(lessonId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const { courseId } = doc.data();
    await db.collection('lessons').doc(lessonId).delete();

    await db.collection('courses').doc(courseId).update({
      lessonIds: admin.firestore.FieldValue.arrayRemove(lessonId),
    });

    res.status(200).json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lesson', error: error.message });
  }
};

/**
 * PATCH /api/lessons/:lessonId/publish
 * Publish bài học.
 */
const publishLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    await db.collection('lessons').doc(lessonId).update({
      status:    'published',
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Lesson published successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error publishing lesson', error: error.message });
  }
};

module.exports = {
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  publishLesson,
};
