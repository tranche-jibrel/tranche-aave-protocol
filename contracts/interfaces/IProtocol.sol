// SPDX-License-Identifier: MIT
/**
 * Created on 2021-04-06
 * @summary: Protocol Interface
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

interface IProtocol {
    // function getTrA(uint256 _trancheNum) external view returns (address);
    // function getTrB(uint256 _trancheNum) external view returns (address);
    function getTrAValue(uint256 _trancheNum) external view returns (uint256);
    function getTrBValue(uint256 _trancheNum) external view returns (uint256);
    function getTotalValue(uint256 _trancheNum) external view returns (uint256);
    function trancheAddresses(uint256 _trNum) external view returns (address, address, address, address);
    function getTrancheACurrentRPB(uint256 _trancheNum) external view returns (uint256);
    function totalBlocksPerYear() external view returns (uint256);
    function setTrAStakingDetails(address _user, uint256 _trancheNum, uint256 _unixTime, uint256 _amount, uint256 _counter) external;
    function setTrBStakingDetails(address _user, uint256 _trancheNum, uint256 _unixTime, uint256 _amount, uint256 _counter) external;
    function getSingleTrancheUserStakeCounterTrA(address _user, uint256 _trancheNum) external view returns (uint256);
    function getSingleTrancheUserStakeCounterTrB(address _user, uint256 _trancheNum) external view returns (uint256);
    function getSingleTrancheUserSingleStakeDetailsTrA(address _user, uint256 _trancheNum, uint256 _num) external view returns (uint256, uint256);
    function getSingleTrancheUserSingleStakeDetailsTrB(address _user, uint256 _trancheNum, uint256 _num) external view returns (uint256, uint256);
    function setTrancheAExchangeRate(uint256 _trancheNum, uint256 _trancheAPrice) external;
    function getTrancheAExchangeRate(uint256 _trancheNum) external view returns (uint256);
    function setTrancheBExchangeRate(uint256 _trancheNum, uint256 _trancheBPrice) external;
    function getTrancheBExchangeRate(uint256 _trancheNum) external view returns (uint256);
}