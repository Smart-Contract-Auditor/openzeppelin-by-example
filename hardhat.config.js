require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: process.env.RPC_KEY ? {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.RPC_KEY}`,
        blockNumber: 21727371
      } : undefined
    }
  }
};