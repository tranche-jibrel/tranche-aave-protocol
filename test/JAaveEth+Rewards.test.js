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
const DAI_ABI = JSON.parse(fs.readFileSync('./test/utils/Dai.abi', 'utf8'));

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
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const aWETH_Address = '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e';

const MKT1_DECS = 18;
const MKT2_DECS = 18;
const MY_BAL_FACTOR = new BN("500000000000000000"); //50%
const MY_MARKET_PERCENTAGE = new BN("1000000000000000000"); //100%
const MY_EXT_PROT_RET0 = new BN("25300000000000000"); //2,53%

let jFCContract, jATContract, jTrDeplContract, jAaveContract;
let ethTrAContract, ethTrBContract;
let owner, user1, distCount, balTrA, balTrB;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);

contract("JAave Avax & rewards", function (accounts) {

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

    trParams0 = await jAaveContract.trancheAddresses(0);
    ethTrAContract = await JTrancheAToken.at(trParams0.ATrancheAddress);
    expect(ethTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(ethTrAContract.address);

    ethTrBContract = await JTrancheBToken.at(trParams0.BTrancheAddress);
    expect(ethTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(ethTrBContract.address);

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

  it("user1 buys some token ETH TrA", async function () {
    trAddresses = await jAaveContract.trancheAddresses(0);
    trPars = await jAaveContract.trancheParameters(0);
    trPar = await jAaveContract.trancheParameters(0);

    tx = await jAaveContract.calcRPBFromPercentage(1, {from: user1});

    trPar = await jAaveContract.trancheParameters(0);
    trParams = await jAaveContract.trancheAddresses(0);
    expect(trParams.buyerCoinAddress).to.be.equal(ETH_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aWETH_Address);
    console.log("user1 ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");

    tx = await jAaveContract.buyTrancheAToken(0, toWei(10), {from: user1, value: toWei(10)});
    balTrA = await ethTrAContract.balanceOf(user1)
    console.log("User1 New ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");
    console.log("User1 trA tokens: " + fromWei(await ethTrAContract.balanceOf(user1)) + " JEA");

    console.log("JAave ETH balance: " + fromWei(await await web3.eth.getBalance(jAaveContract.address)) + " ETH");
    console.log("JAave aETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(0); 
    trPars = await jAaveContract.trancheParameters(0);
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  
  it("user1 buys some token ethTrB", async function () {
    console.log("user1 ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");
    trAddr = await jAaveContract.trancheAddresses(0);
    buyAddr = trAddr.buyerCoinAddress;

    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));
    console.log("TrB total supply: " + fromWei(await ethTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    tx = await jAaveContract.buyTrancheBToken(0, toWei(10), {from: user1, value: toWei(10)});

    balTrB = await ethTrBContract.balanceOf(user1)
    console.log("User1 New ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");
    console.log("User1 trB tokens: " + fromWei(await ethTrBContract.balanceOf(user1)) + " JEB");
    console.log("avDAI ETH balance: " + fromWei(await web3.eth.getBalance(aWETH_Address)) + " ETH");
    console.log("JAave ETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    trAddresses = await jAaveContract.trancheAddresses(0);
    trPars = await jAaveContract.trancheParameters(0);
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it("add tranche to incentive controller", async function () {
    trATVL = await jAaveContract.getTrAValue(0);
    trBTVL = await jAaveContract.getTrBValue(0);
    totTrTVL = await jAaveContract.getTotalValue(0);
    console.log("trATVL: " + fromWei(trATVL) + ", trBTVL: " +
        fromWei(trBTVL) + ", totTVL: " + fromWei(totTrTVL));

    tx = await incentiveControllerContract.addTrancheMarket(jAaveContract.address, 0, MY_BAL_FACTOR, MY_MARKET_PERCENTAGE,
        MY_EXT_PROT_RET0, /*1000,*/ MKT2_DECS, toWei("1"), chainlink1Contract.address, false, {
            from: owner
        });

  })

  it("Adding rewards for duration #1", async function () {
    res1 = await incentiveControllerContract.availableMarkets(0)
    res2 = await incentiveControllerContract.availableMarketsRewards(0)
    console.log("Total TVL in Market0: " + (fromWei(await marketHelperContract.getTrancheMarketTVL(res1[0], res1[3], res2[0], MKT2_DECS)).toString()))

    trARet = await marketHelperContract.getTrancheAReturns(res1[0], res1[3]);
    console.log("mkt0 tranche A return: " + fromWei(trARet) * 100 + " %");
    trBRet = await marketHelperContract.getTrancheBReturns(res1[0], res1[3], res2[0], MKT2_DECS, res1[5]);
    console.log("mkt0 tranche B return: " + fromWei(trBRet) * 100 + " %");
    trBRewPerc = await marketHelperContract.getTrancheBRewardsPercentage(res1[0], res1[3], res2[0], MKT2_DECS, res1[5], res1[4]);
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

  it("user1 redeems token ethTrA", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 ETH balance: " + oldBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JEA");
    tot = await ethTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " JEA");
    console.log("JAave aETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    tx = await ethTrAContract.approve(jAaveContract.address, bal, {from: user1});

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString())
    currBal = await incentiveControllerContract.getCurrentBalanceTrA(0, user1, {from: user1})
    console.log(fromWei(currBal.toString()))

    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    await ethTrAContract.approve(jAaveContract.address, balTrB, {from: user1});
    tx = await jAaveContract.redeemTrancheAToken(0, toWei(4), {from: user1});

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString(), trARewInfo[3].toString())

    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Avax balance: " + newBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JEA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " ETH");
    console.log("JAave new aETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 2);
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

  it("user1 redeems token ethTrA", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 Avax balance: " + oldBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JEA");
    tot = await ethTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " JEA");
    console.log("JAave aETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    tx = await ethTrAContract.approve(jAaveContract.address, bal, {from: user1});

    availMkt = await incentiveControllerContract.availableMarkets(0)
    console.log(availMkt[1].toString())
    daiTrAContract2 = await JTrancheAToken.at(availMkt[1]);
    baltrAU1 = await daiTrAContract2.balanceOf(user1)
    console.log(baltrAU1.toString())
    baltrAU1 = await ethTrAContract.balanceOf(user1)
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

    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    tx = await jAaveContract.redeemTrancheAToken(0, bal, {from: user1});

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString(), availMktRew[5].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString())
    trAEarn = await incentiveControllerContract.trAEarned(0, user1, 1, {from: user1})
    console.log("Rewards to be claimed after: " +trAEarn.toString())

    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Avax balance: " + newBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JEA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " ETH");
    console.log("JAave new ETH balance: " + fromWei(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    // await incentiveControllerContract.claimRewardsAllMarkets(user1, {from: user1})

    // console.log("Rewards total Value after: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");    

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 2);
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

  it("user1 buys some other token ethTrA", async function () {
    tx = await jAaveContract.buyTrancheAToken(0, toWei(5), {from: user1, value: toWei(5)});

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 2);
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

  it("user1 redeems token ethTrA", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 Avax balance: " + oldBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JEA");
    tot = await ethTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " JEA");
    console.log("JAave aETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    tx = await ethTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    tx = await jAaveContract.redeemTrancheAToken(0, bal, {from: user1});

    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Avax balance: " + newBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " JEA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " ETH");
    console.log("JAave new aETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 2);
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

  it("user1 redeems token ethTrB", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 Avax balance: " + oldBal + " ETH");
    bal = await ethTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " JEB");
    console.log("JAave aETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    tx = await ethTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(0)));

    tx = await jAaveContract.redeemTrancheBToken(0, bal, {from: user1});
    
    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New Avax balance: " + newBal + " ETH");
    bal = await ethTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " JEB");
    console.log("User1 trB interest: " + (newBal - oldBal) + " ETH");
    console.log("JAave new ETH balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWETH_Address)) + " aETH");
    console.log("TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

});