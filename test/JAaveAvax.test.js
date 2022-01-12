require("dotenv").config();
const { expect } = require("chai");
const {
  BN,
  constants,
  ether,
  time,
  balance,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

const Web3 = require('web3');
// Ganache UI on 8545
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const fs = require('fs');
const WETH_ABI = JSON.parse(fs.readFileSync('./test/utils/WAVAX.abi', 'utf8'));

var JFeesCollector = artifacts.require("JFeesCollector");
var JAdminTools = artifacts.require("JAdminTools");

var JAave = artifacts.require('JAave');
var JTranchesDeployer = artifacts.require('JTranchesDeployer');

var JTrancheAToken = artifacts.require('JTrancheAToken');
var JTrancheBToken = artifacts.require('JTrancheBToken');

var IncentivesController = artifacts.require('./IncentivesController');

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
// const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const AVAX_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// const LendingPoolAddressesProvider = '0x88757f2f99175387aB4C6a4b3067c77A695b0349';
const LendingPoolAddressesProvider = '0xb6A86025F0FE1862B372cb0ca18CE3EDe02A318f'; // AVAX mainnet

const avWAVAX_Address = '0xDFE521292EcE2A4f44242efBcD66Bc594CA9714B';

// const aaveIncentiveController = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5';
const aaveIncentiveController = '0x01D83Fe6A10D2f2B7AF17034343746188272cAc9';  // AVAX Mainnet

let jFCContract, jATContract, jTrDeplContract, jAaveContract;
let avaxTrAContract, avaxTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());

contract("JAave AVAX", function(accounts) {
  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
  });

  it("All other contracts ok", async function () {
    jFCContract = await JFeesCollector.deployed();
    expect(jFCContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jFCContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jFCContract.address);

    jATContract = await JAdminTools.deployed();
    expect(jATContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jATContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jATContract.address);

    jTrDeplContract = await JTranchesDeployer.deployed();
    expect(jTrDeplContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jTrDeplContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jTrDeplContract.address);

    jAaveContract = await JAave.deployed();
    expect(jAaveContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jAaveContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jAaveContract.address);

    trParams0 = await jAaveContract.trancheAddresses(0);
    avaxTrAContract = await JTrancheAToken.at(trParams0.ATrancheAddress);
    expect(avaxTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(avaxTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(avaxTrAContract.address);

    avaxTrBContract = await JTrancheBToken.at(trParams0.BTrancheAddress);
    expect(avaxTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(avaxTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(avaxTrBContract.address);

    trParams1 = await jAaveContract.trancheAddresses(0);
    daiTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(daiTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrAContract.address);

    daiTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(daiTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrBContract.address);

    trParams2 = await jAaveContract.trancheAddresses(2);
    wbtcTrAContract = await JTrancheAToken.at(trParams2.ATrancheAddress);
    expect(wbtcTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(wbtcTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(wbtcTrAContract.address);

    wbtcTrBContract = await JTrancheBToken.at(trParams2.BTrancheAddress);
    expect(wbtcTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(wbtcTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(wbtcTrBContract.address);
  });

  it("user1 buys some AVAX TrA", async function () {
    await jAaveContract.setTrancheRedemptionPercentage(0, 9990)

    trAddresses = await jAaveContract.trancheAddresses(0); //.aTokenAddress;
    console.log("addresses tranche A: " + JSON.stringify(trAddresses, ["buyerCoinAddress", "aTokenAddress", "ATrancheAddress", "BTrancheAddress"]));
    trPar = await jAaveContract.trancheParameters(0);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", 
          "storedTrancheAPrice", "trancheACurrentRPB", "underlyingDecimals"]));
    tx = await jAaveContract.calcRPBFromPercentage(0, {from: user1});

    trPar = await jAaveContract.trancheParameters(0);
    console.log("rps tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + fromWei(trPar[2].toString()));
    trParams = await jAaveContract.trancheAddresses(0);
    expect(trParams.buyerCoinAddress).to.be.equal(AVAX_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(avWAVAX_Address);
    console.log("user1 AVAX balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");

    tx = await jAaveContract.buyTrancheAToken(0, toWei(10), {from: user1, value: toWei(10)});

    console.log("user1 New AVAX balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    console.log("user1 trA tokens: " + fromWei(await avaxTrAContract.balanceOf(user1)) + " JAA");
    console.log("JAave AVAX balance: " + fromWei(await web3.eth.getBalance(jAaveContract.address)) + " AVAX");
    console.log("JAave avWAVAX balance: " + fromWei(await jAaveContract.getTokenBalance(avWAVAX_Address)) + " avWAVAX");
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(0); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(0);
    // console.log("JAave Price: " + await jCompHelperContract.getCompoundPriceHelper(1));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)) + " AVAX");
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)) + " AVAX");

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some other token AVAX TrA", async function () {
    tx = await jAaveContract.buyTrancheAToken(0, toWei(5), {from: user1, value: toWei(5)});

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token WETHTrB", async function () {
    console.log("User1 AVAX balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    trAddr = await jAaveContract.trancheAddresses(0);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));
    console.log("TrB total supply: " + fromWei(await avaxTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(0, 0)));

    // tx = await wethContract.methods.approve(jAaveContract.address, toWei(100)).send({from: user1});
    // tx = await jAaveContract.buyTrancheBToken(0, toWei(10), {from: user1, value: toWei(10)});
    tx = await jAaveContract.buyTrancheBToken(0, toWei(55), {from: user1, value: toWei(55)});

    console.log("User1 New AVAX balance: " + fromWei(await web3.eth.getBalance(user1)) + " AVAX");
    console.log("User1 trB tokens: " + fromWei(await avaxTrBContract.balanceOf(user1)) + " JAB");
    console.log("JAave AVAX balance: " + fromWei(await jAaveContract.getTokenBalance(avWAVAX_Address)) + " avWAVAX");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(0, 0)));
    trAddresses = await jAaveContract.trancheAddresses(0);
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token AVAX TrA", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 AVAX balance: "+ oldBal + " AVAX");
    bal = await avaxTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JAA");
    tot = await avaxTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " JAA");
    console.log("JAave avWAVAX balance: "+ fromWei(await jAaveContract.getTokenBalance(avWAVAX_Address)) + " avWAVAX");
    tx = await avaxTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    // console.log("avWAVAX price per full shares Normalized: " + fromWei(await jAaveContract.getYVaultNormPrice(0)))

    tx = await jAaveContract.redeemTrancheAToken(0, bal, {from: user1});

    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New AVAX balance: "+ newBal + " AVAX");
    bal = await avaxTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JAA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " AVAX");
    console.log("JAave new AVAX balance: "+ fromWei(await jAaveContract.getTokenBalance(avWAVAX_Address)) + " avWAVAX");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token AVAX TrB", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 AVAX balance: "+ oldBal + " AVAX");
    bal = await avaxTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JAB");
    console.log("JAave avWAVAX balance: "+ fromWei(await jAaveContract.getTokenBalance(avWAVAX_Address)) + " avWAVAX");
    tx = await avaxTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(0, 0)));
    console.log("TrB value: " +  fromWei(await jAaveContract.getTrBValue(0)));

    tx = await jAaveContract.redeemTrancheBToken(0, bal, {from: user1});

    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New AVAX balance: "+ newBal + " AVAX");
    bal = await avaxTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JAB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " AVAX");
    console.log("JAave new avWAVAX balance: "+ fromWei(await jAaveContract.getTokenBalance(avWAVAX_Address)) + " avWAVAX");
    console.log("TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB value: " +  fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 
/*
  describe('higher percentage for test coverage', function() {
    it('calling unfrequently functions', async function () {
      await jAaveContract.setNewEnvironment(jATContract.address, jFCContract.address, jTrDeplContract.address, {from: tokenOwner})

      await jAaveContract.setDecimals(1, 18)

      await jAaveContract.setRedemptionTimeout(3)

      await jAaveContract.setTrancheAFixedPercentage(1, web3.utils.toWei("0.03", "ether"))

      await jAaveContract.getTrancheACurrentRPS(1)

      await jAaveContract.setTrAStakingDetails(1, user1, 1, 0, 1634150567)
      await jAaveContract.getSingleTrancheUserStakeCounterTrA(user1, 1)
      await jAaveContract.getSingleTrancheUserSingleStakeDetailsTrA(user1, 1, 1)

      await jAaveContract.setTrBStakingDetails(1, user1, 1, 0, 1634150567)
      await jAaveContract.getSingleTrancheUserStakeCounterTrB(user1, 1)
      await jAaveContract.getSingleTrancheUserSingleStakeDetailsTrB(user1, 1, 1)

      await jAaveContract.transferTokenToFeesCollector(WETH_ADDRESS, 0)

      await jAaveContract.getSirControllerAddress()
      
      const YFI_TOKEN_ADDRESS = '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e';
      const YFI_REWARDS_ADDRESS = '0xcc9EFea3ac5Df6AD6A656235Ef955fBfEF65B862';
      await jAaveContract.setYFIAddresses(YFI_TOKEN_ADDRESS, YFI_REWARDS_ADDRESS)

      await jAaveContract.getYFIUnclaimedRewardShares()
      await expectRevert(jAaveContract.claimYearnRewards(10), "JAave: not enough YFI tokens to claim rewards")

    });
  })*/
});
