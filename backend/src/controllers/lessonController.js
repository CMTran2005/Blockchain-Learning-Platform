const { db, admin } = require('../config/firebase');
const { validateLesson } = require('../models/Lesson');

/**
 * Get all lessons for a course
 */
const getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const snapshot = await db.collection('lessons')
      .where('courseId', '==', courseId)
      .orderBy('order', 'asc')
      .get();

    const lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(lessons);

  } catch (error) {
    res.status(500).json({ message: "Error retrieving lessons", error: error.message });
  }
};

/**
 * Get lesson by ID
 */
const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const doc = await db.collection('lessons').doc(lessonId).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    // Increment views
    await doc.ref.update({ views: admin.firestore.FieldValue.increment(1) });

    res.status(200).json({ id: doc.id, ...doc.data() });

  } catch (error) {
    res.status(500).json({ message: "Error retrieving lesson", error: error.message });
  }
};

/**
 * Create new lesson (Instructor only)
 */
const createLesson = async (req, res) => {
  try {
    const { courseId, blockchainCourseId, title, order, videoUrl } = req.body;

    // Validate
    const errors = validateLesson(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const lessonId = `lesson_${courseId}_${Date.now()}`;

    const newLesson = {
      lessonId: lessonId,
      courseId: courseId,
      blockchainCourseId: blockchainCourseId || null,
      title,
      description: req.body.description || '',
      order,
      duration: req.body.duration || 0,
      videoUrl: videoUrl || '',
      videoProvider: req.body.videoProvider || 'youtube', // 'youtube'|'vimeo'|'pinata'|'other'
      thumbnailCid: req.body.thumbnailCid || '',  // CID Pinata IPFS (dùng getIpfsUrl())
      content: req.body.content || '',
      transcript: req.body.transcript || '',
      // attachments gộp cả resources và file đính kèm
      // [{ name, url, type }] — url có thể là HTTP hoặc IPFS gateway
      attachments: req.body.attachments || [],
      quiz: req.body.quiz || null,
      status: 'draft',
      isLocked: req.body.isLocked || false,
      prerequisiteLesson: req.body.prerequisiteLesson || null,
      views: 0,
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user?.walletAddress || 'admin'
    };

    await db.collection('lessons').doc(lessonId).set(newLesson);

    // Add lesson to course's lessonIds
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.update({
      lessonIds: admin.firestore.FieldValue.arrayUnion(lessonId)
    });

    res.status(201).json({ 
      id: lessonId, 
      message: "Lesson created successfully", 
      ...newLesson 
    });

  } catch (error) {
    res.status(500).json({ message: "Error creating lesson", error: error.message });
  }
};

/**
 * Update lesson
 */
const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const errors = validateLesson(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await db.collection('lessons').doc(lessonId).update(updateData);
    res.status(200).json({ message: "Lesson updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error updating lesson", error: error.message });
  }
};

/**
 * Delete lesson
 */
const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const doc = await db.collection('lessons').doc(lessonId).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const { courseId } = doc.data();

    // Delete lesson
    await db.collection('lessons').doc(lessonId).delete();

    // Remove from course's lessonIds
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.update({
      lessonIds: admin.firestore.FieldValue.arrayRemove(lessonId)
    });

    res.status(200).json({ message: "Lesson deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting lesson", error: error.message });
  }
};

/**
 * Like a lesson
 */
const likeLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    await db.collection('lessons').doc(lessonId).update({
      likes: admin.firestore.FieldValue.increment(1)
    });

    res.status(200).json({ message: "Lesson liked successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error liking lesson", error: error.message });
  }
};

/**
 * Publish lesson
 */
const publishLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    await db.collection('lessons').doc(lessonId).update({
      status: 'published',
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: "Lesson published successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error publishing lesson", error: error.message });
  }
};

module.exports = {
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  likeLesson,
  publishLesson
};
