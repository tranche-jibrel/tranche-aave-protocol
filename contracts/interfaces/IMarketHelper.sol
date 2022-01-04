// SPDX-License-Identifier: MIT
/**
 * Created on 2021-06-26
 * @summary: Markets Interface
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

interface IMarketHelper {
    function getTrancheBRewardsPercentage(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice,
            uint256 _underlyingDecs, 
            uint256 _extProtRet, 
            uint256 _balFactor) external view returns (int256 trBRewardsPercentage);
    function getTrancheMarketTVL(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice, 
            uint256 _underlyingDecs) external view returns(uint256 trancheTVL);
    function getTrancheAMarketTVL(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice, 
            uint256 _underlyingDecs) external view returns(uint256 trancheATVL);
    function getTrancheBMarketTVL(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice,
            uint256 _underlyingDecs) external view returns(uint256 trancheBTVL);
}