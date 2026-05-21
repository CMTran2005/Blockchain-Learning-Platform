const { db } = require('./src/config/firebase');

async function test() {
  try {
    const newCourse = {
      courseId: "123",
      blockchainCourseId: null,
      title: "12",
      description: "",
      instructor: "Test",
      price: null,
      category: "Programming",
      level: "beginner",
      duration: "12",
      imageUrl: "someurl",
      lessonIds: [],
      averageRating: 0,
      reviewCount: 0,
      enrolledCount: 0,
      certificateRewardable: false,
      tags: ["web3"],
      status: "active",
      metadataCid: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "admin",
    };

    await db.collection('courses').doc('123').set(newCourse);
    console.log("Success!");
  } catch (e) {
    console.error("THREW!", e);
  }
}
test();
