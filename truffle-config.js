const HDWalletProvider = require('@truffle/hdwallet-provider');

require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1', // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: '*' // Any network (default: none)
    },
    kovan: {
      networkCheckTimeout: 1000000,
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`
        ),
      network_id: 42,
      gas: 5500000,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
        ),
      network_id: 1,
      gas: 5500000,
      gasPrice: 161000000000,
      timeoutBlocks: 200,
      confirmations: 2,
      skipDryRun: true
    },
    polygon: {
      provider: () => new HDWalletProvider(process.env.mnemonic, `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY}`),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    avaxtest: {
      provider: function () {
        return new HDWalletProvider({ mnemonic: process.env.mnemonic, providerOrUrl: process.env.PROVIDER, chainId: "0xa869" })
      },
      gas: 6000000,
      gasPrice: 225000000000,
      network_id: "*",
      confirmations: 2,
      skipDryRun: true
    },
    avaxmainnet: {
      provider: function () {
        return new HDWalletProvider({ mnemonic: process.env.mnemonic, providerOrUrl: process.env.PROVIDER, chainId: "0xa86a" })
      },
      gas: 6000000,
      gasPrice: 50000000000,
      network_id: 43114,
      confirmations: 2,
      skipDryRun: true
    },
  },
  plugins: ['truffle-contract-size',
    'solidity-coverage',
    'truffle-plugin-verify',
  ],
  api_keys: {
    etherscan: `${process.env.ETHERSCAN_KEY}`,
    polygonscan: `${process.env.POLYGONSCAN_KEY}`,
    snowtrace: `${process.env.SNOWTRACE_KEY}`,
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: "USD",
      coinmarketcap: `${process.env.CMC_API_KEY}`
    },
    timeout: 100000
  },
  // Configure your compilers
  compilers: {
    solc: {
      version: '0.8.8', // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        }
        //  evmVersion: "byzantium"
      }
    }
  }
};