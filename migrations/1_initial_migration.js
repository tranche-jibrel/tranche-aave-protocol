require('dotenv').config();
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

var myERC20 = artifacts.require("myERC20")
var JFeesCollector = artifacts.require("JFeesCollector");
var JAdminTools = artifacts.require("JAdminTools");

var JAave = artifacts.require('JAave');
var JTranchesDeployer = artifacts.require('JTranchesDeployer');

var JTrancheAToken = artifacts.require('JTrancheAToken');
var JTrancheBToken = artifacts.require('JTrancheBToken');

// var WETHToken = artifacts.require('WETH9_');
var WETHGateway = artifacts.require('WETHGateway');

var PriceHelper = artifacts.require('./PriceHelper');
var MarketHelper = artifacts.require('./MarketHelper');
var IncentivesController = artifacts.require('./IncentivesController');

var Chainlink1 = artifacts.require('Chainlink1');

//const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const aWETH_Address = '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e';
const aDAI_Address = '0x028171bCA77440897B824Ca71D1c56caC55b68A3';
const aWBCT_Address = '0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656';
const aUSDC_Address = '0xBcca60bB61934080951369a648Fb03DF4F96263C';
const aUSDT_Address = '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811';

const LendingPoolAddressesProvider = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';
const aaveIncentiveController = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5';

const MYERC20_TOKEN_SUPPLY = 20000000;

module.exports = async (deployer, network, accounts) => {

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

    const JAinstance = await deployProxy(JAave, [JATinstance.address, JFCinstance.address, JTDeployer.address,
      aaveIncentiveController, WETH_ADDRESS, 31536000], { from: factoryOwner });
    console.log('JAave Deployed: ', JAinstance.address);

    await deployer.deploy(WETHGateway, WETH_ADDRESS, JAinstance.address);
    const JWGinstance = await WETHGateway.deployed();
    console.log('WETHGateway Deployed: ', JWGinstance.address);

    await JATinstance.addAdmin(JAinstance.address, { from: factoryOwner })
    await JATinstance.addAdmin(JTDeployer.address, { from: factoryOwner })

    await JAinstance.setAavePoolAddressProvider(LendingPoolAddressesProvider, { from: factoryOwner })
    await JAinstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });

    await JTDeployer.setJAaveAddresses(JAinstance.address, JATinstance.address, { from: factoryOwner });

    tx = await JAinstance.addTrancheToProtocol(ETH_ADDRESS, aWETH_Address, "jEthTrancheAToken", "JEA", "jEthTrancheBToken", "JEB", web3.utils.toWei("0.04", "ether"), 18, { from: factoryOwner });
    // console.log(tx.receipt.gasUsed);
    trParams = await JAinstance.trancheAddresses(0);
    let EthTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("ETH Tranche A Token Address: " + EthTrA.address);
    let EthTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("ETH Tranche B Token Address: " + EthTrB.address);

    await JAinstance.setTrancheDeposit(0, true);

    tx = await JAinstance.addTrancheToProtocol(DAI_ADDRESS, aDAI_Address, "jDaiTrancheAToken", "JDA", "jDaiTrancheBToken", "JDB", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    // console.log(tx.receipt.gasUsed);
    trParams = await JAinstance.trancheAddresses(1);
    let DaiTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("DAI Tranche A Token Address: " + DaiTrA.address);
    let DaiTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("DAI Tranche B Token Address: " + DaiTrB.address);

    await JAinstance.setTrancheDeposit(1, true);

    tx = await JAinstance.addTrancheToProtocol(WBTC_ADDRESS, aWBCT_Address, "jWBTCTrancheAToken", "JWBA", "jWBTCTrancheBToken", "JWBB", web3.utils.toWei("0.03", "ether"), 8, { from: factoryOwner });
    // console.log(tx.receipt.gasUsed);
    trParams = await JAinstance.trancheAddresses(2);
    let WbtcTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("WBTC Tranche A Token Address: " + WbtcTrA.address);
    let WbtcTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("WBTC Tranche B Token Address: " + WbtcTrB.address);

    await JAinstance.setTrancheDeposit(2, true);

    tx = await JAinstance.addTrancheToProtocol(USDC_ADDRESS, aUSDC_Address, "jUSDCTrancheAToken", "JUBA", "jUSDCTrancheBToken", "JUBB", web3.utils.toWei("0.03", "ether"), 6, { from: factoryOwner });
    // console.log(tx.receipt.gasUsed);
    trParams = await JAinstance.trancheAddresses(3);
    let UsdcTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("USDC Tranche A Token Address: " + UsdcTrA.address);
    let UsdcTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("USDC Tranche B Token Address: " + UsdcTrB.address);

    await JAinstance.setTrancheDeposit(3, true);

    tx = await JAinstance.addTrancheToProtocol(USDT_ADDRESS, aUSDT_Address, "jUSDTTrancheAToken", "JUTA", "jUSDTTrancheBToken", "JUTB", web3.utils.toWei("0.03", "ether"), 6, { from: factoryOwner });
    // console.log(tx.receipt.gasUsed);
    trParams = await JAinstance.trancheAddresses(4);
    let UsdtTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("USDT Tranche A Token Address: " + UsdtTrA.address);
    let UsdtTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("USDT Tranche B Token Address: " + UsdtTrB.address);

    await JAinstance.setTrancheDeposit(4, true);

    const myChainlink1Inst = await deployProxy(Chainlink1, [], { from: factoryOwner });
    console.log('myChainlink1 Deployed: ', myChainlink1Inst.address);

    const myPriceHelperInst = await deployProxy(PriceHelper, [], { from: factoryOwner });
    console.log('myPriceHelper Deployed: ', myPriceHelperInst.address);

    const myMktHelperinstance = await deployProxy(MarketHelper, [], { from: factoryOwner });
    console.log('myMktHelperinstance Deployed: ', myMktHelperinstance.address);

    const JIController = await deployProxy(IncentivesController, [mySLICEinstance.address, myMktHelperinstance.address, myPriceHelperInst.address], { from: factoryOwner });
    console.log("SIRs address: " + JIController.address);

    await myPriceHelperInst.setControllerAddress(JIController.address, { from: factoryOwner })

    await JAinstance.setIncentivesControllerAddress(JIController.address, { from: factoryOwner });

  } else if (network == "kovan") {
    let {
      AAVE_POOL, AAVE_INCENTIVE_ADDRESS, WETH_ADDRESS,
      ADMIN_TOOLS, FEE_COLLECTOR_ADDRESS, WETH_GATEWAY, MOCK_INCENTIVE_CONTROLLER, AAVE_DEPLOYER, AAVE_TRANCHE_ADDRESS,
      TRANCHE_1_TOKEN_ADDRESS, TRANCHE_1_ATOKEN_ADDRESS,
      TRANCHE_2_TOKEN_ADDRESS, TRANCHE_2_ATOKEN_ADDRESS,
      TRANCHE_3_TOKEN_ADDRESS, TRANCHE_3_ATOKEN_ADDRESS,
      TRANCHE_4_TOKEN_ADDRESS, TRANCHE_4_ATOKEN_ADDRESS,
      TRANCHE_5_TOKEN_ADDRESS, TRANCHE_5_ATOKEN_ADDRESS,
      TRANCHE_6_TOKEN_ADDRESS, TRANCHE_6_ATOKEN_ADDRESS,
      TRANCHE_7_TOKEN_ADDRESS, TRANCHE_7_ATOKEN_ADDRESS,
      TRANCHE_8_TOKEN_ADDRESS, TRANCHE_8_ATOKEN_ADDRESS,
    } = process.env;
    const factoryOwner = accounts[0];
    let JATinstance = null;
    let JFCinstance = null;
    let JWGinstance = null
    let JTDeployer = null;
    let JAinstance = null;
    if (!ADMIN_TOOLS) {
      JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
      console.log('JAdminTools Deployed: ', JATinstance.address);
    } else {
      JATinstance = await JAdminTools.at(ADMIN_TOOLS);
    }
    if (!FEE_COLLECTOR_ADDRESS) {
      JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
      console.log('JFeesCollector Deployed: ', JFCinstance.address);
    } else {
      JFCinstance = {
        address: FEE_COLLECTOR_ADDRESS
      }
    }
    if (!AAVE_DEPLOYER) {
      JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
      console.log("AAVE_DEPLOYER " + JTDeployer.address);
      await JATinstance.addAdmin(JTDeployer.address, { from: factoryOwner })
      console.log('admin added 1');
    } else {
      JTDeployer = await JTranchesDeployer.at(AAVE_DEPLOYER);
    }

    if (!AAVE_TRANCHE_ADDRESS) {
      JAinstance = await deployProxy(JAave, [JATinstance.address, JFCinstance.address, JTDeployer.address,
        AAVE_INCENTIVE_ADDRESS, WETH_ADDRESS, 31557600], { from: factoryOwner });
      console.log('AAVE_TRANCHE_ADDRESS', JAinstance.address);
      await JTDeployer.setJAaveAddresses(JAinstance.address, JATinstance.address, { from: factoryOwner });
      console.log('aave deployer 1');
      await JATinstance.addAdmin(JAinstance.address, { from: factoryOwner })
      console.log('admin added 2');
    } else {
      JAinstance = await JAave.at(AAVE_TRANCHE_ADDRESS);
    }

    if (!WETH_GATEWAY) {
      await deployer.deploy(WETHGateway, WETH_ADDRESS, JAinstance.address);
      JWGinstance = await WETHGateway.deployed();
      console.log('WETH_GATEWAY', JWGinstance.address);
      await JWGinstance.setJAaveAddress(JAinstance.address);
    } else {
      JWGinstance = await WETHGateway.at(WETH_GATEWAY)
      await JWGinstance.setJAaveAddress(JAinstance.address);
    }
    if (!AAVE_TRANCHE_ADDRESS) {
      await JAinstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });
      console.log('aave deployer 2');
      await JAinstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
      console.log('aave deployer 3');
    }

    //tranche 1 DAI/aDAI
    await JAinstance.addTrancheToProtocol(TRANCHE_1_TOKEN_ADDRESS, TRANCHE_1_ATOKEN_ADDRESS, "Tranche A - Aave DAI", "aaDAI", "Tranche B - Aave DAI", "baDAI", web3.utils.toWei("0.02977", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(0, true, { from: factoryOwner });
    console.log('added tranche 1')

    //tranche 2 sUSD/asUSD
    await JAinstance.addTrancheToProtocol(TRANCHE_2_TOKEN_ADDRESS, TRANCHE_2_ATOKEN_ADDRESS, "Tranche A - Aave sUSD", "aaSUSD", "Tranche B - Aave sUSD", "baSUSD", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(1, true, { from: factoryOwner });
    console.log('added tranche 2')

    //tranche 3  USDC/aUSDC
    await JAinstance.addTrancheToProtocol(TRANCHE_3_TOKEN_ADDRESS, TRANCHE_3_ATOKEN_ADDRESS, "Tranche A - Aave USDC", "aaUSDC", "Tranche B - Aave USDC", "baUSDC", web3.utils.toWei("0.00", "ether"), 6, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(2, true, { from: factoryOwner });
    console.log('added tranche 3');

    //tranche 4 USDT/aUSDT
    await JAinstance.addTrancheToProtocol(TRANCHE_4_TOKEN_ADDRESS, TRANCHE_4_ATOKEN_ADDRESS, "Tranche A - Aave USDT", "aaUSDT", "Tranche B - Aave USDT", "baUSDT", web3.utils.toWei("0.015912", "ether"), 6, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(3, true, { from: factoryOwner });
    console.log('added tranche 4');

    //tranche 5 LINK/aLINK
    await JAinstance.addTrancheToProtocol(TRANCHE_5_TOKEN_ADDRESS, TRANCHE_5_ATOKEN_ADDRESS, "Tranche A - Aave LINK", "aaLINK", "Tranche B - Aave LINK", "baLINK", web3.utils.toWei("0.00", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(4, true, { from: factoryOwner });
    console.log('added tranche 5');


    //tranche 6 WBTC/aWBTC
    await JAinstance.addTrancheToProtocol(TRANCHE_6_TOKEN_ADDRESS, TRANCHE_6_ATOKEN_ADDRESS, "Tranche A - Aave WBTC", "aaWBTC", "Tranche B - Aave WBTC", "baWBTC", web3.utils.toWei("0.005695", "ether"), 8, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(5, true, { from: factoryOwner });
    console.log('added tranche 6');

    //tranche 7 BUSD/aBUSD
    await JAinstance.addTrancheToProtocol(TRANCHE_7_TOKEN_ADDRESS, TRANCHE_7_ATOKEN_ADDRESS, "Tranche A - Aave BUSD", "aaBUSD", "Tranche B - Aave BUSD", "baBUSD", web3.utils.toWei("0.01", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(6, true, { from: factoryOwner });
    console.log('added tranche 7');

    //tranche 8  ETH/aETH
    await JAinstance.addTrancheToProtocol(TRANCHE_8_TOKEN_ADDRESS, TRANCHE_8_ATOKEN_ADDRESS, "Tranche A - Aave WETH", "aaWETH", "Tranche B - Aave WETH", "baWETH", web3.utils.toWei("0.01", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(7, true, { from: factoryOwner });
    console.log('added tranche 8');

    if (!MOCK_INCENTIVE_CONTROLLER) {
      const JIController = await deployProxy(IncentivesController, [], { from: factoryOwner });
      console.log("MOCK_INCENTIVE_CONTROLLER " + JIController.address);
      await JAinstance.setIncentivesControllerAddress(JIController.address);
      console.log('incentive controller setup')
    } else {
      await JAinstance.setIncentivesControllerAddress(MOCK_INCENTIVE_CONTROLLER);
      console.log('incentive controller setup')
    }

    trParams = await JAinstance.trancheAddresses(0);
    let tranche1A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche1B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(1);
    let tranche2A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche2B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(2);
    let tranche3A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche3B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(3);
    let tranche4A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche4B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(4);
    let tranche5A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche5B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(5);
    let tranche6A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche6B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(6);
    let tranche7A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche7B = await JTrancheBToken.at(trParams.BTrancheAddress);


    trParams = await JAinstance.trancheAddresses(7);
    let tranche8A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche8B = await JTrancheBToken.at(trParams.BTrancheAddress);

    console.log(`REACT_APP_AAVE_TRANCHE_TOKENS=${tranche1A.address},${tranche2A.address},${tranche3A.address},${tranche4A.address},${tranche5A.address},${tranche6A.address},${tranche7A.address},${tranche8A.address},
    ${tranche1B.address},${tranche2B.address},${tranche3B.address},${tranche4B.address},${tranche5B.address},${tranche6B.address},${tranche7B.address},${tranche8B.address}`)

  } else if (network === 'matic') {
    let { AAVE_POOL, MATIC_ADDRESS, WMATIC_ADDRESS, amWMATIC_ADDRESS, USDC_ADDRESS, amUSDC_ADDRESS,
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
      '0x357D51124f59836DeD84c8a1730D72B749d8BC23', WMATIC_ADDRESS, 15768000], { from: factoryOwner });
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
    let { AAVE_POOL, ADMIN_TOOLS, FEE_COLLECTOR_ADDRESS, WETH_GATEWAY, AVAX_ADDRESS, WAVAX_ADDRESS, AAVE_INCENTIVE_ADDRESS, MOCK_INCENTIVE_CONTROLLER,
      aavaWAVAX_ADDRESS, WETH_ADDRESS, aavaWETH_ADDRESS, WBTC_ADDRESS, aavaWBTC_ADDRESS } = process.env;
    const factoryOwner = accounts[0];

    let JATinstance = null;
    let JFCinstance = null;
    let JWGinstance = null
    if (!ADMIN_TOOLS) {
      JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
      console.log('JAdminTools Deployed: ', JATinstance.address);
    } else {
      JATinstance = await JAdminTools.at(ADMIN_TOOLS);
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
      AAVE_INCENTIVE_ADDRESS, WAVAX_ADDRESS, 31557600], { from: factoryOwner });
    console.log('AAVE_TRANCHE_ADDRESS', JAinstance.address);

    await JTDeployer.setJAaveAddresses(JAinstance.address, JATinstance.address, { from: factoryOwner });
    console.log('aave deployer 1');
    await JATinstance.addAdmin(JTDeployer.address, { from: factoryOwner })

    if (!WETH_GATEWAY) {
      await deployer.deploy(WETHGateway, WAVAX_ADDRESS, JAinstance.address);
      JWGinstance = await WETHGateway.deployed();
      await JWGinstance.setJAaveAddress(JAinstance.address);
      console.log('WETH_GATEWAY', JWGinstance.address);
    } else {
      JWGinstance = await WETHGateway.at(WETH_GATEWAY)
      await JWGinstance.setJAaveAddress(JAinstance.address);
    }

    await JWGinstance.setJAaveAddress(JAinstance.address, { from: factoryOwner })

    await JAinstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });
    console.log('aave deployer 2');

    await JAinstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
    console.log('aave deployer 3');

    await JATinstance.addAdmin(JAinstance.address, { from: factoryOwner })

    await JAinstance.addTrancheToProtocol(AVAX_ADDRESS, aavaWAVAX_ADDRESS, "Tranche A - Aave Avalanche AVAX", "aavWAVAX", "Tranche B - Aave Avalanche AVAX", "bavWAVAX", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(0, true, { from: factoryOwner });
    console.log('added tranche 1')

    await JAinstance.addTrancheToProtocol(WETH_ADDRESS, aavaWETH_ADDRESS, "Tranche A - Aave Avalanche WETH", "aavWETH", "Tranche B - Aave Avalanche WETH", "bavWETH", web3.utils.toWei("0.02", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(1, true, { from: factoryOwner });
    console.log('added tranche 2')

    await JAinstance.addTrancheToProtocol(WBTC_ADDRESS, aavaWBTC_ADDRESS, "Tranche A - Aave Avalanche WBTC", "aavWBTC", "Tranche B - Aave Avalanche WBTC", "bavWBTC", web3.utils.toWei("0.002", "ether"), 8, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(2, true, { from: factoryOwner });
    console.log('added tranche 3');

    if (!MOCK_INCENTIVE_CONTROLLER) {
      const JIController = await deployProxy(IncentivesController, [], { from: factoryOwner });
      console.log("MOCK_INCENTIVE_CONTROLLER " + JIController.address);
      await JAinstance.setIncentivesControllerAddress(JIController.address);
      console.log('incentive controller setup')
    } else {
      await JAinstance.setIncentivesControllerAddress(MOCK_INCENTIVE_CONTROLLER);
      console.log('incentive controller setup')
    }

    trParams = await JAinstance.trancheAddresses(0);
    let tranche1A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche1B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(1);
    let tranche2A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche2B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(2);
    let tranche3A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche3B = await JTrancheBToken.at(trParams.BTrancheAddress);

    console.log(`REACT_APP_AAVE_TRANCHE_TOKENS=${tranche1A.address},${tranche2A.address},${tranche3A.address},
    ${tranche1B.address},${tranche2B.address},${tranche3B.address}`)
  }
  else if (network === 'avaxmainnet') {
    let { AAVE_POOL, ADMIN_TOOLS, FEE_COLLECTOR_ADDRESS, WETH_GATEWAY, AAVE_INCENTIVE_ADDRESS, MOCK_INCENTIVE_CONTROLLER, WAVAX_ADDRESS,
      AVAX_ADDRESS, avWAVAX_ADDRESS,
      WETH_ADDRESS, avWETH_ADDRESS,
      WBTC_ADDRESS, avWBTC_ADDRESS,
      DAI_ADDRESS, avDAI_ADDRESS,
      USDT_ADDRESS, avUSDT_ADDRESS,
      USDC_ADDRESS, avUSDC_ADDRESS,
      AAVE_ADDRESS, avAAVE_ADDRESS
    } = process.env;
    const factoryOwner = accounts[0];

    let JATinstance = null;
    let JFCinstance = null;
    let JWGinstance = null
    if (!ADMIN_TOOLS) {
      JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
      console.log('JAdminTools Deployed: ', JATinstance.address);
    } else {
      JATinstance = await JAdminTools.at(ADMIN_TOOLS);
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

    await JATinstance.addAdmin(JTDeployer.address, { from: factoryOwner })
    console.log('admin added 1');

    const JAinstance = await deployProxy(JAave, [JATinstance.address, JFCinstance.address, JTDeployer.address,
      AAVE_INCENTIVE_ADDRESS, WAVAX_ADDRESS, 31557600], { from: factoryOwner });
    console.log('AAVE_TRANCHE_ADDRESS', JAinstance.address);

    await JTDeployer.setJAaveAddresses(JAinstance.address, JATinstance.address, { from: factoryOwner });
    console.log('aave deployer 1');

    await JATinstance.addAdmin(JAinstance.address, { from: factoryOwner })
    console.log('admin added 2');

    if (!WETH_GATEWAY) {
      await deployer.deploy(WETHGateway, WAVAX_ADDRESS, JAinstance.address);
      JWGinstance = await WETHGateway.deployed();
      console.log('WETH_GATEWAY', JWGinstance.address);
      await JWGinstance.setJAaveAddress(JAinstance.address);
    } else {
      JWGinstance = await WETHGateway.at(WETH_GATEWAY)
      await JWGinstance.setJAaveAddress(JAinstance.address);
    }
    await JAinstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });
    console.log('aave deployer 2');

    await JAinstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
    console.log('aave deployer 3');

    //tranche 1  AVAX_ADDRESS,avWAVAX_ADDRESS, 0.2977%
    await JAinstance.addTrancheToProtocol(AVAX_ADDRESS, avWAVAX_ADDRESS, "Tranche A - Aave Avalanche AVAX", "aavWAVAX", "Tranche B - Aave Avalanche AVAX", "bavWAVAX", web3.utils.toWei("0.02977", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(0, true, { from: factoryOwner });
    console.log('added tranche 1')

    //tranche 2  WETH_ADDRESS, avWETH_ADDRESS, 0.0%
    await JAinstance.addTrancheToProtocol(WETH_ADDRESS, avWETH_ADDRESS, "Tranche A - Aave Avalanche WETH", "aavWETH", "Tranche B - Aave Avalanche WETH", "bavWETH", web3.utils.toWei("0.00", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(1, true, { from: factoryOwner });
    console.log('added tranche 2')

    //tranche 3  WBTC_ADDRESS, avWBTC_ADDRESS, 0.0%
    await JAinstance.addTrancheToProtocol(WBTC_ADDRESS, avWBTC_ADDRESS, "Tranche A - Aave Avalanche WBTC", "aavWBTC", "Tranche B - Aave Avalanche WBTC", "bavWBTC", web3.utils.toWei("0.00", "ether"), 8, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(2, true, { from: factoryOwner });
    console.log('added tranche 3');

    //tranche 4  DAI_ADDRESS, avDAI_ADDRESS, 1.5912%
    await JAinstance.addTrancheToProtocol(DAI_ADDRESS, avDAI_ADDRESS, "Tranche A - Aave Avalanche DAI", "aavDAI", "Tranche B - Aave Avalanche DAI", "bavDAI", web3.utils.toWei("0.015912", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(3, true, { from: factoryOwner });
    console.log('added tranche 4');

    //tranche 5  USDT_ADDRESS, avUSDT_ADDRESS,0%
    await JAinstance.addTrancheToProtocol(USDT_ADDRESS, avUSDT_ADDRESS, "Tranche A - Aave Avalanche USDT", "aavUSDT", "Tranche B - Aave Avalanche USDT", "bavUSDT", web3.utils.toWei("0.00", "ether"), 6, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(4, true, { from: factoryOwner });
    console.log('added tranche 5');


    //tranche 6 USDC_ADDRESS, avUSDC_ADDRESS,0.5695%
    await JAinstance.addTrancheToProtocol(USDC_ADDRESS, avUSDC_ADDRESS, "Tranche A - Aave Avalanche USDC", "aavUSDC", "Tranche B - Aave Avalanche USDC", "bavUSDC", web3.utils.toWei("0.005695", "ether"), 6, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(5, true, { from: factoryOwner });
    console.log('added tranche 6');

    //tranche 7 AAVE_ADDRESS, avAAVE_ADDRESS,0.0%
    await JAinstance.addTrancheToProtocol(AAVE_ADDRESS, avAAVE_ADDRESS, "Tranche A - Aave Avalanche AAVE", "aavAAVE", "Tranche B - Aave Avalanche AAVE", "bavAAVE", web3.utils.toWei("0.00", "ether"), 18, { from: factoryOwner });
    await JAinstance.setTrancheDeposit(6, true, { from: factoryOwner });
    console.log('added tranche 7');

    if (!MOCK_INCENTIVE_CONTROLLER) {
      const JIController = await deployProxy(IncentivesController, [], { from: factoryOwner });
      console.log("MOCK_INCENTIVE_CONTROLLER " + JIController.address);
      await JAinstance.setIncentivesControllerAddress(JIController.address);
      console.log('incentive controller setup')
    } else {
      await JAinstance.setIncentivesControllerAddress(MOCK_INCENTIVE_CONTROLLER);
      console.log('incentive controller setup')
    }

    trParams = await JAinstance.trancheAddresses(0);
    let tranche1A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche1B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(1);
    let tranche2A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche2B = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JAinstance.trancheAddresses(2);
    let tranche3A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche3B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(3);
    let tranche4A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche4B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(4);
    let tranche5A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche5B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(5);
    let tranche6A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche6B = await JTrancheBToken.at(trParams.BTrancheAddress);

    trParams = await JAinstance.trancheAddresses(6);
    let tranche7A = await JTrancheAToken.at(trParams.ATrancheAddress);
    let tranche7B = await JTrancheBToken.at(trParams.BTrancheAddress);

    console.log(`REACT_APP_AAVE_TRANCHE_TOKENS=${tranche1A.address},${tranche2A.address},${tranche3A.address},${tranche4A.address},${tranche5A.address},${tranche6A.address},${tranche7A.address},
    ${tranche1B.address},${tranche2B.address},${tranche3B.address},${tranche4B.address},${tranche5B.address},${tranche6B.address},${tranche7B.address}`)
  }
}