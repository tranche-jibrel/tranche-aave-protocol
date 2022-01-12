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
    // fork: `https://https://avalanche--mainnet--rpc.datahub.figment.io/apikey/967b8027363cc5210a7192df0a115c2c/ext/bc/C/rpc/967b8027363cc5210a7192df0a115c2c/ext/bc/C/rpc`, //@8262540`,
    // fork: 'https://api.avax.network/ext/bc/C/rpc',
    network_id: 1,
    unlocked_accounts: [
      '0x38720D56899d46cAD253d08f7cD6CC89d2c83190', // DAI tests
      '0xABDe2F02fE84e083e1920471b54C3612456365Ef', // WBTC tests
      '0xe2644b0dc1b96C101d95421E95789eF6992B0E6A', // USDC tests
    ],
  }
};