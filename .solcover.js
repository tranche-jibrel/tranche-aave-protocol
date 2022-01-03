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
    // fork: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`, //@13410306`,
    // fork: `https://https://avalanche--mainnet--rpc.datahub.figment.io/apikey/967b8027363cc5210a7192df0a115c2c/ext/bc/C/rpc/967b8027363cc5210a7192df0a115c2c/ext/bc/C/rpc`, //@8262540`,
    fork: 'https://api.avax.network/ext/bc/C/rpc',
    network_id: 43114,
    unlocked_accounts: [
      '0x20243F4081b0F777166F656871b61c2792FB4124', // DAI.e tests
      '0x652aD82d4CcbA3b162094b7bee69436d36754317', // WBTC.e tests
      '0x3A2434c698f8D79af1f5A9e43013157ca8B11a66', // USDC.e tests
    ],
  }
};