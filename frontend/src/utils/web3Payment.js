import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from './contract';

const EXPECTED_CHAIN_ID = process.env.REACT_APP_CHAIN_ID
  ? Number(process.env.REACT_APP_CHAIN_ID)
  : null;

/** Ensure contract bytecode exists at configured address on current MetaMask network. */
export const assertContractNetwork = async (provider) => {
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (!code || code === '0x') {
    const err = new Error('CONTRACT_NOT_DEPLOYED');
    err.userMessage = `No contract at ${CONTRACT_ADDRESS} on this network. Check CONTRACT_ADDRESS in contract.js matches your deploy.`;
    throw err;
  }

  if (EXPECTED_CHAIN_ID) {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== EXPECTED_CHAIN_ID) {
      const err = new Error('WRONG_CHAIN_ID');
      err.userMessage = `Chain ID mismatch: app expects ${EXPECTED_CHAIN_ID}, wallet is on ${network.chainId}. Update REACT_APP_CHAIN_ID in frontend/.env or MetaMask network settings.`;
      throw err;
    }
  }
};

/** Resolve numeric on-chain course id from normalized course object. */
export const resolveBlockchainCourseId = (course) => {
  const raw = course?.blockchainCourseId ?? course?.id;
  if (raw === null || raw === undefined || isNaN(Number(raw))) return null;
  return Number(raw);
};

/** Read course price & status from smart contract. */
export const fetchOnChainCourse = async (contract, courseId) => {
  try {
    const [id, priceWei, , active] = await contract.getCourse(courseId);
    if (Number(id) === 0) {
      const err = new Error('COURSE_NOT_ON_CHAIN');
      err.userMessage =
        `Course #${courseId} chưa có trên smart contract. Tạo lại trong Admin và xem backend log (Pinata + createCourse).`;
      throw err;
    }
    return {
      priceWei,
      priceEth: ethers.formatEther(priceWei),
      active,
    };
  } catch (err) {
    if (
      err.code === 'BAD_DATA' ||
      err.message?.includes('could not decode') ||
      err.message?.includes('value="0x"')
    ) {
      const decodeErr = new Error('CONTRACT_CALL_FAILED');
      decodeErr.userMessage =
        `Không đọc được course #${courseId} từ contract ${CONTRACT_ADDRESS}. Kiểm tra địa chỉ contract đã deploy đúng chưa, hoặc course chưa đăng ký on-chain.`;
      throw decodeErr;
    }
    throw err;
  }
};

/**
 * Purchase course using on-chain price (source of truth).
 * @returns {{ receipt, courseId, priceEth }}
 */
export const purchaseCourseOnChain = async (contract, course) => {
  const courseId = resolveBlockchainCourseId(course);
  if (!courseId) {
    const err = new Error('INVALID_BLOCKCHAIN_ID');
    err.userMessage =
      'Course chưa có Blockchain Course ID. Cập nhật trong Admin Dashboard.';
    throw err;
  }

  const onChain = await fetchOnChainCourse(contract, courseId);
  if (!onChain.active) {
    const err = new Error('COURSE_INACTIVE');
    err.userMessage = 'Course không active trên blockchain.';
    throw err;
  }

  const enrolled = await contract.isEnrolled(
    await contract.runner.getAddress(),
    courseId
  );
  if (enrolled) {
    const err = new Error('ALREADY_ENROLLED');
    err.userMessage = 'Bạn đã sở hữu course này rồi.';
    throw err;
  }

  const tx = await contract.purchaseCourse(courseId, { value: onChain.priceWei });
  const receipt = await tx.wait();
  return { receipt, courseId, priceEth: onChain.priceEth, txHash: tx.hash };
};

export const getWeb3PaymentErrorMessage = (err) => {
  if (err?.userMessage) return err.userMessage;
  if (err?.code === 'BAD_DATA' || err?.message?.includes('could not decode')) {
    return `Lỗi đọc smart contract. Kiểm tra CONTRACT_ADDRESS (${CONTRACT_ADDRESS}) và course đã đăng ký on-chain chưa.`;
  }
  if (err?.reason) return err.reason;
  if (err?.message?.includes('Insufficient ETH')) {
    return 'Không đủ ETH hoặc giá on-chain khác giá hiển thị.';
  }
  if (err?.code === 'ACTION_REJECTED') return 'Đã hủy giao dịch.';
  return err?.message || 'Giao dịch thất bại.';
};
