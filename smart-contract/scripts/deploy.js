require('dotenv').config();
const hre = require('hardhat');
const fs  = require('fs');
const path = require('path');

async function main() {
  console.log('\n🚀 Deploying BlockchainLearning contract...');
  console.log('   Network:', hre.network.name);
  console.log('   RPC:    ', process.env.RPC_URL || 'http://127.0.0.1:7545');

  const [deployer] = await hre.ethers.getSigners();
  console.log('   Deployer:', deployer.address);
  console.log('   Balance: ', hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Deploy
  const BlockchainLearning = await hre.ethers.getContractFactory('BlockchainLearning');
  const contract = await BlockchainLearning.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log('✅ BlockchainLearning deployed to:', contractAddress);

  // Lưu địa chỉ và ABI ra file để backend dùng
  const deployInfo = {
    contractAddress,
    network:    hre.network.name,
    deployedAt: new Date().toISOString(),
    deployer:   deployer.address,
  };

  // Ghi vào smart-contract/deployed.json
  const deployedPath = path.join(__dirname, '..', 'deployed.json');
  fs.writeFileSync(deployedPath, JSON.stringify(deployInfo, null, 2));
  console.log('📄 Deploy info saved to:', deployedPath);

  // Gợi ý cập nhật .env
  console.log('\n📋 Cập nhật backend/.env:');
  console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
  console.log('\n✅ Deploy hoàn tất!\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
