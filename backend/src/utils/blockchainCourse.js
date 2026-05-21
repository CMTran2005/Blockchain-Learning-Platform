const { contractReadOnly, isContractReady } = require('../config/contract');

/**
 * Find the next available blockchain course id (not registered on-chain).
 */
const getNextAvailableBlockchainId = async (preferredId = null) => {
  let candidate = preferredId && preferredId > 0 ? preferredId : 1;

  if (!isContractReady() || !contractReadOnly) {
    return candidate;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [id] = await contractReadOnly.getCourse(candidate);
    const exists = Number(id) !== 0;
    if (!exists) return candidate;
    candidate += 1;
    if (candidate > 10000) {
      throw new Error('Could not find available blockchain course id');
    }
  }
};

/**
 * Check if a course id is already registered on-chain.
 */
const isBlockchainCourseRegistered = async (courseId) => {
  if (!isContractReady() || !contractReadOnly || !courseId) return false;
  const [id] = await contractReadOnly.getCourse(courseId);
  return Number(id) !== 0;
};

/**
 * Read on-chain price in ETH string.
 */
const getOnChainPriceEth = async (courseId) => {
  if (!isContractReady() || !contractReadOnly) return null;
  const [, priceWei] = await contractReadOnly.getCourse(courseId);
  const { ethers } = require('ethers');
  return ethers.formatEther(priceWei);
};

module.exports = {
  getNextAvailableBlockchainId,
  isBlockchainCourseRegistered,
  getOnChainPriceEth,
};
