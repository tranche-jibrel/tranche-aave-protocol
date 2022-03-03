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
const DAI_ABI = JSON.parse(fs.readFileSync('./test/utils/Dai.abi', 'utf8'));

const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JAave = artifacts.require('JAave');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

const {ZERO_ADDRESS} = constants;

const DAI_HOLDER = "0x38720D56899d46cAD253d08f7cD6CC89d2c83190";
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const aDAI_Address = '0x028171bCA77440897B824Ca71D1c56caC55b68A3';

let daiContract, jFCContract, jATContract, jTrDeplContract, jAaveContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);

contract("DAI JAave", function (accounts) {

  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("DAI total Supply sent to user1", async function () {
    daiContract = new web3.eth.Contract(DAI_ABI, DAI_ADDRESS);
    result = await daiContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount DAI balance: " + fromWei(await daiContract.methods.balanceOf(DAI_HOLDER).call()) + " DAI");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: DAI_HOLDER, from: user1, value: web3.utils.toWei('2')})
    console.log(await web3.eth.getBalance(DAI_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await daiContract.methods.transfer(user1, toWei(10000)).send({from: DAI_HOLDER})
    console.log("UnBlockedAccount DAI balance: " + fromWei(await daiContract.methods.balanceOf(DAI_HOLDER).call()) + " DAI");
    console.log("user1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
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
  });

  it("user1 buys some token daiTrA", async function () {
    trAddresses = await jAaveContract.trancheAddresses(1); //.cTokenAddress;
    console.log("addresses tranche A: " + JSON.stringify(trAddresses, ["buyerCoinAddress", "aTokenAddress", "ATrancheAddress", "BTrancheAddress"]));
    trPar = await jAaveContract.trancheParameters(1);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    console.log("rpb tranche A: " + trPar[3].toString());
    tx = await jAaveContract.calcRPBFromPercentage(1, {from: user1});

    trPar = await jAaveContract.trancheParameters(1);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + trPar[2].toString());
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    trParams = await jAaveContract.trancheAddresses(1);
    expect(trParams.buyerCoinAddress).to.be.equal(DAI_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aDAI_Address);
    console.log("User1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(1, toWei(1000), {from: user1});
    console.log("User1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("User1 trA tokens: " + fromWei(await daiTrAContract.balanceOf(user1)) + " DTA");
    // console.log("CErc20 DAI balance: " + fromWei(await daiContract.balanceOf(cERC20Contract.address), "ether") + " DAI");
    console.log("JAave DAI balance: " + fromWei(await daiContract.methods.balanceOf(jAaveContract.address).call()) + " DAI");
    console.log("JAave aDAI balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(1);
    // console.log("JAave Price: " + await jCompHelperContract.getJAavePriceHelper(1));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));
  });

  it("user1 buys some other token daiTrA", async function () {
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(500)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(1, toWei(500), {from: user1});
  });

  it("user1 buys some token daiTrB", async function () {
    console.log("User1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    trAddr = await jAaveContract.trancheAddresses(1);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));
    console.log("TrB total supply: " + fromWei(await daiTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    tx = await daiContract.methods.approve(jAaveContract.address, toWei(1000)).send({from: user1});
    tx = await jAaveContract.buyTrancheBToken(1, toWei(1000), {from: user1});
    console.log("User1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("User1 trB tokens: " + fromWei(await daiTrBContract.balanceOf(user1)) + " DTB");
    // console.log("CErc20 DAI balance: " + fromWei(await daiContract.methods.balanceOf(QIDAI).call()) + " DAI");
    console.log("JAave DAI balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    trAddresses = await jAaveContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(1);
    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB value: " + fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));
  });

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    tot = await daiTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " DTA");
    console.log("JAave aDAI balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    tx = await daiTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheAToken(1, bal, {from: user1});

    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " DAI");
    console.log("JAave new aDAI balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("JAave TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));
  }); 

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token daiTrB", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("JAave aDAI balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    tx = await daiTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(1)));
    console.log("TrB value: " +  fromWei(await jAaveContract.getTrBValue(1)));
    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheBToken(1, bal, {from: user1});
    
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " DAI");
    console.log("JAave new aDAI balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aDAI_Address)) + " aDAI");
    console.log("TrA Value: " + fromWei(await jAaveContract.getTrAValue(1)));
    console.log("TrB value: " +  fromWei(await jAaveContract.getTrBValue(1)));
    console.log("JAave total Value: " + fromWei(await jAaveContract.getTotalValue(1)));
  }); 


});