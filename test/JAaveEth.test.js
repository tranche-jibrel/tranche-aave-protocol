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

// const fs = require('fs');
// const WETH_ABI = JSON.parse(fs.readFileSync('./test/utils/WAVAX.abi', 'utf8'));

var JFeesCollector = artifacts.require("JFeesCollector");
var JAdminTools = artifacts.require("JAdminTools");

var JAave = artifacts.require('JAave');
var JTranchesDeployer = artifacts.require('JTranchesDeployer');

var JTrancheAToken = artifacts.require('JTrancheAToken');
var JTrancheBToken = artifacts.require('JTrancheBToken');

const aaveIncentiveController = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5';

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const aWETH_Address = '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e';

let jFCContract, jATContract, jTrDeplContract, jAaveContract;
let ethTrAContract, ethTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());

contract("JAave ETH", function(accounts) {
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
    ethTrAContract = await JTrancheAToken.at(trParams0.ATrancheAddress);
    expect(ethTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(ethTrAContract.address);

    ethTrBContract = await JTrancheBToken.at(trParams0.BTrancheAddress);
    expect(ethTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(ethTrBContract.address);
  });

  it("user1 buys some ETH TrA", async function () {
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
    expect(trParams.buyerCoinAddress).to.be.equal(ETH_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aWETH_Address);
    console.log("user1 ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");

    tx = await jAaveContract.buyTrancheAToken(0, toWei(10), {from: user1, value: toWei(10)});

    console.log("user1 New ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");
    console.log("user1 trA tokens: " + fromWei(await ethTrAContract.balanceOf(user1)) + " JEA");
    console.log("JAave ETH balance: " + fromWei(await web3.eth.getBalance(jAaveContract.address)) + " ETH");
    console.log("JAave aWETH balance: " + fromWei(await jAaveContract.getTokenBalance(aWETH_Address)) + " aWETH");
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(0); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(0);
    // console.log("JAave Price: " + await jCompHelperContract.getCompoundPriceHelper(1));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)) + " ETH");
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)) + " ETH");

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some other token ETH TrA", async function () {
    tx = await jAaveContract.buyTrancheAToken(0, toWei(5), {from: user1, value: toWei(5)});

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 0, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token WETHTrB", async function () {
    console.log("User1 ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");
    trAddr = await jAaveContract.trancheAddresses(0);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));
    console.log("TrB total supply: " + fromWei(await ethTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(0, 0)));

    // tx = await wethContract.methods.approve(jAaveContract.address, toWei(100)).send({from: user1});
    // tx = await jAaveContract.buyTrancheBToken(0, toWei(10), {from: user1, value: toWei(10)});
    tx = await jAaveContract.buyTrancheBToken(0, toWei(5), {from: user1, value: toWei(5)});

    console.log("User1 New ETH balance: " + fromWei(await web3.eth.getBalance(user1)) + " ETH");
    console.log("User1 trB tokens: " + fromWei(await ethTrBContract.balanceOf(user1)) + " JEB");
    console.log("JAave ETH balance: " + fromWei(await jAaveContract.getTokenBalance(aWETH_Address)) + " aWETH");
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

  it("user1 redeems token ETH TrA", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 ETH balance: "+ oldBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JEA");
    tot = await ethTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " JEA");
    console.log("JAave aWETH balance: "+ fromWei(await jAaveContract.getTokenBalance(aWETH_Address)) + " aWETH");
    tx = await ethTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(0);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    // console.log("aWETH price per full shares Normalized: " + fromWei(await jAaveContract.getYVaultNormPrice(0)))

    tx = await jAaveContract.redeemTrancheAToken(0, bal, {from: user1});

    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New ETH balance: "+ newBal + " ETH");
    bal = await ethTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JEA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " ETH");
    console.log("JAave new ETH balance: "+ fromWei(await jAaveContract.getTokenBalance(aWETH_Address)) + " aWETH");
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

  it("user1 redeems token ETH TrB", async function () {
    oldBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 ETH balance: "+ oldBal + " ETH");
    bal = await ethTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JEB");
    console.log("JAave aWETH balance: "+ fromWei(await jAaveContract.getTokenBalance(aWETH_Address)) + " aWETH");
    tx = await ethTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(0, 0)));
    console.log("TrB value: " +  fromWei(await jAaveContract.getTrBValue(0)));

    tx = await jAaveContract.redeemTrancheBToken(0, bal, {from: user1});

    newBal = fromWei(await web3.eth.getBalance(user1));
    console.log("User1 New ETH balance: "+ newBal + " ETH");
    bal = await ethTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JEB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " ETH");
    console.log("JAave new aWETH balance: "+ fromWei(await jAaveContract.getTokenBalance(aWETH_Address)) + " aWETH");
    console.log("TrA Value: " + fromWei(await jAaveContract.getTrAValue(0)));
    console.log("TrB value: " +  fromWei(await jAaveContract.getTrBValue(0)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(0)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 0)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 0, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 

  it('calling unfrequently functions', async function () {
    await jAaveContract.setNewEnvironment(jATContract.address, jFCContract.address, jTrDeplContract.address, 
      aaveIncentiveController, WETH_ADDRESS, {from: tokenOwner})

    await jAaveContract.setBlocksPerYear(31536000, {from: tokenOwner})

    await jAaveContract.setAaveIncentiveControllerAddress(aaveIncentiveController, {from: tokenOwner})

    await jAaveContract.getDataProvider()
    await jAaveContract.getAllATokens()
    await jAaveContract.getAllReservesTokens()
    await jAaveContract.getAaveReserveData(3)
    await jAaveContract.getLendingPool()
    await jAaveContract.getTrancheACurrentRPB(3)
    await jAaveContract.getAaveUnclaimedRewards()

    await jAaveContract.setDecimals(3, 6, {from: tokenOwner})

    await jAaveContract.setTrancheRedemptionPercentage(1, 9950, {from: tokenOwner})

    await jAaveContract.setRedemptionTimeout(3, {from: tokenOwner})

    await jAaveContract.setTrancheAFixedPercentage(1, web3.utils.toWei("0.03", "ether"), {from: tokenOwner})

    await jAaveContract.withdrawEthToFeesCollector(0, {from: tokenOwner})

    await jAaveContract.claimAaveRewards()

    await jAaveContract.claimAaveRewardsSingleAsset(aWETH_Address, 0, {from: tokenOwner})
  });

});
