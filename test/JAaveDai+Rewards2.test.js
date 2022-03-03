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

const Chainlink1 = artifacts.require("./mocks/Chainlink1.sol");
const Chainlink2 = artifacts.require("./mocks/Chainlink2.sol");

const MarketHelper = artifacts.require("./MarketHelper.sol");
const PriceHelper = artifacts.require("./PriceHelper.sol");
const IncentivesController = artifacts.require("./IncentivesController.sol");

const MYERC20_TOKEN_SUPPLY = 20000000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DAI_HOLDER = "0x38720D56899d46cAD253d08f7cD6CC89d2c83190";
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const aDAI_Address = '0x028171bCA77440897B824Ca71D1c56caC55b68A3';

const MKT1_DECS = 18;
const MKT2_DECS = 18;
const MY_BAL_FACTOR = new BN("500000000000000000"); //50%
const MY_MARKET_PERCENTAGE = new BN("1000000000000000000"); //100%
const MY_EXT_PROT_RET0 = new BN("25300000000000000"); //2,53%

let daiContract, jFCContract, jATContract, jTrDeplContract, jAaveContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract;
let owner, user1, distCount, balTrA, balTrB;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);

contract("JAave DAI + Rewards 2", function (accounts) {

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

    trParams1 = await jAaveContract.trancheAddresses(1);
    daiTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(daiTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(daiTrAContract.address);

    daiTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(daiTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    // console.log(daiTrBContract.address);

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

  it("Sending DAI to user1", async function () {
    daiContract = new web3.eth.Contract(DAI_ABI, DAI_ADDRESS);
    result = await daiContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount DAI balance: " + fromWei(await daiContract.methods.balanceOf(DAI_HOLDER).call()) + " DAI");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: DAI_HOLDER, from: user1, value: toWei('2')})
    console.log(await web3.eth.getBalance(DAI_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await daiContract.methods.transfer(user1, toWei(10000)).send({from: DAI_HOLDER})
    console.log("UnBlockedAccount DAI balance: " + fromWei(await daiContract.methods.balanceOf(DAI_HOLDER).call()) + " DAI");
    console.log("user1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
  });

  it("user1 buys some token daiTrA", async function () {
    tx = await jAaveContract.calcRPBFromPercentage(1, {from: user1});

    trPar = await jAaveContract.trancheParameters(1);
    trParams = await jAaveContract.trancheAddresses(1);

    expect(trParams.buyerCoinAddress).to.be.equal(DAI_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aDAI_Address);
    console.log("User1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(2000)).send({from: user1});

    tx = await jAaveContract.buyTrancheAToken(1, toWei(2000), {from: user1});

    balTrA = await daiTrAContract.balanceOf(user1)
    console.log("User1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("User1 trA tokens: " + fromWei(await daiTrAContract.balanceOf(user1)) + " DTA");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave DAI balance: " + fromWei(await daiContract.methods.balanceOf(jAaveContract.address).call()) + " DAI");
    console.log("JAave cDAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  
  it("user1 buys some token daiTrB", async function () {
    console.log("User1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");

    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));
    console.log("TrB total supply: " + fromWei(await daiTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheBToken(1, toWei(1000), {from: user1});

    balTrB = await daiTrBContract.balanceOf(user1)
    console.log("User1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("User1 trB tokens: " + fromWei(await daiTrBContract.balanceOf(user1)) + " DTB");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave DAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));

    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it("user1 buys some token daiTrB", async function () {
    console.log("User1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");

    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));
    console.log("TrB total supply: " + fromWei(await daiTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(1000)).send({from: user1});

    tx = await jAaveContract.buyTrancheBToken(1, toWei(1000), {from: user1});

    balTrB = await daiTrBContract.balanceOf(user1)
    console.log("User1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("User1 trB tokens: " + fromWei(await daiTrBContract.balanceOf(user1)) + " DTB");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave DAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));

    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });

  it("add tranche to incentive controller", async function () {
    trATVL = await jAaveContract.getTrAValue(1);
    trBTVL = await jAaveContract.getTrBValue(1);
    totTrTVL = await jAaveContract.getTotalValue(1);
    console.log("trATVL: " + fromWei(trATVL) + ", trBTVL: " + fromWei(trBTVL) + ", totTVL: " + fromWei(totTrTVL));

    tx = await incentiveControllerContract.addTrancheMarket(jAaveContract.address, 1, MY_BAL_FACTOR, MY_MARKET_PERCENTAGE,
        MY_EXT_PROT_RET0, /*1000,*/ MKT2_DECS, toWei("1"), chainlink1Contract.address, false, {from: owner});

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
    //trARewPerc = toWei('1').sub(trBRewPerc);
    console.log("mkt0 tranche A rewards percentage: " + 100 - fromWei(trBRewPerc) * 100 + " %");

    await mySLICEContract.approve(incentiveControllerContract.address, toWei(25), {
      from: owner
    })
    await incentiveControllerContract.updateRewardAmountsAllMarkets(toWei(25), 1000, {
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
    console.log("mkt0 A rewardRate: " + fromWei(res[1]) + ", rewardPerTokenStored: " + fromWei(res[3]) + ", PeriodFinish: " + res[0]);
    mkt0trARRate = res[1]
    res = await incentiveControllerContract.trancheBRewardsInfo(0, distCount)
    console.log("mkt0 B rewardRate: " + fromWei(res[1]) + ", rewardPerTokenStored: " + fromWei(res[3]) + ", PeriodFinish: " + res[0]);
    mkt0trBRRate = res[1]

    bal = await mySLICEContract.balanceOf(incentiveControllerContract.address)
    console.log("Incentive rew bal: " + fromWei(bal.toString()))

    res = await incentiveControllerContract.availableMarketsRewards(0);
    distCount = res[5];
    console.log("distr counter: " + distCount.toString())
  });

  it('time passes...', async function () {
    const maturity = Number(time.duration.seconds(1200));
    let block = await web3.eth.getBlockNumber();
    console.log((await web3.eth.getBlock(block)).timestamp)

    await timeMachine.advanceTimeAndBlock(maturity);

    block = await web3.eth.getBlockNumber()
    console.log((await web3.eth.getBlock(block)).timestamp)

    rewTrATok = await incentiveControllerContract.trAEarned(0, user1, distCount, {from: user1})
    rewTrBTok = await incentiveControllerContract.trBEarned(0, user1, distCount, {from: user1})
    console.log(rewTrATok.toString(), rewTrBTok.toString())
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

  it("Adding rewards for duration #2", async function () {
    res1 = await incentiveControllerContract.availableMarkets(0)
    res2 = await incentiveControllerContract.availableMarketsRewards(0)
    console.log("Total TVL in Market0: " + (fromWei(await marketHelperContract.getTrancheMarketTVL(res1[0], res1[3], res2[0], MKT2_DECS)).toString()))

    trARet = await marketHelperContract.getTrancheAReturns(res1[0], res1[3]);
    console.log("mkt0 tranche A return: " + fromWei(trARet) * 100 + " %");
    trBRet = await marketHelperContract.getTrancheBReturns(res1[0], res1[3], res2[0], MKT2_DECS, res1[5]);
    console.log("mkt0 tranche B return: " + fromWei(trBRet) * 100 + " %");
    trBRewPerc = await marketHelperContract.getTrancheBRewardsPercentage(res1[0], res1[3], res2[0], MKT2_DECS, res1[5], res1[4]);
    console.log("mkt0 tranche B rewards percentage: " + fromWei(trBRewPerc) * 100 + " %");
    //trARewPerc = toWei('1').sub(trBRewPerc);
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

  it("user1 buys some token daiTrA", async function () {
    tx = await jAaveContract.calcRPBFromPercentage(1, {
      from: user1
    });

    trPar = await jAaveContract.trancheParameters(1);
    trParams = await jAaveContract.trancheAddresses(1);
    expect(trParams.buyerCoinAddress).to.be.equal(DAI_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aDAI_Address);
    console.log("User1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(1000)).send({from: user1});

    tx = await jAaveContract.buyTrancheAToken(1, toWei(1000), {from: user1});

    balTrA = await daiTrAContract.balanceOf(user1)
    console.log("User1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("User1 trA tokens: " + fromWei(await daiTrAContract.balanceOf(user1)) + " DTA");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave DAI balance: " + fromWei(await daiContract.methods.balanceOf(jAaveContract.address).call()) + " DAI");
    console.log("JAave cDAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
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
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " DTA");
    tot = await daiTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " DTA");
    console.log("JAave aDAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    tx = await daiTrAContract.approve(jAaveContract.address, bal, {
      from: user1
    });

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString())
    currBal = await incentiveControllerContract.getCurrentBalanceTrA(0, user1, {from: user1})
    console.log(fromWei(currBal.toString()))

    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    tx = await jAaveContract.redeemTrancheAToken(1, balTrB, {
      from: user1
    });

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString(), trARewInfo[3].toString())

    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " DTA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " DAI");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave new DAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    // await incentiveControllerContract.claimRewardsAllMarkets(user1, {from: user1})

    // console.log("Rewards total Value after: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");    

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
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

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " DTA");
    tot = await daiTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " DTA");
    console.log("JAave aDAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    tx = await daiTrAContract.approve(jAaveContract.address, bal, {
      from: user1
    });

    availMkt = await incentiveControllerContract.availableMarkets(0)
    console.log(availMkt[1].toString())

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString(), availMktRew[5].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString())
    trAEarn1 = await incentiveControllerContract.trAEarned(0, user1, 1, {from: user1})
    trAEarn2 = await incentiveControllerContract.trAEarned(0, user1, 2, {from: user1})
    trAEarn = trAEarn1.add(trAEarn2)
    console.log("Rewards to be claimed before trA: " + trAEarn.toString())
    trBEarn1 = await incentiveControllerContract.trBEarned(0, user1, 1, {from: user1})
    trBEarn2 = await incentiveControllerContract.trBEarned(0, user1, 2, {from: user1})
    trBEarn = trBEarn1.add(trBEarn2)
    console.log("Rewards to be claimed before trB: " + trBEarn.toString())


    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    tx = await jAaveContract.redeemTrancheAToken(1, bal, {
      from: user1
    });

    availMktRew = await incentiveControllerContract.availableMarketsRewards(0)
    console.log(availMktRew[3].toString(), availMktRew[5].toString())
    trARewPaid = await incentiveControllerContract.userRewardPerTokenTrAPaid(0, 1, user1, {from: user1})
    console.log("trA Rewards Paid: " + trARewPaid)
    trARewInfo = await incentiveControllerContract.trancheARewardsInfo(0, 1)
    console.log(trARewInfo[2].toString())
    trAEarn = await incentiveControllerContract.trAEarned(0, user1, 1, {from: user1})
    console.log("Rewards to be claimed after: " +trAEarn.toString())

    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " DTA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " DAI");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave new DAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 1);
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
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(500)).send({from: user1});

    tx = await jAaveContract.buyTrancheAToken(1, toWei(500), {from: user1});

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 1);
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

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " DTA");
    tot = await daiTrAContract.totalSupply();
    console.log("trA tokens total: " + fromWei(tot) + " DTA");
    console.log("JAave aDAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    tx = await daiTrAContract.approve(jAaveContract.address, bal, {
      from: user1
    });
    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    tx = await jAaveContract.redeemTrancheAToken(1, bal, {
      from: user1
    });
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: " + fromWei(bal) + " DTA");
    console.log("User1 trA interest: " + (newBal - oldBal) + " DAI");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave new DAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 1, 1);
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

  it("user1 redeems token daiTrB", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: " + oldBal + " DAI");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " DTB");
    console.log("JAave aDAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    tx = await daiTrBContract.approve(jAaveContract.address, bal, {
      from: user1
    });
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    tx = await jAaveContract.redeemTrancheBToken(1, bal, {
      from: user1
    });
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: " + newBal + " DAI");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: " + fromWei(bal) + " DTB");
    console.log("User1 trB interest: " + (newBal - oldBal) + " DAI");
    console.log("aDAI_Address DAI balance: " + fromWei(await daiContract.methods.balanceOf(aDAI_Address).call()) + " DAI");
    console.log("JAave new DAI balance: " + fromWei(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));

    console.log("Rewards total Value before: " + fromWei(await mySLICEContract.balanceOf(user1)) + " SLICE");

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString())
  });


});