// SPDX-License-Identifier: MIT
/**
 * Created on 2021-04-06
 * @summary: Protocol Interface
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IProtocol.sol";

contract Protocol is IProtocol, Initializable {

    struct Tranche {
        uint256 trAValue;
        uint256 trBValue;
        uint256 totalTrValue;
        uint256 trancheACurrentRPB;
        uint256 storedTrancheAPrice;
        uint256 storedTrancheBPrice;
    }

    struct TrancheAddresses {
        address buyerCoinAddress;       // ETH (ZERO_ADDRESS) or DAI
        address cTokenAddress;          // cETH or cDAI
        address ATrancheAddress;
        address BTrancheAddress;
    }

    mapping(uint256 => TrancheAddresses) public override trancheAddresses;
    mapping(uint256 => Tranche) public tranchesMocks;

    uint256 public trCounter;
    uint256 public override totalBlocksPerYear;

    struct StakingDetails {
        uint256 startTime;
        uint256 amount;
    }

    // user => trancheNum => counter
    mapping (address => mapping(uint256 => uint256)) public stakeCounterTrA;
    mapping (address => mapping(uint256 => uint256)) public stakeCounterTrB;
    // user => stakeCounter => struct
    mapping (address => mapping (uint256 => mapping (uint256 => StakingDetails))) public stakingDetailsTrancheA;
    mapping (address => mapping (uint256 => mapping (uint256 => StakingDetails))) public stakingDetailsTrancheB;

    function initialize() public initializer() {
        // totalBlocksPerYear = 2102400; // same number like in Compound protocol
        totalBlocksPerYear = 31536000; // seconds in 1 year
    }

    function createTranche(address _trA,
            address _trB,
            uint256 _trAVal,
            uint256 _trBVal,
            uint256 _trARBP,
            uint256 _trAPrice,
            uint256 _trBPrice) external {
        trancheAddresses[trCounter].ATrancheAddress = _trA;
        trancheAddresses[trCounter].BTrancheAddress = _trB;
        tranchesMocks[trCounter].trAValue = _trAVal;
        tranchesMocks[trCounter].trBValue = _trBVal;
        tranchesMocks[trCounter].totalTrValue = _trAVal + _trBVal;
        tranchesMocks[trCounter].trancheACurrentRPB = _trARBP;
        tranchesMocks[trCounter].storedTrancheAPrice = _trAPrice;
        tranchesMocks[trCounter].storedTrancheBPrice = _trBPrice;
        trCounter = trCounter + 1;
    }

    function setTrA(uint256 _trancheNum, address _trA) external {
        trancheAddresses[_trancheNum].ATrancheAddress = _trA;
    }

    function setTrB(uint256 _trancheNum, address _trB) external {
        trancheAddresses[_trancheNum].BTrancheAddress = _trB;
    }

    function getTrA(uint256 _trancheNum) external view returns(address) {
        return trancheAddresses[_trancheNum].ATrancheAddress;
    }

    function getTrB(uint256 _trancheNum) external view returns(address) {
        return trancheAddresses[_trancheNum].BTrancheAddress;
    }

    function setTrAValue(uint256 _trancheNum, uint256 _trAVal) external {
        tranchesMocks[_trancheNum].trAValue = _trAVal;
    }
    function setTrBValue(uint256 _trancheNum, uint256 _trBVal) external {
        tranchesMocks[_trancheNum].trBValue = _trBVal;
    }
    function setTotalValue(uint256 _trancheNum) external {
        tranchesMocks[_trancheNum].totalTrValue = tranchesMocks[_trancheNum].trAValue + tranchesMocks[_trancheNum].trBValue;
    }

    function setTrAStakingDetails(address _user, uint256 _trancheNum, uint256 _unixTime, uint256 _amount, uint256 _counter) public override {
        stakeCounterTrA[_user][_trancheNum] = _counter;
        StakingDetails storage details = stakingDetailsTrancheA[_user][_trancheNum][_counter];
        details.startTime = _unixTime;
        details.amount = _amount;
    }

    function setTrBStakingDetails(address _user, uint256 _trancheNum, uint256 _unixTime, uint256 _amount, uint256 _counter) public override {
        stakeCounterTrB[_user][_trancheNum] = _counter;
        StakingDetails storage details = stakingDetailsTrancheB[_user][_trancheNum][_counter];
        details.startTime = _unixTime;
        details.amount = _amount;
    }

    function getSingleTrancheUserStakeCounterTrA(address _user, uint256 _trancheNum) external view override returns (uint256) {
        return stakeCounterTrA[_user][_trancheNum];
    }

    function getSingleTrancheUserStakeCounterTrB(address _user, uint256 _trancheNum) external view override returns (uint256) {
        return stakeCounterTrB[_user][_trancheNum];
    }

    function getSingleTrancheUserSingleStakeDetailsTrA(address _user, uint256 _trancheNum, uint256 _num) external view override returns (uint256, uint256) {
        return (stakingDetailsTrancheA[_user][_trancheNum][_num].startTime, stakingDetailsTrancheA[_user][_trancheNum][_num].amount);
    }

    function getSingleTrancheUserSingleStakeDetailsTrB(address _user, uint256 _trancheNum, uint256 _num) external view override returns (uint256, uint256) {
        return (stakingDetailsTrancheB[_user][_trancheNum][_num].startTime, stakingDetailsTrancheB[_user][_trancheNum][_num].amount);
    }

    function getTrAValue(uint256 _trancheNum) external view override returns (uint256){
        return tranchesMocks[_trancheNum].trAValue;
    }
    function getTrBValue(uint256 _trancheNum) external view override returns (uint256){
        return tranchesMocks[_trancheNum].trBValue;
    }
    function getTotalValue(uint256 _trancheNum) external view override returns (uint256){
        return tranchesMocks[_trancheNum].totalTrValue;
    }

    function setTrancheACurrentRPB(uint256 _trancheNum, uint256 _newRPB) external {
        tranchesMocks[_trancheNum].trancheACurrentRPB = _newRPB;
    }

    function getTrancheACurrentRPB(uint256 _trancheNum) external view override returns (uint256) {
        return tranchesMocks[_trancheNum].trancheACurrentRPB;
    }

    function setTrancheAExchangeRate(uint256 _trancheNum, uint256 _trancheAPrice) public override {
        tranchesMocks[_trancheNum].storedTrancheAPrice = _trancheAPrice;
    }

    function getTrancheAExchangeRate(uint256 _trancheNum) public view override returns (uint256) {
        return tranchesMocks[_trancheNum].storedTrancheAPrice;
    }

    function setTrancheBExchangeRate(uint256 _trancheNum, uint256 _trancheBPrice) public override {
        tranchesMocks[_trancheNum].storedTrancheBPrice = _trancheBPrice;
    }

    function getTrancheBExchangeRate(uint256 _trancheNum) public view override returns (uint256) {
        return tranchesMocks[_trancheNum].storedTrancheBPrice;
    }

}