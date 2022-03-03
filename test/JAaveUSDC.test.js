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

const timeMachine = require('ganache-time-traveler');

const fs = require('fs');
const USDC_ABI = JSON.parse(fs.readFileSync('./test/utils/USDC.abi', 'utf8'));

const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JAave = artifacts.require('JAave');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

const {ZERO_ADDRESS} = constants;

const USDC_HOLDER = "0xe2644b0dc1b96C101d95421E95789eF6992B0E6A";
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const aUSDC_Address = '0xBcca60bB61934080951369a648Fb03DF4F96263C';

const aaveIncentiveController = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5'; 
const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

let usdcContract, jFCContract, jATContract, jTrDeplContract, jAaveContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract, wbtcTrAContract, wbtcTrBContract, usdcTrAContract, usdcTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);
const fromWei6Dec = (x) => x / Math.pow(10, 6);
const toWei6Dec = (x) => x * Math.pow(10, 6);

contract("USDC JAave", function (accounts) {

  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("USDC total Supply sent to user1", async function () {
    usdcContract = new web3.eth.Contract(USDC_ABI, USDC_ADDRESS);
    result = await usdcContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(USDC_HOLDER).call()) + " USDC");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: USDC_HOLDER, from: user1, value: web3.utils.toWei('2')})
    console.log(await web3.eth.getBalance(USDC_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await usdcContract.methods.transfer(user1, toWei6Dec(5000)).send({from: USDC_HOLDER})
    console.log("UnBlockedAccount USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(USDC_HOLDER).call()) + " USDC");
    console.log("user1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
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

    trParams1 = await jAaveContract.trancheAddresses(1);
    daiTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(daiTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrAContract.address);

    daiTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(daiTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrBContract.address);

    trParams1 = await jAaveContract.trancheAddresses(2);
    wbtcTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(wbtcTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(wbtcTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(wbtcTrAContract.address);

    wbtcTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(wbtcTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(wbtcTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(wbtcTrBContract.address);

    trParams1 = await jAaveContract.trancheAddresses(3);
    usdcTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(usdcTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdcTrAContract.address);

    usdcTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(usdcTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdcTrBContract.address);
  });

  it("user1 buys some token usdcTrA", async function () {
    trAddresses = await jAaveContract.trancheAddresses(3); //.cTokenAddress;
    console.log("addresses tranche A: " + JSON.stringify(trAddresses, ["buyerCoinAddress", "aTokenAddress", "ATrancheAddress", "BTrancheAddress"]));
    trPar = await jAaveContract.trancheParameters(3);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    console.log("rpb tranche A: " + trPar[3].toString());
    tx = await jAaveContract.calcRPBFromPercentage(3, {from: user1});

    trPar = await jAaveContract.trancheParameters(3);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + trPar[2].toString());
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    trParams = await jAaveContract.trancheAddresses(3);
    expect(trParams.buyerCoinAddress).to.be.equal(USDC_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aUSDC_Address);
    console.log("User1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(3, toWei6Dec(1000), {from: user1});
    console.log("User1 New USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    console.log("User1 trA tokens: " + fromWei(await usdcTrAContract.balanceOf(user1)) + " JUBA");
    // console.log("CErc20 USDC balance: " + fromWei8Dec(await usdcContract.balanceOf(cERC20Contract.address), "ether") + " USDC");
    console.log("JAave USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(jAaveContract.address).call()) + " USDC");
    console.log("JAave aUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(3); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(3);
    // console.log("JAave Price: " + await jCompHelperContract.getJAavePriceHelper(1));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));
  });

  it("user1 buys some other token usdcTrA", async function () {
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(500)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(3, toWei6Dec(500), {from: user1});
  });

  it("user1 buys some token usdcTrB", async function () {
    console.log("User1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    trAddr = await jAaveContract.trancheAddresses(3);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(3)));
    console.log("TrB total supply: " + fromWei6Dec(await usdcTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3)));
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheBToken(3, toWei6Dec(1000), {from: user1});
    console.log("User1 New USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    console.log("User1 trB tokens: " + fromWei(await usdcTrBContract.balanceOf(user1)) + " JUBB");
    // console.log("CErc20 USDC balance: " + fromWei8Dec(await usdcContract.methods.balanceOf(QIDAI).call()) + " USDC");
    console.log("JAave USDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3)));
    trAddresses = await jAaveContract.trancheAddresses(3); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(3);
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));
  });

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token usdcTrA", async function () {
    oldBal = fromWei8Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Usdc balance: "+ oldBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JUBA");
    tot = await usdcTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " JUBA");
    console.log("JAave aUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    tx = await usdcTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheAToken(3, bal, {from: user1});

    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Usdc balance: "+ newBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JUBA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " USDC");
    console.log("JAave new aUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));
  }); 

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token usdcTrB", async function () {
    oldBal = fromWei8Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Usdc balance: "+ oldBal + " USDC");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JUBB");
    console.log("JAave aUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    tx = await usdcTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3)));
    console.log("TrB value: " +  fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheBToken(3, bal, {from: user1});
    
    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Usdc balance: "+ newBal + " USDC");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JUBB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " USDC");
    console.log("JAave new aUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aUSDC_Address)) + " aUSDC");
    console.log("TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB value: " +  fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));
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

    await jAaveContract.transferTokenToFeesCollector(USDC_ADDRESS, 0, {from: tokenOwner})

    await jAaveContract.withdrawEthToFeesCollector(0, {from: tokenOwner})

    await jAaveContract.claimAaveRewards()

    await jAaveContract.claimAaveRewardsSingleAsset(aUSDC_Address, 0, {from: tokenOwner})
  });


});