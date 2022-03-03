require('dotenv').config();

module.exports = {
  skipFiles: [
    //'Migrations.sol',
  ],

  mocha: {
    enableTimeouts: false,
  },

  providerOptions: {
    allowUnlimetedContractSize: true,
    gasLimit: 0xfffffffffff,
    // logger: console,
    port: 9545,
    fork: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`, //@13410306`,
    network_id: 1,
    unlocked_accounts: [
      '0x38720D56899d46cAD253d08f7cD6CC89d2c83190', // DAI tests
      '0x92c96306289a7322174d6E091B9E36B14210e4F5', // WBTC tests
      '0xe2644b0dc1b96C101d95421E95789eF6992B0E6A', // USDC tests
    ],
  }
};