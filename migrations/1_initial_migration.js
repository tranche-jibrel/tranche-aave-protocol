require('dotenv').config();
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
//var { abi } = require('../build/contracts/myERC20.json');

var JFeesCollector = artifacts.require("JFeesCollector");
var JAdminTools = artifacts.require("JAdminTools");

var JAave = artifacts.require('JAave');
var JTranchesDeployer = artifacts.require('JTranchesDeployer');

var JTrancheAToken = artifacts.require('JTrancheAToken');
var JTrancheBToken = artifacts.require('JTrancheBToken');

var myERC20 = artifacts.require("./mocks/myERC20.sol");
var WETHToken = artifacts.require('WETH9_');
var WETHGateway = artifacts.require('WETHGateway');

var IncentivesController = artifacts.require('./IncentivesController');

module.exports = async (deployer, network, accounts) => {
  const MYERC20_TOKEN_SUPPLY = 5000000;
  //const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  //const WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // mainnet
  //const WETH_ADDRESS = '0xd0A1E359811322d97991E03f863a0C30C2cF029C'; // kovan
  const DAI_ADDRESS = '0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD';

  const LendingPoolAddressesProvider = '0x88757f2f99175387aB4C6a4b3067c77A695b0349';
  const aWETH_Address = '0x87b1f4cf9BD63f7BBD3eE1aD04E8F52540349347';
  const aDAI_Address = '0xdCf0aF9e59C002FA3AA091a46196b37530FD48a8';
  const aaveIncentiveController = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5';

  if (network == "development") {
    const factoryOwner = accounts[0];

    const mySLICEinstance = await deployProxy(myERC20, [MYERC20_TOKEN_SUPPLY], { from: factoryOwner });
    console.log('mySLICE Deployed: ', mySLICEinstance.address);

    const JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
    console.log('JAdminTools Deployed: ', JATinstance.address);

    const JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
    console.log('JFeesCollector Deployed: ', JFCinstance.address);

    const JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
    console.log("Tranches Deployer: " + JTDeployer.address);

    await deployer.deploy(WETHToken);
    const JWethinstance = await WETHToken.deployed();
    console.log('WETH Token Deployed: ', JWethinstance.address);

    const JAinstance = await deployProxy(JAave, [JATinstance.address, JFCinstance.address, JTDeployer.address,
      aaveIncentiveController, JWethinstance.address, mySLICEinstance.address, 2102400], { from: factoryOwner });
    console.log('JAave Deployed: ', JAinstance.address);

    await deployer.deploy(WETHGateway, JWethinstance.address, JAinstance.address);
    const JWGinstance = await WETHGateway.deployed();
    console.log('WETHGateway Deployed: ', JWGinstance.address);

    await JAinstance.setAavePoolAddressProvider(LendingPoolAddressesProvider, { from: factoryOwner })
    await JAinstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });

    await JTDeployer.setJAaveAddress(JAinstance.address, { from: factoryOwner });

    await JAinstance.addTrancheToProtocol(ETH_ADDRESS, aWETH_Address, "jEthTrancheAToken", "JEA", "jEthTrancheBToken", "JEB", web3.utils.toWei("0.04", "ether"), 18, { from: factoryOwner });
    trParams = await JAinstance.trancheAddresses(0);
    let EthTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("Eth Tranche A Token Address: " + EthTrA.address);
    let EthTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("Eth Tranche B Token Address: " + EthTrB.address);

    await JAinstance.setTrancheDeposit(0, true);

    await JAinstance.addTrancheToProtocol(DAI_ADDRESS, aDAI_Address, "jDaiTrancheAToken", "JDA", "jDaiTrancheBToken", "JDB", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    trParams = await JAinstance.trancheAddresses(1);
    let DaiTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("Eth Tranche A Token Address: " + DaiTrA.address);
    let DaiTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("Eth Tranche B Token Address: " + DaiTrB.address);

    await JAinstance.setTrancheDeposit(1, true);

    const JIController = await deployProxy(IncentivesController, [], { from: factoryOwner });
    console.log("Tranches Deployer: " + JIController.address);

    await JAinstance.setincentivesControllerAddress(JIController.address);

  } else if (network == "kovan") {
    // AAVE_TRANCHE_ADDRESS=0x0D98E839E7db6A6507A0CAd59c4C23cBD7bAB6Af
    let { FEE_COLLECTOR_ADDRESS, PRICE_ORACLE_ADDRESS, REWARD_TOKEN_ADDRESS, IS_UPGRADE, AAVE_POOL, ADAI_ADDRESS, DAI_ADDRESS, AAVE_INCENTIVE_CONTROLLER } = process.env;
    const accounts = await web3.eth.getAccounts();
    const factoryOwner = accounts[0];
    if (IS_UPGRADE == 'true') {
      console.log('contracts are upgraded');
    } else {
      const aaveDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
      console.log(`AAVE_DEPLOYER=${aaveDeployer.address}`);

      const JAaveInstance = await deployProxy(JAave, [PRICE_ORACLE_ADDRESS, FEE_COLLECTOR_ADDRESS, aaveDeployer.address, PRICE_ORACLE_ADDRESS],
        { from: factoryOwner });
      console.log(`AAVE_TRANCHE_ADDRESS=${JAaveInstance.address}`);

      await aaveDeployer.setJAaveAddress(JAaveInstance.address, { from: factoryOwner });
      console.log('aave deployer 1');

      await JAaveInstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
      console.log('aave deployer 2');

      await JAaveInstance.addTrancheToProtocol(DAI_ADDRESS, ADAI_ADDRESS, "Tranche A - AAVE DAI", "AADAI", "Tranche B - AAVE DAI", "BADAI", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
      // remember to enable deposits for the tranche number you add!!!
      await JAaveInstance.setTrancheDeposit(0, true);
      console.log('aave deployer 3');

      // await JAaveInstance.addTrancheToProtocol(ETH_ADDRESS, AWETH_ADDRESS, "Tranche A - AAVE ETH", "AAETH", "Tranche A - AAVE ETH", "BAETH", web3.utils.toWei("0.04", "ether"), 18, { from: factoryOwner });
      // console.log('compound deployer 4');

      console.log(`JAave deployed at: ${JAaveInstance.address}`);
    }
  } else if (network === 'matic') {
    let { AAVE_POOL, MATIC_ADDRESS, WMATIC_ADDRESS, REWARD_TOKEN_ADDRESS, amWMATIC_ADDRESS, USDC_ADDRESS, amUSDC_ADDRESS,
      DAI_ADDRESS, amDAI_ADDRESS, ADMIN_TOOLS, FEE_COLLECTOR_ADDRESS, } = process.env;
    const factoryOwner = accounts[0];

    let JATinstance = null;
    let JFCinstance = null;
    if (!ADMIN_TOOLS) {
      JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
      console.log('JAdminTools Deployed: ', JATinstance.address);
    } else {
      JATinstance = {
        address: ADMIN_TOOLS
      }
    }
    if (!FEE_COLLECTOR_ADDRESS) {
      JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
      console.log('JFeesCollector Deployed: ', JFCinstance.address);
    } else {
      JFCinstance = {
        address: FEE_COLLECTOR_ADDRESS
      }
    }

    const JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
    console.log("AAVE_DEPLOYER " + JTDeployer.address);

    const JAinstance = await deployProxy(JAave, [JATinstance.address, JFCinstance.address, JTDeployer.address,
      '0x357D51124f59836DeD84c8a1730D72B749d8BC23', WMATIC_ADDRESS, REWARD_TOKEN_ADDRESS, 15768000], { from: factoryOwner });
    console.log('AAVE_TRANCHE_ADDRESS', JAinstance.address);

    await deployer.deploy(WETHGateway, WMATIC_ADDRESS, JAinstance.address);
    const JWGinstance = await WETHGateway.deployed();
    console.log('WETH_GATEWAY', JWGinstance.address);

    // const JTDeployer = await JTranchesDeployer.at('0x68310EbB80883AbcB2bCd87A28855447d0CafeD1');
    await JTDeployer.setJAaveAddress(JAinstance.address, { from: factoryOwner });
    console.log('aave deployer 1');
    await JAinstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });
    console.log('aave deployer 2');


    await JAinstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
    console.log('aave deployer 3');

    await JAinstance.addTrancheToProtocol(MATIC_ADDRESS, amWMATIC_ADDRESS, "Tranche A - Aave Polygon MATIC", "aamMATIC", "Tranche B - Aave Polygon MATIC", "bamMATIC", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(0, true, { from: factoryOwner });
    console.log('added tranche 1')
    await JAinstance.addTrancheToProtocol(DAI_ADDRESS, amDAI_ADDRESS, "Tranche A - Aave Polygon DAI", "aamDAI", "Tranche B - Aave Polygon DAI", "bamDAI", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(1, true, { from: factoryOwner });
    console.log('added tranche 2')
    await JAinstance.addTrancheToProtocol(USDC_ADDRESS, amUSDC_ADDRESS, "Tranche A - Aave Polygon USDC", "aamUSDC", "Tranche B - Aave Polygon USDC", "bamUSDC", web3.utils.toWei("0.03", "ether"), 6, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(2, true, { from: factoryOwner });
    console.log('added tranche 3');

    trParams = await JAinstance.trancheAddresses(0);
    let MaticTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    let MaticTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(1);
    let DaiTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    let DaiTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(2);
    let USDCTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    let USDCTrB = await JTrancheBToken.at(trParams.BTrancheAddress);

    console.log(`REACT_APP_AAVE_TRANCHE_TOKENS=${MaticTrA.address},${MaticTrB.address},${DaiTrA.address},${DaiTrB.address},${USDCTrA.address},${USDCTrB.address}`)
  } else if (network === 'avaxtest') {
    let { AAVE_POOL, ADMIN_TOOLS, FEE_COLLECTOR_ADDRESS, WETH_GATEWAY, REWARD_TOKEN_ADDRESS, AVAX_ADDRESS, WAVAX_ADDRESS, AAVE_INCENTIVE_ADDRESS, MOCK_INCENTIVE_CONTROLLER,
      aavaWAVAX_ADDRESS, WETH_ADDRESS, aavaWETH_ADDRESS, WBTC_ADDRESS, aavaWBTC_ADDRESS } = process.env;
    const factoryOwner = accounts[0];

    let JATinstance = null;
    let JFCinstance = null;
    let JWGinstance = null
    if (!ADMIN_TOOLS) {
      JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
      console.log('JAdminTools Deployed: ', JATinstance.address);
    } else {
      JATinstance = {
        address: ADMIN_TOOLS
      }
    }
    if (!FEE_COLLECTOR_ADDRESS) {
      JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
      console.log('JFeesCollector Deployed: ', JFCinstance.address);
    } else {
      JFCinstance = {
        address: FEE_COLLECTOR_ADDRESS
      }
    }

    if (!WETH_GATEWAY) {
      await deployer.deploy(WETHGateway, WAVAX_ADDRESS, JAinstance.address);
      JWGinstance = await WETHGateway.deployed();
      console.log('WETH_GATEWAY', JWGinstance.address);
    } else {
      JWGinstance = {
        address: WETH_GATEWAY
      }
    }

    const JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
    console.log("AAVE_DEPLOYER " + JTDeployer.address);

    const JAinstance = await deployProxy(JAave, [JATinstance.address, JFCinstance.address, JTDeployer.address,
      AAVE_INCENTIVE_ADDRESS, WAVAX_ADDRESS, REWARD_TOKEN_ADDRESS, 31557600], { from: factoryOwner });
    console.log('AAVE_TRANCHE_ADDRESS', JAinstance.address);

    await JTDeployer.setJAaveAddress(JAinstance.address, { from: factoryOwner });
    console.log('aave deployer 1');

    await JAinstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });
    console.log('aave deployer 2');

    await JAinstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
    console.log('aave deployer 3');

    await JAinstance.addTrancheToProtocol(AVAX_ADDRESS, aavaWAVAX_ADDRESS, "Tranche A - Aave Avalanche AVAX", "aaavaWAVAX", "Tranche B - Aave Avalanche AVAX", "baavaWAVAX", web3.utils.toWei("0.3", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(0, true, { from: factoryOwner });
    console.log('added tranche 1')

    await JAinstance.addTrancheToProtocol(WETH_ADDRESS, aavaWETH_ADDRESS, "Tranche A - Aave Avalanche WETH", "aaavaWETH", "Tranche B - Aave Avalanche WETH", "baavaWETH", web3.utils.toWei("0.02", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(1, true, { from: factoryOwner });
    console.log('added tranche 2')

    await JAinstance.addTrancheToProtocol(WBTC_ADDRESS, aavaWBTC_ADDRESS, "Tranche A - Aave Avalanche WBTC", "aaavaWBTC", "Tranche B - Aave Avalanche WBTC", "baavaWBTC", web3.utils.toWei("0.002", "ether"), 8, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(2, true, { from: factoryOwner });
    console.log('added tranche 3');

    if (!MOCK_INCENTIVE_CONTROLLER) {
      const JIController = await deployProxy(IncentivesController, [], { from: factoryOwner });
      console.log("MOCK_INCENTIVE_CONTROLLER " + JIController.address);
      await JAinstance.setincentivesControllerAddress(JIController.address);
      console.log('incentive controller setup')
    } else {
      await JAinstance.setincentivesControllerAddress(MOCK_INCENTIVE_CONTROLLER);
      console.log('incentive controller setup')
    }

    trParams = await JAinstance.trancheAddresses(0);
    let tranche1A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche1B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(1);
    let tranche2A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche2B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(2);
    let tranche2A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche2B = await JTrancheBToken.at(trParams.BTrancheAddress);

    console.log(`REACT_APP_AAVE_TRANCHE_TOKENS=${tranche1A.address},${tranche2A.address},${tranche3A.address},
    ${tranche1B.address},${tranche2B.address},${tranche3B.address}`)
  }
}