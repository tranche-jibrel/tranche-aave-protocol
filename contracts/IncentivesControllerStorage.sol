// SPDX-License-Identifier: MIT
/**
 * Created on 2021-06-24
 * @summary: Incentives Controller Storage contract
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract IncentivesControllerStorage is OwnableUpgradeable {
/* WARNING: NEVER RE-ORDER VARIABLES! Always double-check that new variables are added APPEND-ONLY. Re-ordering variables can permanently BREAK the deployed proxy contract.*/

    struct Market {
        address protocol;
        address aTranche;
        address bTranche;
        uint256 protocolTrNumber;
        uint256 balanceFactor;  // scaled by 1e18
        uint256 extProtocolPercentage;  // scaled by 1e18
        bool enabled;
    }

    struct MarketRewards {
        uint256 underlyingPrice;  // scaled by 1e18
        uint256 underlyingDecimals; 
        uint256 marketRewardsPercentage;  // scaled by 1e18
        uint256 trancheARewardsAmount;
        uint256 trancheBRewardsAmount;
        uint256 trADistributionCounter;
        uint256 trBDistributionCounter;
    }

    struct RewardsInfo {
        uint256 periodFinish;
        uint256 rewardRate;
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
        uint256 rewardsDuration; 
        uint256 finalTotalSupply;
    }

    uint256 public marketsCounter;

    address public rewardsTokenAddress;
    address public mktHelperAddress;
    address public priceHelperAddress;

    mapping(uint256 => Market) public availableMarkets;
    mapping(uint256 => MarketRewards) public availableMarketsRewards;

    // market => counter => current rewards info
    mapping(uint256 => mapping(uint256 => RewardsInfo)) public trancheARewardsInfo;
    mapping(uint256 => mapping(uint256 => RewardsInfo)) public trancheBRewardsInfo;
    // market => counter => user => rewards paid per tranche token
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public userRewardPerTokenTrAPaid;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public userRewardPerTokenTrBPaid;
    // market => distrib => user => tranche rewards amount
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public trARewards;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public trBRewards;

}