const hre = require("hardhat");
const coursesData = require("../../frontend/src/utils/courses.json");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Missing CONTRACT_ADDRESS in .env");
  }

  const BlockchainLearning = await hre.ethers.getContractFactory("BlockchainLearning");
  const contract = BlockchainLearning.attach(contractAddress);

  console.log("Seeding courses into contract at:", contractAddress);

  for (const course of coursesData) {
    try {
      const priceWei = hre.ethers.parseEther(course.priceEth.toString());
      // We use a dummy CID for now since we just need the course to exist
      const cid = "dummy_cid_for_course_" + course.id;
      
      const tx = await contract.createCourse(course.id, cid, priceWei);
      await tx.wait();
      
      console.log(`✅ Seeded Course ID ${course.id}: ${course.title}`);
    } catch (error) {
      if (error.message.includes("Course already exists")) {
        console.log(`⚠️ Course ID ${course.id} already exists, skipping.`);
      } else {
        console.error(`❌ Error seeding course ${course.id}:`, error.message);
      }
    }
  }
  
  console.log("Seeding complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
