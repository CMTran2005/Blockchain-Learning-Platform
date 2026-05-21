require('dotenv').config();
const { HardhatUserConfig } = require('hardhat/config');
require('@nomicfoundation/hardhat-toolbox');

/** @type {HardhatUserConfig} */
const config = {
  solidity: "0.8.28",
  networks: {
    // Ganache local (mặc định)
    ganache: {
      url:      process.env.RPC_URL || 'http://127.0.0.1:7545',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Hardhat built-in network (test nhanh)
    hardhat: {},
  },
  defaultNetwork: 'ganache',
};

module.exports = config;
