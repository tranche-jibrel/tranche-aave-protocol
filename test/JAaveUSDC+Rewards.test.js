const {
  deployProxy,
  upgradeProxy
} = require('@openzeppelin/truffle-upgrades');
const {
  expect
} = require('chai');

const timeMachine = require('ganache-time-traveler');

const Web3 = require('web3');
// Ganache UI on 8545
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time
} = require('@openzeppelin/test-helpers');

const fs = require('fs');
const USDC_ABI = JSON.parse(fs.readFileSync('./test/utils/USDC.abi', 'utf8'));

const mySLICE = artifacts.require("myERC20");
const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JAave = artifacts.require('JAave');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

const Chainlink1 = artifacts.require("Chainlink1.sol");
const Chainlink2 = artifacts.require("Chainlink2.sol");

const MarketHelper = artifacts.require("MarketHelper.sol");
const PriceHelper = artifacts.require("PriceHelper.sol");
const IncentivesController = artifacts.require("IncentivesController.sol");

const MYERC20_TOKEN_SUPPLY = 20000000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const USDC_HOLDER = "0xe2644b0dc1b96C101d95421E95789eF6992B0E6A";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const aUSDC_Address = '0xBcca60bB61934080951369a648Fb03DF4F96263C';

const MKT1_DECS = 6;
const MKT2_DECS = 18;
const MY_BAL_FACTOR = new BN("500000000000000000"); //50%
const MY_MARKET_PERCENTAGE = new BN("1000000000000000000"); //100%
const MY_EXT_PROT_RET0 = new BN("25300000000000000"); //2,53%

let usdcContract, jFCContract, jATContract, jTrDeplContract, jAaveContract;
let /*ethTrAContract, ethTrBContract,*/ usdcTrAContract, usdcTrBContract;
let owner, user1, distCount, balTrA, balTrB;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);

const fromWei6Dec = (x) => x / Math.pow(10, 6);
const toWei6Dec = (x) => x * Math.pow(10, 6);

contract("JAave USDC & rewards", function (accounts) {

  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    owner = accounts[0];
    user1 = accounts[1];
    console.log(owner);
    console.log(await web3.eth.getBalance(owner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("SLICE total Supply", async function () {
    mySLICEContract = await mySLICE.deployed();
    result = await mySLICEContract.totalSupply();
    expect(fromWei(result.toString())).to.be.equal(MYERC20_TOKEN_SUPPLY.toString());
  });

  it("All other contracts ok", async function () {
    jFCContract = await JFeesCollector.deployed();
    expect(jFCContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jFCContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(jFCContract.address);

    jATContract = await JAdminTools.deployed();
    expect(jATContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jATContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(jATContract.address);

    jTrDeplContract = await JTranchesDeployer.deployed();
    expect(jTrDeplContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jTrDeplContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(jTrDeplContract.address);

    jAaveContract = await JAave.deployed();
    expect(jAaveContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jAaveContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(jAaveContract.address);
/*
    trParams0 = await jAaveContract.trancheAddresses(0);
    ethTrAContract = await JTrancheAToken.at(trParams0.ATrancheAddress);
    expect(ethTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(ethTrAContract.address);

    ethTrBContract = await JTrancheBToken.at(trParams0.BTrancheAddress);
    expect(ethTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(ethTrBContract.address);
*/
    trParams1 = await jAaveContract.trancheAddresses(3);
    usdcTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(usdcTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(usdcTrAContract.address);

    usdcTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(usdcTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(usdcTrBContract.address);

    incentiveControllerContract = await IncentivesController.deployed();
    expect(incentiveControllerContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(incentiveControllerContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(incentiveControllerContract.address);

    marketHelperContract = await MarketHelper.deployed();
    expect(marketHelperContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(marketHelperContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(marketHelperContract.address);

    chainlink1Contract = await Chainlink1.deployed();
    expect(chainlink1Contract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(chainlink1Contract.address).to.match(/0x[0-9a-fA-F]{40}/);
  });

  it("Sending USDC to user1", async function () {
    usdcContract = new web3.eth.Contract(USDC_ABI, USDC_ADDRESS);
    result = await usdcContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(USDC_HOLDER).call()) + " USDC");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: USDC_HOLDER, from: user1, value: web3.utils.toWei('2')})
    console.log(await web3.eth.getBalance(USDC_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await usdcContract.methods.transfer(user1, toWei6Dec(10000)).send({from: USDC_HOLDER})
    console.log("UnBlockedAccount USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(USDC_HOLDER).call()) + " USDC");
    console.log("user1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
  });

  it("user1 buys some token daiTrA", async function () {
    trAddresses = await jAaveContract.trancheAddresses(3);
    trPars = await jAaveContract.trancheParameters(3);
    trPar = await jAaveContract.trancheParameters(3);

    tx = await jAaveContract.calcRPBFromPercentage(3, {from: user1});

    trPar = await jAaveContract.trancheParameters(3);
    trParams = await jAaveContract.trancheAddresses(3);
    expect(trParams.buyerCoinAddress).to.be.equal(USDC_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aUSDC_Address);
    console.log("User1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(2000)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(3, toWei6Dec(2000), {from: user1});
    balTrA = await usdcTrAContract.balanceOf(user1)
    console.log("User1 New USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    console.log("User1 trA tokens: " + fromWei6Dec(await usdcTrAContract.balanceOf(user1)) + " JUBA");
    console.log("aUSDC_Address USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(aUSDC_Address).call()) + " USDC");
    console.log("JAave USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(jAaveContract.address).call()) + " USDC");
    console.log("JAave aUSDC balance: " + fromWei6Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei6Dec(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(3); 
    trPars = await jAaveContract.trancheParameters(3);
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  
  it("user1 buys some token daiTrB", async function () {
    console.log("User1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    trAddr = await jAaveContract.trancheAddresses(3);
    buyAddr = trAddr.buyerCoinAddress;

    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));
    console.log("TrB total supply: " + fromWei6Dec(await usdcTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3)));
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheBToken(3, toWei6Dec(1000), {from: user1});

    balTrB = await usdcTrBContract.balanceOf(user1)
    console.log("User1 New USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    console.log("User1 trB tokens: " + fromWei6Dec(await usdcTrBContract.balanceOf(user1)) + " JUBB");
    console.log("CErc20 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(aUSDC_Address).call()) + " USDC");
    console.log("JAave USDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3)));
    trAddresses = await jAaveContract.trancheAddresses(3);
    trPars = await jAaveContract.trancheParameters(3);
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it("add tranche to incentive controller", async function () {
    trATVL = await jAaveContract.getTrAValue(3);
    trBTVL = await jAaveContract.getTrBValue(3);
    totTrTVL = await jAaveContract.getTotalValue(3);
    console.log("trATVL: " + fromWei6Dec(trATVL) + ", trBTVL: " +
        fromWei6Dec(trBTVL) + ", totTVL: " + fromWei6Dec(totTrTVL));

    tx = await incentiveControllerContract.addTrancheMarket(jAaveContract.address, 3, MY_BAL_FACTOR, MY_MARKET_PERCENTAGE,
        MY_EXT_PROT_RET0, /*1000,*/ MKT1_DECS, toWei6Dec("1"), chainlink1Contract.address, false, {
            from: owner
        });

  })

  it("Adding rewards for duration #1", async function () {
    res1 = await incentiveControllerContract.availableMarkets(0)
    res2 = await incentiveControllerContract.availableMarketsRewards(0)
    console.log("Total TVL in Market0: " + (fromWei6Dec(await marketHelperContract.getTrancheMarketTVL(res1[0], res1[3], res2[0], MKT1_DECS)).toString()))

    trARet = await marketHelperContract.getTrancheAReturns(res1[0], res1[3]);
    console.log("mkt0 tranche A return: " + fromWei(trARet) * 100 + " %");
    trBRet = await marketHelperContract.getTrancheBReturns(res1[0], res1[3], res2[0], MKT1_DECS, res1[5]);
    console.log("mkt0 tranche B return: " + fromWei(trBRet) * 100 + " %");
    trBRewPerc = await marketHelperContract.getTrancheBRewardsPercentage(res1[0], res1[3], res2[0], MKT1_DECS, res1[5], res1[4]);
    console.log("mkt0 tranche B rewards percentage: " + fromWei(trBRewPerc) * 100 + " %");
    console.log("mkt0 tranche A rewards percentage: " + 100 - fromWei(trBRewPerc) * 100 + " %");

    await mySLICEContract.approve(incentiveControllerContract.address, toWei("25"), {
      from: owner
    })
    await incentiveControllerContract.updateRewardAmountsAllMarkets(toWei("25"), 1000, {
      from: owner
    })

    res = await incentiveControllerContract.availableMarketsRewards(0);
    distCount = res[5];
    console.log("distr counter: " + distCount.toString())

    res = await incentiveControllerContract.availableMarketsRewards(0)
    console.log("mkt0: A rewards: " + fromWei(res[3]) + ", B rewards: " + fromWei(res[4]) + ", rewards dur.: " + res[5]);
    mkt0trARewards = new BN(res[3].toString())
    mkt0trBRewards = new BN(res[4].toString())
    totRewards = new BN(res[3].toString()).add(new BN(res[4].toString()));

    res = await incentiveControllerContract.trancheARewardsInfo(0, distCount)
    // expect(fromWei(res[1].toString())).to.be.equal(fromWei((mkt0trARewards.divn(1000).toString())))
    console.log("mkt0 A rewardRate: " + fromWei(res[1]) + ", rewardPerTokenStored: " + fromWei(res[3]) + ", PeriodFinish: " + res[0]);
    mkt0trARRate = res[1]
    res = await incentiveControllerContract.trancheBRewardsInfo(0, distCount)
    // expect(fromWei(res[1].toString())).to.be.equal(fromWei((mkt0trBRewards.divn(1000).toString())))
    console.log("mkt0 B rewardRate: " + fromWei(res[1]) + ", rewardPerTokenStored: " + fromWei(res[3]) + ", PeriodFinish: " + res[0]);
    mkt0trBRRate = res[1]

    bal = await mySLICEContract.balanceOf(incentiveControllerContract.address)
    console.log("Incentive rew bal: " + fromWei(bal.toString()))

    res = await incentiveControllerContract.availableMarketsRewards(0);
    distCount = res[5];
    console.log("distr counter: " + distCount.toString())
  });

  it('time passes...', async function () {
    const maturity = Number(time.duration.seconds(500));
    let block = await web3.eth.getBlockNumber();
    console.log((await web3.eth.getBlock(block)).timestamp)

    await timeMachine.advanceTimeAndBlock(maturity);

    block = await web3.eth.getBlockNumber()
    console.log((await web3.eth.getBlock(block)).timestamp)

    rewTrATok = await incentiveControllerContract.trAEarned(0, user1, distCount, {from: user1})
    rewTrBTok = await incentiveControllerContract.trBEarned(0, user1, distCount, {from: user1})
    console.log(rewTrATok.toString(), rewTrBTok.toString())
  });

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JUBA");
    tot = await usdcTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " JUBA");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    tx = await usdcTrAContract.approve(jAaveContract.address, bal, {from: user1});

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString())
    currBal = await incentiveControllerContract.getCurrentBalanceTrA(0, user1, {from: user1})
    console.log(fromWei6Dec(currBal.toString()))

    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    await usdcTrAContract.approve(jAaveContract.address, balTrB, {from: user1});
    tx = await jAaveContract.redeemTrancheAToken(3, balTrB, {from: user1});

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString(), trARewInfo[3].toString())

    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JUBA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " USDC");
    // console.log("CErc20 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(aUSDC_Address).call()) + " USDC");
    console.log("JAave aUSDC.e balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    // await incentiveControllerContract.claimRewardsAllMarkets(user1, {from: user1})

    // console.log("Rewards total Value after: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");    

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it('time passes...', async function () {
    const maturity = Number(time.duration.seconds(400));
    let block = await web3.eth.getBlockNumber();
    console.log((await web3.eth.getBlock(block)).timestamp)

    await timeMachine.advanceTimeAndBlock(maturity);

    block = await web3.eth.getBlockNumber()
    console.log((await web3.eth.getBlock(block)).timestamp)

    rewTrATok = await incentiveControllerContract.trAEarned(0, user1, distCount, {from: user1})
    rewTrBTok = await incentiveControllerContract.trBEarned(0, user1, distCount, {from: user1})
    console.log(rewTrATok.toString(), rewTrBTok.toString())
  });

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JUBA");
    tot = await usdcTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " JUBA");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    tx = await usdcTrAContract.approve(jAaveContract.address, bal, {from: user1});

    availMkt = await incentiveControllerContract.availableMarkets(0)
    console.log(availMkt[1].toString())
    daiTrAContract2 = await JTrancheAToken.at(availMkt[1]);
    baltrAU1 = await daiTrAContract2.balanceOf(user1)
    console.log(baltrAU1.toString())
    baltrAU1 = await usdcTrAContract.balanceOf(user1)
    console.log(baltrAU1.toString())
    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString(), availMktRew[5].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString())
    trAEarn = await incentiveControllerContract.trAEarned(0, user1, 1, {from: user1})
    console.log("Rewards to be claimed before trA: " + trAEarn.toString())
    trBEarn = await incentiveControllerContract.trBEarned(0, user1, 1, {from: user1})
    console.log("Rewards to be claimed before trB: " + trBEarn.toString())

    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    tx = await jAaveContract.redeemTrancheAToken(3, bal, {from: user1});

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString(), availMktRew[5].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString())
    trAEarn = await incentiveControllerContract.trAEarned(0, user1, 1, {from: user1})
    console.log("Rewards to be claimed after: " +trAEarn.toString())

    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JUBA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " USDC");
    // console.log("CErc20 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(aUSDC_Address).call()) + " USDC");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    // await incentiveControllerContract.claimRewardsAllMarkets(user1, {from: user1})

    // console.log("Rewards total Value after: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");    

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it('time passes...', async function () {
    const maturity = Number(time.duration.seconds(100));
    let block = await web3.eth.getBlockNumber();
    console.log((await web3.eth.getBlock(block)).timestamp)

    await timeMachine.advanceTimeAndBlock(maturity);

    block = await web3.eth.getBlockNumber()
    console.log((await web3.eth.getBlock(block)).timestamp)

    rewTrATok = await incentiveControllerContract.trAEarned(0, user1, distCount, {from: user1})
    rewTrBTok = await incentiveControllerContract.trBEarned(0, user1, distCount, {from: user1})
    console.log(rewTrATok.toString(), rewTrBTok.toString())
  });

  it('time passes...', async function () {
    const maturity = Number(time.duration.seconds(1100));
    let block = await web3.eth.getBlockNumber();
    console.log((await web3.eth.getBlock(block)).timestamp)

    await timeMachine.advanceTimeAndBlock(maturity);

    block = await web3.eth.getBlockNumber()
    console.log((await web3.eth.getBlock(block)).timestamp)

    stkDetailsA = await jAaveContract.getSingleTrancheUserSingleStakeDetailsTrA(user1, 1, 1);
    stkDetailsB = await jAaveContract.getSingleTrancheUserSingleStakeDetailsTrB(user1, 1, 1);
    console.log(stkDetailsA[0].toString(), stkDetailsA[1].toString(), stkDetailsB[0].toString(), stkDetailsB[1].toString())

    amountA = await incentiveControllerContract.getHistoricalBalanceTrA(0, user1, 1, {from: user1})
    amountB = await incentiveControllerContract.getHistoricalBalanceTrB(0, user1, 1, {from: user1})
    console.log(amountA.toString(), amountB.toString())

    // rewTrATok = await incentiveControllerContract.rewardPerTrAToken(0, distCount, {from: user1})
    // rewTrBTok = await incentiveControllerContract.rewardPerTrBToken(0, distCount, {from: user1})
    // console.log(rewTrATok.toString(), rewTrBTok.toString())

    await incentiveControllerContract.freezeTotalSupplyAllMarkets({from: owner})
  });

  it('Check Historical Rewards for users', async function () {
    res = await incentiveControllerContract.availableMarketsRewards(0);
    distCount = res[5];
    console.log("distr counter: " + distCount.toString())

    balanceA1 = await incentiveControllerContract.trAEarned(0, user1, distCount, {from: user1})
    console.log("User1 Rewards mkt0 TrA: " + fromWei(balanceA1.toString()))

    balanceB1 = await incentiveControllerContract.trBEarned(0, user1, distCount, {from: user1})
    console.log("User1 Rewards mkt0 TrB: " + fromWei(balanceB1.toString()))

    ret = await incentiveControllerContract.getHistoricalUnclaimedRewardsAmountTrA(0, user1, {from: user1})
    console.log("Hist. Rew. mkt0 TrA: " + fromWei(ret.toString()))
    ret = await incentiveControllerContract.getHistoricalUnclaimedRewardsAmountTrB(0, user1, {from: user1})
    console.log("Hist. Rew. mkt0 TrB: " + fromWei(ret.toString()))
  });

  it("user1 buys some other token daiTrA", async function () {
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(500)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(3, toWei6Dec(500), {from: user1});

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it('time passes...', async function () {
    const maturity = Number(time.duration.seconds(100));
    let block = await web3.eth.getBlockNumber();
    console.log((await web3.eth.getBlock(block)).timestamp)

    await timeMachine.advanceTimeAndBlock(maturity);

    block = await web3.eth.getBlockNumber()
    console.log((await web3.eth.getBlock(block)).timestamp)

    rewTrATok = await incentiveControllerContract.trAEarned(0, user1, distCount, {from: user1})
    rewTrBTok = await incentiveControllerContract.trBEarned(0, user1, distCount, {from: user1})
    console.log(rewTrATok.toString(), rewTrBTok.toString())
  });

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JUBA");
    tot = await usdcTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " JUBA");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    tx = await usdcTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    tx = await jAaveContract.redeemTrancheAToken(3, bal, {from: user1});

    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JUBA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " USDC");
    console.log("CErc20 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(aUSDC_Address).call()) + " USDC");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it('time passes...', async function () {
    const maturity = Number(time.duration.seconds(100));
    let block = await web3.eth.getBlockNumber();
    console.log((await web3.eth.getBlock(block)).timestamp)

    await timeMachine.advanceTimeAndBlock(maturity);

    block = await web3.eth.getBlockNumber()
    console.log((await web3.eth.getBlock(block)).timestamp)

    rewTrATok = await incentiveControllerContract.trAEarned(0, user1, distCount, {from: user1})
    rewTrBTok = await incentiveControllerContract.trBEarned(0, user1, distCount, {from: user1})
    console.log(rewTrATok.toString(), rewTrBTok.toString())
  });

  it("user1 redeems token daiTrB", async function () {
    oldBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " USDC");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " JUBB");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    tx = await usdcTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3)));
    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));

    tx = await jAaveContract.redeemTrancheBToken(3, bal, {from: user1});
    
    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " USDC");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " JUBB");
    console.log("User1 trB interest: " + (newBal - oldBal) + " USDC");
    console.log("CErc20 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(aUSDC_Address).call()) + " USDC");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

});