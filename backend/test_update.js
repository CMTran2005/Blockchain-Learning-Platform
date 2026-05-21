const { db } = require('./src/config/firebase');

async function test() {
  try {
    const safeUpdate = {
        title: "12",
        description: "",
        instructor: "Test",
        price: 2,
        category: "Programming",
        level: "beginner",
        duration: "12",
        imageUrl: "some-url",
        videoUrl: "https://www.youtube.com/embed/YS4e4q9oBaU",
        videoProvider: "youtube",
        tags: ["web3"],
        blockchainCourseId: null,
    };
    
    await db.collection('courses').doc('m8JNBwSWPtpF7cmeJ7uL').update({
      ...safeUpdate,
      updatedAt: new Date().toISOString(),
    });
    console.log("Update Success!");
  } catch(e) {
    console.error("UPDATE THREW!", e);
  }
}
test();
