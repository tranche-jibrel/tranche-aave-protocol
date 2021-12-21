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
      '0x20243F4081b0F777166F656871b61c2792FB4124', // DAi tests
      //'0xAe2D4617c862309A3d75A0fFB358c7a5009c673F', // USDC tests
    ],
  }
};