/**
 * Seed Firestore with courses from courses.json
 * Run once: node scripts/seedFirestore.js
 */
require('dotenv').config();
const { db } = require('../src/config/firebase');
const coursesData = require('../../frontend/src/utils/courses.json');

async function seed() {
  if (!db) {
    console.error('❌ Firebase Firestore not connected. Add serviceAccountKey.json first.');
    process.exit(1);
  }

  console.log(`\n🌱 Seeding ${coursesData.length} courses into Firestore...\n`);

  const batch = db.batch();

  for (const course of coursesData) {
    const docRef = db.collection('courses').doc(`course_${course.id}`);

    const doc = {
      courseId:             `course_${course.id}`,
      blockchainCourseId:  course.id,
      title:               course.title,
      description:         course.description,
      instructor:          course.instructor,
      price:               parseFloat(course.priceEth),
      priceEth:            course.priceEth,
      category:            course.category,
      level:               'beginner',
      duration:            course.duration,
      imageUrl:            course.image,
      videoUrl:            course.videoUrl || '',
      videoProvider:        course.videoUrl?.includes('youtube') ? 'youtube' : 'cloudinary',
      lessonIds:           [],
      averageRating:       course.rating,
      reviewCount:         0,
      enrolledCount:       course.studentsEnrolled || 0,
      certificateRewardable: true,
      tags:                course.tags || [],
      status:              'active',
      metadataCid:         '',
      createdAt:           new Date().toISOString(),
      updatedAt:           new Date().toISOString(),
      createdBy:           'admin',
    };

    batch.set(docRef, doc);
    console.log(`   ✅ course_${course.id}: ${course.title}`);
  }

  await batch.commit();
  console.log(`\n🎉 Successfully seeded ${coursesData.length} courses!\n`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
