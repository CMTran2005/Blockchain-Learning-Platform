const { Contract } = require('ethers');
const CourseAbi = require('./src/utils/CourseAbi.json');

const signer = {
  getAddress: async () => "0x123",
  provider: {
     call: async () => "0x0000000000000000000000000000000000000000000000000000000000000001"
  }
};
const contract = new Contract("0x0D0b8deF35B0C669b589f6f000349c879e015b1C", CourseAbi.abi, signer);

async function test() {
  try {
     const res = contract.isEnrolled("0x123", "abc1234");
     console.log("Returned:", res);
     const ok = await res;
  } catch(e) {
     console.error("Caught:", e.message);
  }
}
test();
