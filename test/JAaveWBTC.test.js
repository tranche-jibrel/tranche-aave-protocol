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
const WBTC_ABI = JSON.parse(fs.readFileSync('./test/utils/WBTC.abi', 'utf8'));

const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JAave = artifacts.require('JAave');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

// const MYERC20_TOKEN_SUPPLY = 5000000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WBTC_HOLDER = "0xABDe2F02fE84e083e1920471b54C3612456365Ef";
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const aWBCT_Address = '0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656';

const UnBlockedAccount = '0xABDe2F02fE84e083e1920471b54C3612456365Ef';

let wbtcContract, jFCContract, jATContract, jTrDeplContract, jAaveContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract, wbtcTrAContract, wbtcTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei8Dec = (x) => x / Math.pow(10, 8);
const toWei8Dec = (x) => x * Math.pow(10, 8);

contract("WBTC JAave", function (accounts) {

  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(user1));
  });

  it("WBTC total Supply sent to user1", async function () {
    wbtcContract = new web3.eth.Contract(WBTC_ABI, WBTC_ADDRESS);
    result = await wbtcContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(WBTC_HOLDER).call()) + " WBTC");

    // send a couple of AVAX to unblocked account so to pay fees
    await web3.eth.sendTransaction({to: WBTC_HOLDER, from: user1, value: web3.utils.toWei('2')})
    console.log(await web3.eth.getBalance(WBTC_HOLDER));
    console.log(await web3.eth.getBalance(user1));

    await wbtcContract.methods.transfer(user1, toWei8Dec(10)).send({from: WBTC_HOLDER})
    console.log("UnBlockedAccount WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(WBTC_HOLDER).call()) + " WBTC");
    console.log("user1 WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call()) + " WBTC");
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
  });

  it("user1 buys some token wbtcTrA", async function () {
    trAddresses = await jAaveContract.trancheAddresses(2); //.cTokenAddress;
    console.log("addresses tranche A: " + JSON.stringify(trAddresses, ["buyerCoinAddress", "aTokenAddress", "ATrancheAddress", "BTrancheAddress"]));
    trPar = await jAaveContract.trancheParameters(2);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    console.log("rpb tranche A: " + trPar[3].toString());
    tx = await jAaveContract.calcRPBFromPercentage(2, {from: user1});

    trPar = await jAaveContract.trancheParameters(2);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + trPar[2].toString());
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", 
        "trancheACurrentRPB", "redemptionPercentage", "qiTokenDecimals", "underlyingDecimals"]));
    trParams = await jAaveContract.trancheAddresses(2);
    expect(trParams.buyerCoinAddress).to.be.equal(WBTC_ADDRESS);
    expect(trParams.aTokenAddress).to.be.equal(aWBCT_Address);
    console.log("User1 WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call()) + " WBTC");
    tx = await wbtcContract.methods.approve(jAaveContract.address, toWei8Dec(1)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(2, toWei8Dec(1), {from: user1});
    console.log("User1 New WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call()) + " WBTC");
    console.log("User1 trA tokens: " + fromWei(await wbtcTrAContract.balanceOf(user1)) + " JWBA");
    // console.log("CErc20 WBTC balance: " + fromWei8Dec(await wbtcContract.balanceOf(cERC20Contract.address), "ether") + " WBTC");
    console.log("JAave WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(jAaveContract.address).call()) + " WBTC");
    console.log("JAave aWBTC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWBCT_Address)) + " aWBTC");
    trPar = await jAaveContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jAaveContract.trancheAddresses(2); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(2);
    // console.log("JAave Price: " + await jCompHelperContract.getJAavePriceHelper(1));
    console.log("JAave TrA Value: " + fromWei8Dec(await jAaveContract.getTrAValue(2)));
    console.log("JAave total Value: " + fromWei8Dec(await jAaveContract.getTotalValue(2)));

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some other token daiTrA", async function () {
    tx = await wbtcContract.methods.approve(jAaveContract.address, toWei8Dec(0.5)).send({from: user1});
    tx = await jAaveContract.buyTrancheAToken(2, toWei8Dec(0.5), {from: user1});

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 2)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )

    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 2, 2);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token wbtcTrB", async function () {
    console.log("User1 WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call()) + " WBTC");
    trAddr = await jAaveContract.trancheAddresses(2);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei8Dec(await jAaveContract.getTrBValue(2)));
    console.log("JAave total Value: " + fromWei8Dec(await jAaveContract.getTotalValue(2)));
    console.log("TrB total supply: " + fromWei(await wbtcTrBContract.totalSupply()));
    console.log("JAave TrA Value: " + fromWei8Dec(await jAaveContract.getTrAValue(2)));
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(2, toWei("1"))));
    tx = await wbtcContract.methods.approve(jAaveContract.address, toWei8Dec(1)).send({from: user1});
    tx = await jAaveContract.buyTrancheBToken(2, toWei8Dec(1), {from: user1});
    console.log("User1 New WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call()) + " WBTC");
    console.log("User1 trB tokens: " + fromWei(await wbtcTrBContract.balanceOf(user1)) + " JWBB");
    // console.log("CErc20 WBTC balance: " + fromWei8Dec(await wbtcContract.methods.balanceOf(QIDAI).call()) + " WBTC");
    console.log("JAave WBTC balance: " + fromWei8Dec(await jAaveContract.getTokenBalance(aWBCT_Address)) + " aWBTC");
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(2, 0)));
    trAddresses = await jAaveContract.trancheAddresses(2); //.cTokenAddress;
    trPars = await jAaveContract.trancheParameters(2);
    trPar = await jAaveContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JAave TrA Value: " + fromWei8Dec(await jAaveContract.getTrAValue(2)));
    console.log("TrB value: " + fromWei8Dec(await jAaveContract.getTrBValue(2)));
    console.log("JAave total Value: " + fromWei8Dec(await jAaveContract.getTotalValue(2)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 2)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 2, 1);
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

  it("user1 redeems token wbtcTrA", async function () {
    oldBal = fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call());
    console.log("User1 Wbtc balance: "+ oldBal + " WBTC");
    bal = await wbtcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JWBA");
    tot = await wbtcTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " JWBA");
    console.log("JAave aWBTC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aWBCT_Address)) + " aWBTC");
    tx = await wbtcTrAContract.approve(jAaveContract.address, bal, {from: user1});
    trPar = await jAaveContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));

    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheAToken(2, bal, {from: user1});

    newBal = fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call());
    console.log("User1 New Wbtc balance: "+ newBal + " WBTC");
    bal = await wbtcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " JWBA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " WBTC");
    console.log("JAave new aWBTC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aWBCT_Address)) + " aWBTC");
    console.log("JAave TrA Value: " + fromWei8Dec(await jAaveContract.getTrAValue(2)));
    console.log("JAave total Value: " + fromWei8Dec(await jAaveContract.getTotalValue(2)));

    console.log("staker counter trA: " + (await jAaveContract.stakeCounterTrA(user1, 2)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
    stkDetails = await jAaveContract.stakingDetailsTrancheA(user1, 2, 2);
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

  it("user1 redeems token wbtcTrB", async function () {
    oldBal = fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call());
    console.log("User1 Wbtc balance: "+ oldBal + " WBTC");
    bal = await wbtcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JWBB");
    console.log("JAave aWBTC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aWBCT_Address)) + " aWBTC");
    tx = await wbtcTrBContract.approve(jAaveContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jAaveContract.getTrancheBExchangeRate(2, 0)));
    console.log("TrB value: " +  fromWei8Dec(await jAaveContract.getTrBValue(2)));
    console.log(await jATContract.isAdmin(jAaveContract.address));

    tx = await jAaveContract.redeemTrancheBToken(2, bal, {from: user1});
    
    newBal = fromWei8Dec(await wbtcContract.methods.balanceOf(user1).call());
    console.log("User1 New Wbtc balance: "+ newBal + " WBTC");
    bal = await wbtcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " JWBB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " WBTC");
    console.log("JAave new aWBTC balance: "+ fromWei8Dec(await jAaveContract.getTokenBalance(aWBCT_Address)) + " aWBTC");
    console.log("TrA Value: " + fromWei8Dec(await jAaveContract.getTrAValue(2)));
    console.log("TrB value: " +  fromWei8Dec(await jAaveContract.getTrBValue(2)));
    console.log("JAave total Value: " + fromWei8Dec(await jAaveContract.getTotalValue(2)));

    console.log("staker counter trB: " + (await jAaveContract.stakeCounterTrB(user1, 2)).toString())
    stkDetails = await jAaveContract.stakingDetailsTrancheB(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 


});