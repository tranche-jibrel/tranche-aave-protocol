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

// const MYERC20_TOKEN_SUPPLY = 5000000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const USDCE_HOLDER = "0x3A2434c698f8D79af1f5A9e43013157ca8B11a66";
const USDCE_ADDRESS = "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";
const avUSDC_Address = '0x46A51127C3ce23fb7AB1DE06226147F446e4a857';

const UnBlockedAccount = '0x3A2434c698f8D79af1f5A9e43013157ca8B11a66';
const aaveIncentiveController = '0x01D83Fe6A10D2f2B7AF17034343746188272cAc9';  // AVAX Mainnet
const WAVAX_ADDRESS = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7";

let usdcContract, jFCContract, jATContract, jTrDeplContract, jAaveContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract, wbtcTrAContract, wbtcTrBContract, usdcTrAContract, usdcTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);
const fromWei6Dec = (x) => x / Math.pow(10, 6);
const toWei6Dec = (x) => x * Math.pow(10, 6);

contract("USDC.e JAave", function (accounts) {

  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("USDC.e total Supply sent to user1", async function () {
    usdcContract = new web3.eth.Contract(USDC_ABI, USDCE_ADDRESS);
    result = await usdcContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(USDCE_HOLDER).call()) + " USDC.e");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: USDCE_HOLDER, from: user1, value: web3.utils.toWei('2')})
    console.log(await web3.eth.getBalance(USDCE_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await usdcContract.methods.transfer(user1, toWei6Dec(5000)).send({from: USDCE_HOLDER})
    console.log("UnBlockedAccount USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(USDCE_HOLDER).call()) + " USDC.e");
    console.log("user1 USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC.e");
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
    expect(trParams.buyerCoinAddress).to.be.equal(USDCE_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(avUSDC_Address);
    console.log("User1 USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC.e");
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(3, toWei6Dec(1000), {from: user1});
    console.log("User1 New USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC.e");
    console.log("User1 trA tokens: " + fromWei(await usdcTrAContract.balanceOf(user1)) + " JWBA");
    // console.log("CErc20 USDC.e balance: " + fromWei8Dec(await usdcContract.balanceOf(cERC20Contract.address), "ether") + " USDC.e");
    console.log("JAave USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(jAaveContract.address).call()) + " USDC.e");
    console.log("JAave avUSDC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(avUSDC_Address)) + " avUSDC");
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(3); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(3);
    // console.log("JAave Price: " + await jCompHelperContract.getJAavePriceHelper(1));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some other token usdcTrA", async function () {
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(500)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(3, toWei6Dec(500), {from: user1});

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token usdcTrB", async function () {
    console.log("User1 USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC.e");
    trAddr = await jAaveContract.trancheAddresses(3);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(3)));
    console.log("TrB total supply: " + fromWei6Dec(await usdcTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3, toWei("1"))));
    tx = await usdcContract.methods.approve(jAaveContract.address, toWei6Dec(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheBToken(3, toWei6Dec(1000), {from: user1});
    console.log("User1 New USDC.e balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC.e");
    console.log("User1 trB tokens: " + fromWei(await usdcTrBContract.balanceOf(user1)) + " JWBB");
    // console.log("CErc20 USDC.e balance: " + fromWei8Dec(await usdcContract.methods.balanceOf(QIDAI).call()) + " USDC.e");
    console.log("JAave USDC.e balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(avUSDC_Address)) + " avUSDC");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3, 0)));
    trAddresses = await jAaveContract.trancheAddresses(3); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(3);
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB value: " + fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 3, 1);
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

  it("user1 redeems token usdcTrA", async function () {
    oldBal = fromWei8Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Usdc balance: "+ oldBal + " USDC.e");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JWBA");
    tot = await usdcTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " JWBA");
    console.log("JAave avUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(avUSDC_Address)) + " avUSDC");
    tx = await usdcTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(3);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheAToken(3, bal, {from: user1});

    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Usdc balance: "+ newBal + " USDC.e");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JWBA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " USDC.e");
    console.log("JAave new avUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(avUSDC_Address)) + " avUSDC");
    console.log("JAave TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 3, 2);
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

  it("user1 redeems token usdcTrB", async function () {
    oldBal = fromWei8Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Usdc balance: "+ oldBal + " USDC.e");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JWBB");
    console.log("JAave avUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(avUSDC_Address)) + " avUSDC");
    tx = await usdcTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(3, 0)));
    console.log("TrB value: " +  fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheBToken(3, bal, {from: user1});
    
    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Usdc balance: "+ newBal + " USDC.e");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JWBB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " USDC.e");
    console.log("JAave new avUSDC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(avUSDC_Address)) + " avUSDC");
    console.log("TrA Value: " + fromWei6Dec(await jAaveContract.getTrAValue(3)));
    console.log("TrB value: " +  fromWei6Dec(await jAaveContract.getTrBValue(3)));
    console.log("JAave total Value: " + fromWei6Dec(await jAaveContract.getTotalValue(3)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 3)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 3, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 

  it('calling unfrequently functions', async function () {
    await jAaveContract.setNewEnvironment(jATContract.address, jFCContract.address, jTrDeplContract.address, 
      aaveIncentiveController, WAVAX_ADDRESS, {from: tokenOwner})

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

    await jAaveContract.transferTokenToFeesCollector(USDCE_ADDRESS, 0, {from: tokenOwner})

    await jAaveContract.withdrawEthToFeesCollector(0, {from: tokenOwner})

    await jAaveContract.claimAaveRewards()

    await jAaveContract.claimAaveRewardsSingleAsset(avUSDC_Address, 0, {from: tokenOwner})
  });


});