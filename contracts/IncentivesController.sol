// SPDX-License-Identifier: MIT
/**
 * Created on 2021-04-06
 * @summary: Incentive Controller contract
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;


import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "./IncentivesControllerStorage.sol";
import "./interfaces/IProtocol.sol";
import "./interfaces/IIncentivesController.sol";
import "./interfaces/IMarketHelper.sol";
import "./interfaces/IPriceHelper.sol";

contract IncentivesController is OwnableUpgradeable, IncentivesControllerStorage, IIncentivesController, ReentrancyGuardUpgradeable {
    using SafeMathUpgradeable for uint256;
    // using SafeMathInt for int256;

    event SliceSpeedUpdated(uint256 indexed id, uint256 sliceSpeed);
	event NewMarketAdded(uint256 indexed id, address indexed protocol, uint256 protocolTrNumber, uint256 balanceFactor, 
		uint256 extProtocolPercentage, uint256 marketRewardsPercentage, /*uint256 rewardsFrequency,*/ uint256 blockNumber);
	event FundsDistributed(uint256 indexed id, uint256 trAAmount, uint256 trBAmount, uint256 blockNumber);
    event RewardAddedTrancheA(uint256 reward, uint256 periodFinish);
    event RewardAddedTrancheB(uint256 reward, uint256 periodFinish);
    event PastRewardsPaidTrancheA(uint256 indexed market, address indexed sender, uint256 pastRewards);
    event PastRewardsPaidTrancheB(uint256 indexed market, address indexed sender, uint256 pastRewards);
    event RewardPaid(address indexed user, uint256 reward);
    event NewDistribution(uint256 indexed _totalAmount, uint256  indexed _rewardsDuration);

    /**
     * @dev initialize contract
     * @param _token reward token address (SLICE or others)
     * @param _mktHelper Address of markets helper contract
     * @param _priceHelper Address of price helper contract
     */
    function initialize (address _token, address _mktHelper, address _priceHelper) public initializer() {
        OwnableUpgradeable.__Ownable_init();
        rewardsTokenAddress = _token;
        mktHelperAddress = _mktHelper;
        priceHelperAddress = _priceHelper;
    }

    /* ========== VIEWS ========== */
    /**
    * @dev get minimum between actual time and finish time for tranche A
    * @param _idxMarket market index
    * @param _idxDistrib distribution index
    * @return minimum between times
    */
    function lastTimeTrARewardApplicable(uint256 _idxMarket, uint256 _idxDistrib) public view returns (uint256) {
        return MathUpgradeable.min(block.timestamp, trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish);
    }

    /**
    * @dev get minimum between actual time and finish time for tranche B
    * @param _idxMarket market index
    * @param _idxDistrib distribution index
    * @return minimum between times
    */
    function lastTimeTrBRewardApplicable(uint256 _idxMarket, uint256 _idxDistrib) public view returns (uint256) {
        return MathUpgradeable.min(block.timestamp, trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish);
    }

    /**
    * @dev get return per tranche A token
    * @param _idxMarket market index
    * @param _idxDistrib distribution index
    * @return return per token
    */
    function rewardPerTrAToken(uint256 _idxMarket, uint256 _idxDistrib) public view returns (uint256) {
        uint256 _totalSupply;
        if (_idxDistrib == availableMarketsRewards[_idxMarket].trADistributionCounter && 
                block.timestamp <= trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish) {
            _totalSupply = IERC20Upgradeable(availableMarkets[_idxMarket].aTranche).totalSupply();
        } else {
            if (trancheARewardsInfo[_idxMarket][_idxDistrib].finalTotalSupply == 0) {
                _totalSupply = IERC20Upgradeable(availableMarkets[_idxMarket].aTranche).totalSupply();
            } else
                _totalSupply = trancheARewardsInfo[_idxMarket][_idxDistrib].finalTotalSupply;
        }

        if (_totalSupply > 0) {
            uint256 diffTime = lastTimeTrARewardApplicable(_idxMarket, _idxDistrib).sub(trancheARewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime);
            return trancheARewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored
                .add(diffTime.mul(trancheARewardsInfo[_idxMarket][_idxDistrib].rewardRate).mul(1e18).div(_totalSupply)); 
        } else {
            return trancheARewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored;
        }
    }

    /**
     * @dev get return per tranche B token
     * @param _idxMarket market index
     * @param _idxDistrib distribution index
     * @return return per token
     */
    function rewardPerTrBToken(uint256 _idxMarket, uint256 _idxDistrib) public view returns (uint256) {
        uint256 _totalSupply;
        if (_idxDistrib == availableMarketsRewards[_idxMarket].trBDistributionCounter && 
                block.timestamp <= trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish) {
            _totalSupply = IERC20Upgradeable(availableMarkets[_idxMarket].bTranche).totalSupply();
        } else {
            if (trancheBRewardsInfo[_idxMarket][_idxDistrib].finalTotalSupply == 0) {
                _totalSupply = IERC20Upgradeable(availableMarkets[_idxMarket].bTranche).totalSupply();
            } else 
                _totalSupply = trancheBRewardsInfo[_idxMarket][_idxDistrib].finalTotalSupply;
        }

        if (_totalSupply > 0) {
            uint256 diffTime = lastTimeTrBRewardApplicable(_idxMarket, _idxDistrib).sub(trancheBRewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime);
            return trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored
                .add(diffTime.mul(trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardRate).mul(1e18).div(_totalSupply)); 
        } else {
            return trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored;
        }
    }

    /**
     * @dev updates parameters when new token are bought in a tracnhe A
     * @param _account account address
     * @param _trancheA tranche A address
    */
    function trancheANewEnter(address _account, address _trancheA) external override nonReentrant {
        require(_account != address(0), "Address not allowed");
        // find out which market 
        uint i;
        for (i = 0; i < marketsCounter; i++) {
            if (availableMarkets[i].aTranche == _trancheA)
                break;
        }
        if (i < marketsCounter) {
            uint256 idxMarket = i;
            uint256 distCount = availableMarketsRewards[idxMarket].trADistributionCounter;
            uint timeNow = block.timestamp;
            uint timeDistrEnd = trancheARewardsInfo[i][distCount].periodFinish;
            uint timeDistrStart = timeDistrEnd.sub(trancheARewardsInfo[i][distCount].rewardsDuration);
            
            if(timeNow >= timeDistrStart && timeNow < timeDistrEnd) {
                updateRewardsPerMarketTrancheA(idxMarket, _account, distCount);
            }
        }
    }

    /**
     * @dev updates parameters when new token are bought in a tracnhe B
     * @param _account account address
     * @param _trancheB tranche B address
    */
    function trancheBNewEnter(address _account, address _trancheB) external override nonReentrant {
        require(_account != address(0), "Address not allowed");
        // find out which market 
        uint i;
        for (i = 0; i < marketsCounter; i++) {
            if (availableMarkets[i].bTranche == _trancheB)
                break;
        }
        if (i < marketsCounter) {
            uint256 idxMarket = i;
            uint256 distCount = availableMarketsRewards[idxMarket].trBDistributionCounter;
            uint timeNow = block.timestamp;
            uint timeDistrEnd = trancheBRewardsInfo[i][distCount].periodFinish;
            uint timeDistrStart = timeDistrEnd.sub(trancheBRewardsInfo[i][distCount].rewardsDuration);

            if(timeNow >= timeDistrStart && timeNow < timeDistrEnd) {
                updateRewardsPerMarketTrancheB(idxMarket, _account, distCount);
            }
        }
    }

    /**
     * @dev get return per tranche A token
     * @param _idxMarket market index
     * @param _account account address
     * @param _idxDistrib distribution index
     * @return return per token
     */
    function trAEarned(uint256 _idxMarket, address _account, uint256 _idxDistrib) public view returns (uint256) {
        uint256 userBal;
        if (_idxDistrib == availableMarketsRewards[_idxMarket].trADistributionCounter && 
                block.timestamp < trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish) {
            // userBal = IERC20Upgradeable(availableMarkets[_idxMarket].aTranche).balanceOf(_account);
            userBal = getCurrentBalanceTrA(_idxMarket, _account);
        } else {
            userBal = getHistoricalBalanceTrA(_idxMarket, _account, _idxDistrib);
        }
            
        uint256 rewPerTokenA = rewardPerTrAToken(_idxMarket, _idxDistrib);
        // uint256 rewPerTokenA = trancheARewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored;
        uint256 userRewPerTokenPaidA = userRewardPerTokenTrAPaid[_idxMarket][_idxDistrib][_account];
        // if (rewPerTokenA >= userRewPerTokenPaidA) {
            return userBal.mul(rewPerTokenA.sub(userRewPerTokenPaidA)).div(1e18).add(trARewards[_idxMarket][_idxDistrib][_account]); 
        // } else {
        //     return trARewards[_idxMarket][_idxDistrib][_account];
        // }    
    }

    /**
     * @dev get return per tranche B token
     * @param _idxMarket market index
     * @param _account account address
     * @param _idxDistrib distribution index
     * @return return per token
     */
    function trBEarned(uint256 _idxMarket, address _account, uint256 _idxDistrib) public view returns (uint256) {
        uint256 userBal;
        if (_idxDistrib == availableMarketsRewards[_idxMarket].trBDistributionCounter && 
                block.timestamp < trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish) {
            // userBal = IERC20Upgradeable(availableMarkets[_idxMarket].bTranche).balanceOf(_account);
            userBal = getCurrentBalanceTrB(_idxMarket, _account);
        } else {
            userBal = getHistoricalBalanceTrB(_idxMarket, _account, _idxDistrib);
        }

        uint256 rewPerTokenB = rewardPerTrBToken(_idxMarket, _idxDistrib);
        // uint256 rewPerTokenB = trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored;
        uint256 userRewPerTokenPaidB = userRewardPerTokenTrBPaid[_idxMarket][_idxDistrib][_account];
        // if (rewPerTokenB >= userRewPerTokenPaidB) {
            return userBal.mul(rewPerTokenB.sub(userRewPerTokenPaidB)).div(1e18).add(trBRewards[_idxMarket][_idxDistrib][_account]);  
        // } else {
        //     return trBRewards[_idxMarket][_idxDistrib][_account];
        // }     
    }

    /**
    * @dev get tranche A token address
    * @param _idxMarket market index
    * @return token address
    */  
    function getATrancheMarket(uint256 _idxMarket) external view returns(address) {
        return availableMarkets[_idxMarket].aTranche;
    }

    /**
    * @dev get tranche B token address
    * @param _idxMarket market index
    * @return token address
    */
    function getBTrancheMarket(uint256 _idxMarket) external view returns(address) {
        return availableMarkets[_idxMarket].bTranche;
    }

    /**
     * @dev get the summation of all percentages in all enabled markets
     * @return totalPercentage sum of all percentages in all enabled markets
     */
    function getMarketRewardsPercentage() public view returns (uint256 totalPercentage) {
        for (uint256 i = 0; i < marketsCounter; i++) {
            if (availableMarkets[i].enabled) {
                totalPercentage = totalPercentage.add(availableMarketsRewards[i].marketRewardsPercentage);
            }
        }
        return totalPercentage;
    }

    /**
     * @dev return total values locked in market Tranche A
     * @param _idxMarket market index
     * @return mktTrATVL market tranche A total value locked 
     */
    function getMarketTrancheATVL(uint256 _idxMarket) public view returns (uint256 mktTrATVL) {
        address _protocol = availableMarkets[_idxMarket].protocol;
        uint256 _trNum = availableMarkets[_idxMarket].protocolTrNumber;
        // if (_useChainlink)
        //     setUnderlyingPriceFromChainlinkSingleMarket(i);
        uint256 _underPrice = availableMarketsRewards[_idxMarket].underlyingPrice;
        uint256 _underDecs = availableMarketsRewards[_idxMarket].underlyingDecimals;
        mktTrATVL = IMarketHelper(mktHelperAddress).getTrancheAMarketTVL(_protocol, _trNum, _underPrice, _underDecs);
        return mktTrATVL;
    }

    /**
     * @dev return total values locked in market Tranche B
     * @param _idxMarket market index
     * @return mktTrBTVL market tranche B total value locked 
     */
    function getMarketTrancheBTVL(uint256 _idxMarket) public view returns (uint256 mktTrBTVL) {
        address _protocol = availableMarkets[_idxMarket].protocol;
        uint256 _trNum = availableMarkets[_idxMarket].protocolTrNumber;
        // if (_useChainlink)
        //     setUnderlyingPriceFromChainlinkSingleMarket(i);
        uint256 _underPrice = availableMarketsRewards[_idxMarket].underlyingPrice;
        uint256 _underDecs = availableMarketsRewards[_idxMarket].underlyingDecimals;
        mktTrBTVL = IMarketHelper(mktHelperAddress).getTrancheBMarketTVL(_protocol, _trNum, _underPrice, _underDecs);
        return mktTrBTVL;
    }

    /**
     * @dev return total values locked in all available and enabled markets
     * @return markets total value locked 
     */
    function getAllMarketsTVL(/*bool _useChainlink*/) public view returns(uint256) {
        uint256 allMarketTVL;
        address _protocol;
        uint256 _trNum;
        uint256 _underPrice;
        uint256 _underDecs;
        uint256 tmpMarketVal;

        for (uint256 i = 0; i < marketsCounter; i++) {
            if (availableMarkets[i].enabled) {
                _protocol = availableMarkets[i].protocol;
                _trNum = availableMarkets[i].protocolTrNumber;
                // if (_useChainlink)
                //     setUnderlyingPriceFromChainlinkSingleMarket(i);
                _underPrice = availableMarketsRewards[i].underlyingPrice;
                _underDecs = availableMarketsRewards[i].underlyingDecimals;
                tmpMarketVal = IMarketHelper(mktHelperAddress).getTrancheMarketTVL(_protocol, _trNum, _underPrice, _underDecs);
                allMarketTVL = allMarketTVL.add(tmpMarketVal);
            }
        }

        return allMarketTVL;
    }

    /**
     * @dev return market share of an enabled market respect to all values locked in all markets
     * marketShare = getTrancheValue / sumAllMarketsValueLocked
     * @param _idxMarket market index
     * @return marketShare market share
     */
    function getMarketSharePerTranche(uint256 _idxMarket/*, bool _useChainlink*/) external view returns(uint256 marketShare) {
        uint256 totalValue = getAllMarketsTVL(/*_useChainlink*/);

        if (totalValue > 0 && availableMarkets[_idxMarket].enabled) {
            address _protocol = availableMarkets[_idxMarket].protocol;
            uint256 _trNum = availableMarkets[_idxMarket].protocolTrNumber;
            // if (_useChainlink)
            //     setUnderlyingPriceFromChainlinkSingleMarket(_idxMarket);
            uint256 _underPrice = availableMarketsRewards[_idxMarket].underlyingPrice;
            uint256 _underDecs = availableMarketsRewards[_idxMarket].underlyingDecimals;
            uint256 trancheVal = IMarketHelper(mktHelperAddress).getTrancheMarketTVL(_protocol, _trNum, _underPrice, _underDecs);
            marketShare = trancheVal.mul(1e18).div(totalValue);
        } else 
            marketShare = 0;
        return marketShare;
    }

    /**
     * @dev return total values locked in all available and enabled markets
     * @param _idxMarket market index
     * @return tranche B rewards percentage (scaled by 1e18) 
     */
    function getTrBRewardsPercent(uint256 _idxMarket) public view returns (uint256) {
        address _protocol = availableMarkets[_idxMarket].protocol;
        uint256 _trNum = availableMarkets[_idxMarket].protocolTrNumber;
        uint256 _underlyingPrice = availableMarketsRewards[_idxMarket].underlyingPrice; 
        uint256 _underlyingDecs = availableMarketsRewards[_idxMarket].underlyingDecimals; 
        uint256 _extProtRet = availableMarkets[_idxMarket].extProtocolPercentage;
        uint256 _balFactor = availableMarkets[_idxMarket].balanceFactor;
        uint256 trBPercent =
            uint256(IMarketHelper(mktHelperAddress).getTrancheBRewardsPercentage(_protocol, _trNum, _underlyingPrice, _underlyingDecs, _extProtRet, _balFactor));
        return trBPercent;
    }

    /**
     * @dev get the balance of a token in this contract
     * @param _token token address
     * @return token balance
     */
    function getTokenBalance(address _token) external view returns(uint256) {
        return IERC20Upgradeable(_token).balanceOf(address(this));
    }

    /**
     * @dev claim historical rewards for an account in tranche A single market
     * @param _idxMarket market index
     * @param _account claimer address
     */
    function getHistoricalUnclaimedRewardsAmountTrA(uint256 _idxMarket, address _account) public view returns(uint256) {
        uint256 _idxDistrib = availableMarketsRewards[_idxMarket].trADistributionCounter;
        // uint256 protTrNum = availableMarkets[_idxMarket].protocolTrNumber;
        // uint256 callerCounter = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrA(_account, protTrNum);
        uint256 pastRewards;

        if (_idxDistrib > 1) {
            // find all distributions and take only the ones with date and time compatible with staking details
            for (uint256 i = 1; i < _idxDistrib; i++) {
                // for (uint256 j = 1; j <= callerCounter; j++) {
                //     (uint256 startTime, uint256 amount) = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrA(_account, protTrNum, j);
                //     uint256 distEnd = trancheARewardsInfo[_idxMarket][i].periodFinish;
                    // if (startTime < distEnd && amount > 0) {
                        uint256 pastTrAEarned = trAEarned(_idxMarket, _account, i);
                        pastRewards = pastRewards.add(pastTrAEarned);
                    // }
                // }
            }
        }
        return pastRewards;
    }

    /**
     * @dev get historical balance for an account in tranche A single market in previous ditributions
     * @param _idxMarket market index
     * @param _account claimer address
     */
    function getCurrentBalanceTrA(uint256 _idxMarket, address _account) public view returns(uint256) {
        uint256 actualIdxDistrib = availableMarketsRewards[_idxMarket].trADistributionCounter;
        uint256 protTrNum = availableMarkets[_idxMarket].protocolTrNumber;
        uint256 callerCounter = 
            IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrA(_account, protTrNum);
        uint256 distEnd = trancheARewardsInfo[_idxMarket][actualIdxDistrib].periodFinish;
        uint256 currentAmount;

        // find all distributions and take only the ones with date and time compatible with staking details
        for (uint256 j = 1; j <= callerCounter; j++) {
            (uint256 startTime, uint256 amount) = 
                IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrA(_account, protTrNum, j);
            
            if (startTime < distEnd && amount > 0) {
                currentAmount = currentAmount.add(amount);
            }
        }
        return currentAmount;
    }

    /**
     * @dev get historical balance for an account in tranche A single market in previous ditributions
     * @param _idxMarket market index
     * @param _account claimer address
     * @param _idxDistrib distribution index
     */
    function getHistoricalBalanceTrA(uint256 _idxMarket, address _account, uint256 _idxDistrib) public view returns(uint256) {
        uint256 actualIdxDistrib = availableMarketsRewards[_idxMarket].trADistributionCounter;
        uint256 protTrNum = availableMarkets[_idxMarket].protocolTrNumber;
        require(_idxDistrib <= actualIdxDistrib, "distrib index too high");
        uint256 callerCounter = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrA(_account, protTrNum);
        uint256 pastAmount;

        // find all distributions and take only the ones with date and time compatible with staking details
        for (uint256 j = 1; j <= callerCounter; j++) {
            (uint256 startTime, uint256 amount) = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrA(_account, protTrNum, j);
            uint256 distEnd = trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish;
            if (startTime < distEnd && amount > 0) {
                pastAmount = pastAmount.add(amount);
            }
        }
        return pastAmount;
    }


    /**
     * @dev get historical balance for an account in tranche A single market in previous ditributions
     * @param _idxMarket market index
     * @param _account claimer address
     */
    function getCurrentBalanceTrB(uint256 _idxMarket, address _account) public view returns(uint256) {
        uint256 actualIdxDistrib = availableMarketsRewards[_idxMarket].trBDistributionCounter;
        uint256 protTrNum = availableMarkets[_idxMarket].protocolTrNumber;
        uint256 callerCounter = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrB(_account, protTrNum);
        uint256 distEnd = trancheBRewardsInfo[_idxMarket][actualIdxDistrib].periodFinish;
        uint256 currentAmount;

        // find all distributions and take only the ones with date and time compatible with staking details
        for (uint256 j = 1; j <= callerCounter; j++) {
            (uint256 startTime, uint256 amount) = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrB(_account, protTrNum, j);
            
            if (startTime < distEnd && amount > 0) {
                currentAmount = currentAmount.add(amount);
            }
        }
        return currentAmount;
    }

    /**
     * @dev claim historical rewards for an account in tranche B single market
     * @param _idxMarket market index
     * @param _account claimer address
     */
    function getHistoricalUnclaimedRewardsAmountTrB(uint256 _idxMarket, address _account) public view returns(uint256) {
        uint256 currDistib = availableMarketsRewards[_idxMarket].trBDistributionCounter;
        // uint256 protTrNum = availableMarkets[_idxMarket].protocolTrNumber;
        // uint256 callerCounter = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrB(_account, protTrNum);
        uint256 pastRewards;

        if (currDistib > 1) {
            // find all distributions and take only the ones with date and time compatible with staking details
            for (uint256 i = 1; i < currDistib; i++) {
                // for (uint256 j = 1; j <= callerCounter; j++) {
                //     (uint256 startTime, uint256 amount) = IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrB(_account, protTrNum, j);
                //     uint256 distEnd = trancheBRewardsInfo[_idxMarket][i].periodFinish;
                    // if (startTime < distEnd && amount > 0) {
                        uint256 pastTrBEarned = trBEarned(_idxMarket, _account, i);
                        pastRewards = pastRewards.add(pastTrBEarned);
                    // }
                // }
            }
        }
        return pastRewards;
    }


    /**
     * @dev get historical balance for an account in tranche B single market in previous ditributions
     * @param _idxMarket market index
     * @param _account claimer address
     * @param _idxDistrib distribution index
     */
    function getHistoricalBalanceTrB(uint256 _idxMarket, address _account, uint256 _idxDistrib) public view returns(uint256) {
        uint256 actualIdxDistrib = availableMarketsRewards[_idxMarket].trBDistributionCounter;
        require(_idxDistrib <= actualIdxDistrib, "distrib index too high");
        uint256 callerCounter = 
            IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrB(_account, availableMarkets[_idxMarket].protocolTrNumber);
        uint256 pastAmount;

        // find all distributions and take only the ones with date and time compatible with staking details
        for (uint256 j = 1; j <= callerCounter; j++) {
            (uint256 startTime, uint256 amount) = 
                IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrB(_account, availableMarkets[_idxMarket].protocolTrNumber, j);
            uint256 distEnd = trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish;
            if (startTime < distEnd && amount > 0) {
                pastAmount = pastAmount.add(amount);
            }
        }
        return pastAmount;
    }



    /* ========== INTERNAL, MUTATIVE AND RESTRICTED FUNCTIONS ========== */

    /**
     * @dev set the address of the reward token
     * @param _token rewards token address (SLICE or other)
     */
    function setRewardTokenAddress(address _token) external onlyOwner {
        require(_token != address(0), "IncentiveController: address not allowed");
        rewardsTokenAddress = _token;
    }

    /**
     * @dev set the address of the market helper contract
     * @param _mktHelper market helper contract address
     */
    function setMarketHelperAddress(address _mktHelper) external onlyOwner {
        require(_mktHelper != address(0), "IncentiveController: address not allowed");
        mktHelperAddress = _mktHelper;
    }

    /**
     * @dev add a new market to this contract
     * @param _protocol protocol address
     * @param _protocolTrNumber protocol tranche number
     * @param _balFactor balance factor, meaning percentage on tranche B for asintotic values (scaled by 1e18)
     * @param _marketPercentage initial percantage for this market (scaled by 1e18)
     * @param _extProtReturn external protocol returns (compound, aave, BenQi and so on) (scaled by 1e18)
     * @param _underlyingDecs underlying decimals
     * @param _underlyingPrice underlying price
     * @param _chainAggrInterface,chainlink price address
     * @param _reciprocPrice,is reciprocal price or not
     */
    function addTrancheMarket(address _protocol, 
            uint256 _protocolTrNumber,
            uint256 _balFactor,
            uint256 _marketPercentage,
            uint256 _extProtReturn,
            // uint256 _rewardsDuration,
            uint256 _underlyingDecs,
            uint256 _underlyingPrice,
            address _chainAggrInterface,
            bool _reciprocPrice) external onlyOwner{
        require(_balFactor <= uint256(1e18), "IncentiveController: balance factor too high");
        require(_marketPercentage <= uint256(1e18), "IncentiveController: market percentage too high");
        // require(_rewardsDuration > 0, "IncentiveController: rewards duration cannot be zero");
        availableMarkets[marketsCounter].protocol = _protocol;
        availableMarkets[marketsCounter].protocolTrNumber = _protocolTrNumber;
        ( , , address trAAddress, address trBAddress) = IProtocol(_protocol).trancheAddresses(_protocolTrNumber);
        require(trAAddress != address(0) && trBAddress != address(0), "IncentiveController: tranches not found");
        availableMarkets[marketsCounter].aTranche = trAAddress;
        availableMarkets[marketsCounter].bTranche = trBAddress;
        availableMarkets[marketsCounter].balanceFactor = _balFactor; // percentage scaled by 10^18: 0-18 (i.e. 500000000000000000 = 0.5 * 1e18 = 50%)
        availableMarkets[marketsCounter].enabled = true;
        availableMarkets[marketsCounter].extProtocolPercentage = _extProtReturn;  // percentage scaled by 10^18: 0 - 1e18 (i.e. 30000000000000000 = 0.03 * 1e18 = 3%)
        availableMarketsRewards[marketsCounter].marketRewardsPercentage = _marketPercentage;  // percentage scaled by 10^18: 0-18 (i.e. 500000000000000000 = 0.5 * 1e18 = 50%)
        availableMarketsRewards[marketsCounter].underlyingDecimals = _underlyingDecs;

        IPriceHelper(priceHelperAddress).setExternalProviderParameters(marketsCounter, _chainAggrInterface, _reciprocPrice);

        if (_underlyingPrice > 0)
            availableMarketsRewards[marketsCounter].underlyingPrice = _underlyingPrice;
        else
            availableMarketsRewards[marketsCounter].underlyingPrice = IPriceHelper(priceHelperAddress).getNormalizedChainlinkPrice(marketsCounter);

        initRewardsSingleMarket(marketsCounter);
        
        emit NewMarketAdded(marketsCounter, availableMarkets[marketsCounter].protocol, availableMarkets[marketsCounter].protocolTrNumber,
            availableMarkets[marketsCounter].balanceFactor, availableMarkets[marketsCounter].extProtocolPercentage,
            availableMarketsRewards[marketsCounter].marketRewardsPercentage, block.timestamp);

        marketsCounter = marketsCounter.add(1);
    }

 
    /**
     * @dev enable or disable a single market
     * @param _idxMarket market index
     * @param _enable true or false
     */
    function enableSingleMarket(uint256 _idxMarket, bool _enable) external onlyOwner {
        availableMarkets[_idxMarket].enabled = _enable;
    }

    /**
     * @dev enable or disable a single market
     * @param _enables true or false array
     */
    function enableAllMarket(bool[] memory _enables) external onlyOwner {
        require(_enables.length == marketsCounter, "IncentiveController: enable array not correct length");
        for (uint256 i = 0; i < marketsCounter; i++) {
            availableMarkets[i].enabled = _enables[i];
        }
    }

    /**
     * @dev set single market rewards percentage
     * @param _idxMarket market index
     * @param _percentage rewards percentage (scaled by 1e18)
     */
    function setRewardsPercentageSingleMarket(uint256 _idxMarket, uint256 _percentage) external onlyOwner {
        require(_idxMarket < marketsCounter, "IncentiveController: Market does not exist");
        availableMarketsRewards[_idxMarket].marketRewardsPercentage = _percentage;
    }

    /**
     * @dev set single market rewards percentage
     * @param _percentages rewards percentage array (scaled by 1e18)
     */
    function setRewardsPercentageAllMarkets(uint256[] memory _percentages) external onlyOwner {
        require(_percentages.length == marketsCounter, "IncentiveController: ext protocol array not correct length");
        for (uint256 i = 0; i < marketsCounter; i++) {
            availableMarketsRewards[i].marketRewardsPercentage = _percentages[i];
        }
    }

    /**
     * @dev set external returns for a market
     * @param _idxMarket market index
     * @param _extProtPerc external protocol rewards percentage (scaled by 1e18)
     */
    function setExtProtocolPercentSingleMarket(uint256 _idxMarket, uint256 _extProtPerc) external onlyOwner {
        require(_idxMarket < marketsCounter, "IncentiveController: Market does not exist");
        availableMarkets[_idxMarket].extProtocolPercentage = _extProtPerc;
    }

    /**
     * @dev set external returns for all markets
     * @param _extProtPercs external protocol rewards percentage array (scaled by 1e18)
     */
    function setExtProtocolPercentAllMarkets(uint256[] memory _extProtPercs) external onlyOwner {
        require(_extProtPercs.length == marketsCounter, "IncentiveController: ext protocol array not correct length");
        for (uint256 i = 0; i < marketsCounter; i++) {
            availableMarkets[i].extProtocolPercentage = _extProtPercs[i];
        }
    }

    /**
     * @dev set balance factor (asynthotic value for tranche B) for a market
     * @param _idxMarket market index
     * @param _balFactor balance factor (scaled by 1e18)
     */
    function setBalanceFactorSingleMarket(uint256 _idxMarket, uint256 _balFactor) external onlyOwner {
        require(_idxMarket < marketsCounter, "IncentiveController: Market does not exist");
        availableMarkets[_idxMarket].balanceFactor = _balFactor;
    }

    /**
     * @dev set balance factor (asynthotic value for tranche B) for all markets
     * @param _balFactors balance factor array (scaled by 1e18)
     */
    function setBalanceFactorAllMarkets(uint256[] memory _balFactors) external onlyOwner {
        require(_balFactors.length == marketsCounter, "IncentiveController: ext protocol array not correct length");
        for (uint256 i = 0; i < marketsCounter; i++) {
            availableMarkets[i].balanceFactor = _balFactors[i];
        }
    }

    /**
     * @dev set decimals for a market
     * @param _idxMarket market index
     * @param _underDecs underlying decimals
     */
    function setUnderlyingDecimalsSingleMarket(uint256 _idxMarket, uint256 _underDecs) external onlyOwner {
        require(_idxMarket < marketsCounter, "IncentiveController: Market does not exist");
        availableMarketsRewards[_idxMarket].underlyingDecimals = _underDecs;
    }

    /**
     * @dev set decimals for all markets
     * @param _underDecs underlying decimals
     */
    function setUnderlyingDecimalsAllMarkets(uint256[] memory _underDecs) external onlyOwner {
        require(_underDecs.length == marketsCounter, "IncentiveController: underlying decimals array not correct length");
        for (uint256 i = 0; i < marketsCounter; i++) {
            availableMarketsRewards[i].underlyingDecimals = _underDecs[i];
        }
    }

    /**
     * @dev set underlying price in common currency for a market (scaled by 1e18)
     * @param _idxMarket market index
     * @param _price underlying price (scaled by 1e18)
     */
    function setUnderlyingPriceManuallySingleMarket(uint256 _idxMarket, uint256 _price) external onlyOwner {
        require(_idxMarket < marketsCounter, "IncentiveController: Market does not exist");
        availableMarketsRewards[_idxMarket].underlyingPrice = _price;
    }

    /**
     * @dev set underlying price in common currency for a market (scaled by 1e18)
     * @param _idxMarket market index
     */
    function setUnderlyingPriceFromChainlinkSingleMarket(uint256 _idxMarket) public onlyOwner {
        require(_idxMarket < marketsCounter, "IncentiveController: Market does not exist");
        availableMarketsRewards[_idxMarket].underlyingPrice = IPriceHelper(priceHelperAddress).getNormalizedChainlinkPrice(_idxMarket);
    }

    /**
     * @dev set underlying price in common currency for all markets (scaled by 1e18)
     * @param _prices underlying prices array (scaled by 1e18)
     */
    function setUnderlyingPriceManuallyAllMarkets(uint256[] memory _prices) external onlyOwner {
        require(_prices.length == marketsCounter, "IncentiveController: Prices array not correct length");
        for (uint256 i = 0; i < marketsCounter; i++) {
            availableMarketsRewards[i].underlyingPrice = _prices[i];
        }
    }

    /**
     * @dev set underlying price in common currency for all markets (scaled by 1e18)
     */
    function setUnderlyingPriceFromChainlinkAllMarkets() external onlyOwner {
        for (uint256 i = 0; i < marketsCounter; i++) {
            setUnderlyingPriceFromChainlinkSingleMarket(i);
        }
    }

    /**
     * @dev freeze total supply at the end of current 
     */
    function freezeTotalSupplyAllMarkets() external onlyOwner {
        for (uint i = 0; i < marketsCounter; i++) {
            // freezeTotalSupplySingleMarket(i);
            uint256 idxDistribA = availableMarketsRewards[i].trADistributionCounter;
            uint256 idxDistribB = availableMarketsRewards[i].trBDistributionCounter;
            // require(block.timestamp > trancheARewardsInfo[i][idxDistrib].periodFinish, "IncentiveController: distribution not finished yet");
            if (block.timestamp > trancheARewardsInfo[i][idxDistribA].periodFinish)
                trancheARewardsInfo[i][idxDistribA].finalTotalSupply = IERC20Upgradeable(availableMarkets[i].aTranche).totalSupply();
            if (block.timestamp > trancheBRewardsInfo[i][idxDistribB].periodFinish)    
                trancheBRewardsInfo[i][idxDistribB].finalTotalSupply = IERC20Upgradeable(availableMarkets[i].bTranche).totalSupply();
        }
    }
    
    /* REWARDS DISTRIBUTION */

    /**
     * @dev update rewards per market tranche A (internal)
     * @param _idxMarket market index
     * @param _account account address
     * @param _idxDistrib distribution index
     */
    function updateRewardsPerMarketTrancheA(uint256 _idxMarket, address _account, uint256 _idxDistrib) internal {
        trancheARewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored = rewardPerTrAToken(_idxMarket, _idxDistrib);
        trancheARewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime = lastTimeTrARewardApplicable(_idxMarket, _idxDistrib);
        if (_account != address(0)) {
            trARewards[_idxMarket][_idxDistrib][_account] = trAEarned(_idxMarket, _account, _idxDistrib);
            userRewardPerTokenTrAPaid[_idxMarket][_idxDistrib][_account] = trancheARewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored;
        }
    }

    /**
     * @dev update rewards per market tranche B (internal)
     * @param _idxMarket market index
     * @param _account account address
     * @param _idxDistrib distribution index
     */
    function updateRewardsPerMarketTrancheB(uint256 _idxMarket, address _account, uint256 _idxDistrib) internal {
        trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored = rewardPerTrBToken(_idxMarket, _idxDistrib);
        trancheBRewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime = lastTimeTrBRewardApplicable(_idxMarket, _idxDistrib);
        if (_account != address(0)) {
            trBRewards[_idxMarket][_idxDistrib][_account] = trBEarned(_idxMarket, _account, _idxDistrib);
            userRewardPerTokenTrBPaid[_idxMarket][_idxDistrib][_account] = trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored;
        }
    }

    /**
     * @dev update rewards amount for all enabled markets, splitting the amount between each market via market percentage
     * @param _totalAmount total max rewards amount
     * @param _rewardsDuration rewards duration (in seconds)
     */
    function updateRewardAmountsAllMarkets(uint256 _totalAmount, uint256 _rewardsDuration) external onlyOwner {
        require(marketsCounter > 0, 'IncentiveController: no markets');
        require(_totalAmount > 0, "IncentiveController: _totalAmount has to be greater than zero ");
        require(_rewardsDuration > 0, "IncentiveController: _rewardsDuration has to be greater than zero ");
        uint256 totPercent = getMarketRewardsPercentage();
        require(totPercent > 0 && totPercent <= uint256(1e18), "IncentiveController: markets reward percentage not correct");

        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(rewardsTokenAddress), msg.sender, address(this), _totalAmount);

        for (uint i = 0; i < marketsCounter; i++) {
            uint256 trRewardsAmount = _totalAmount.mul(availableMarketsRewards[i].marketRewardsPercentage).div(1e18);
            updateRewardsSingleMarketInternal(i, trRewardsAmount, _rewardsDuration);
        }
        emit NewDistribution(_totalAmount, _rewardsDuration);
    }

    /**
     * @dev internal function
     * @dev update rewards amount for an enabled market, splitting the amount between tranche A & B
     * @param _idxMarket market index
     * @param _rewardAmount amount of tokens to distribute to this market (tranche A + tranche B)
     * @param _rewardsDuration rewards duration (in seconds)
     */
    function updateRewardsSingleMarketInternal(uint256 _idxMarket, uint256 _rewardAmount, uint256 _rewardsDuration) internal {
        if (_rewardAmount > 0 && _idxMarket < marketsCounter && availableMarkets[_idxMarket].enabled){
            uint256 trBPercent = getTrBRewardsPercent(_idxMarket);
        
            uint256 trBAmount = _rewardAmount.mul(trBPercent).div(1e18);
            uint256 trAAmount = _rewardAmount.sub(trBAmount);

            // save TVL before next distribution - DON'T overwrite finalTotalSupply if already set when distribution ends!!!
            uint256 prevIdxCount = availableMarketsRewards[_idxMarket].trADistributionCounter;
            if (trancheARewardsInfo[_idxMarket][prevIdxCount].finalTotalSupply == 0)
                trancheARewardsInfo[_idxMarket][prevIdxCount].finalTotalSupply = IERC20Upgradeable(availableMarkets[_idxMarket].aTranche).totalSupply();
            if (trancheBRewardsInfo[_idxMarket][prevIdxCount].finalTotalSupply == 0)
                trancheBRewardsInfo[_idxMarket][prevIdxCount].finalTotalSupply = IERC20Upgradeable(availableMarkets[_idxMarket].bTranche).totalSupply();

            // new distribution
            availableMarketsRewards[_idxMarket].trancheARewardsAmount = trAAmount;
            notifyRewardAmountTrancheA(_idxMarket, trAAmount, _rewardsDuration);
            
            availableMarketsRewards[_idxMarket].trancheBRewardsAmount = trBAmount;
            notifyRewardAmountTrancheB(_idxMarket, trBAmount, _rewardsDuration);

            uint256 _idxDistrib = availableMarketsRewards[_idxMarket].trADistributionCounter;

            if (_idxDistrib != prevIdxCount) {
                trancheARewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored = 0;
                trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored = 0;
            }

            trancheARewardsInfo[_idxMarket][_idxDistrib].rewardsDuration = _rewardsDuration;
            trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardsDuration = _rewardsDuration;

            emit FundsDistributed(_idxMarket, trAAmount, trBAmount, block.timestamp);
        }
    }

    /**
     * @dev update rewards amount for an enabled market, splitting the amount between tranche A & B
     * @param _idxMarket market index
     * @param _rewardAmount amount of tokens to distribute to this market (tranche A + tranche B)
     * @param _rewardsDuration rewards duration (in seconds)
     */
    function updateRewardsSingleMarket(uint256 _idxMarket, uint256 _rewardAmount, uint256 _rewardsDuration) external onlyOwner {
        require(_rewardAmount > 0, "IncentiveController: _rewardAmount has to be greater than zero ");
        require(_idxMarket < marketsCounter, 'IncentiveController: market does not exist');
        require(availableMarkets[_idxMarket].enabled, "IncentiveController: market not enabled");

        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(rewardsTokenAddress), msg.sender, address(this), _rewardAmount);

        updateRewardsSingleMarketInternal(_idxMarket, _rewardAmount, _rewardsDuration);
    }

    /**
     * @dev internal function
     * @dev initiate rewards for an newly added single market
     * @param _idxMarket market index
     */
    function initRewardsSingleMarket(uint256 _idxMarket) internal {
        availableMarketsRewards[_idxMarket].trancheARewardsAmount = 0;
        availableMarketsRewards[_idxMarket].trancheBRewardsAmount = 0;
        trancheARewardsInfo[_idxMarket][0].rewardsDuration = 1;
        trancheBRewardsInfo[_idxMarket][0].rewardsDuration = 1;
        trancheARewardsInfo[_idxMarket][0].lastUpdateTime = block.timestamp;
        trancheBRewardsInfo[_idxMarket][0].lastUpdateTime = block.timestamp;
        trancheARewardsInfo[_idxMarket][0].periodFinish = block.timestamp + 1;
        trancheBRewardsInfo[_idxMarket][0].periodFinish = block.timestamp + 1;
        trancheARewardsInfo[_idxMarket][0].rewardPerTokenStored = 0;
        trancheBRewardsInfo[_idxMarket][0].rewardPerTokenStored = 0;
    }

    /**
     * @dev internal function to start or stretch a duration
     * @dev notify rewards amount for a market tranche A
     * @param _idxMarket market index
     * @param _rewardAmount amount of tokens to distribute to this tranche A
     * @param _rewardsDuration rewards duration (in seconds)
     */
    function notifyRewardAmountTrancheA(uint256 _idxMarket, 
            uint256 _rewardAmount, 
            uint256 _rewardsDuration) internal {
        updateRewardsPerMarketTrancheA(_idxMarket, address(0), availableMarketsRewards[_idxMarket].trADistributionCounter);
        uint256 _idxDistrib = availableMarketsRewards[_idxMarket].trADistributionCounter;
        require(block.timestamp.add(_rewardsDuration) >= trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish, "IncentiveController: Cannot reduce existing period");
        
        if (block.timestamp >= trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish) {
            // update index to a new distribution
            availableMarketsRewards[_idxMarket].trADistributionCounter = availableMarketsRewards[_idxMarket].trADistributionCounter.add(1);
            _idxDistrib = availableMarketsRewards[_idxMarket].trADistributionCounter;
            // update rewards for the new distribution
            availableMarketsRewards[_idxMarket].trancheARewardsAmount = _rewardAmount;
            trancheARewardsInfo[_idxMarket][_idxDistrib].rewardRate = _rewardAmount.div(_rewardsDuration);
            // since we can have deposit even at the beginning, we have to set reward per token and rewards per token stored
            trancheARewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored = rewardPerTrAToken(_idxMarket, _idxDistrib);
            trancheARewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime = lastTimeTrARewardApplicable(_idxMarket, _idxDistrib);
        } else {
            // update remaining time in duration
            uint256 remaining = trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(trancheARewardsInfo[_idxMarket][_idxDistrib].rewardRate);
            // update rewards rate accordingly
            trancheARewardsInfo[_idxMarket][_idxDistrib].rewardRate = _rewardAmount.add(leftover).div(_rewardsDuration);
            availableMarketsRewards[_idxMarket].trancheARewardsAmount = leftover.add(_rewardAmount);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 balance = IERC20Upgradeable(rewardsTokenAddress).balanceOf(address(this));
        require(trancheARewardsInfo[_idxMarket][_idxDistrib].rewardRate <= balance.div(_rewardsDuration), "IncentiveController: Provided reward too high");

        trancheARewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime = block.timestamp;
        trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish = block.timestamp.add(_rewardsDuration);
        emit RewardAddedTrancheA(_rewardAmount, trancheARewardsInfo[_idxMarket][_idxDistrib].periodFinish);
    }

    /**
     * @dev internal function to start or stretch a duration
     * @dev notify rewards amount for a market tranche B
     * @param _idxMarket market index
     * @param _rewardAmount amount of tokens to distribute to this tranche B
     * @param _rewardsDuration rewards duration (in seconds)
     */
    function notifyRewardAmountTrancheB(uint256 _idxMarket, 
            uint256 _rewardAmount, 
            uint256 _rewardsDuration) internal {
        updateRewardsPerMarketTrancheB(_idxMarket, address(0), availableMarketsRewards[_idxMarket].trBDistributionCounter);
        uint256 _idxDistrib = availableMarketsRewards[_idxMarket].trBDistributionCounter;
        require(block.timestamp.add(_rewardsDuration) >= trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish, "IncentiveController: Cannot reduce existing period");
        
        if (block.timestamp >= trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish) {
            // update index to a new distribution
            availableMarketsRewards[_idxMarket].trBDistributionCounter = availableMarketsRewards[_idxMarket].trBDistributionCounter.add(1);
            _idxDistrib = availableMarketsRewards[_idxMarket].trBDistributionCounter;
            // update rewards for the new distribution
            availableMarketsRewards[_idxMarket].trancheBRewardsAmount = _rewardAmount;
            trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardRate = _rewardAmount.div(_rewardsDuration);
            // since we can have deposit even at the beginning, we have to set reward per token and rewards per token stored
            trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardPerTokenStored = rewardPerTrBToken(_idxMarket, _idxDistrib);
            trancheBRewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime = lastTimeTrBRewardApplicable(_idxMarket, _idxDistrib);
        } else {
            // update remaining time in duration
            uint256 remaining = trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardRate);
            // update rewards rate accordingly
            trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardRate = _rewardAmount.add(leftover).div(_rewardsDuration);
            availableMarketsRewards[_idxMarket].trancheBRewardsAmount = leftover.add(_rewardAmount);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 balance = IERC20Upgradeable(rewardsTokenAddress).balanceOf(address(this));
        require(trancheBRewardsInfo[_idxMarket][_idxDistrib].rewardRate <= balance.div(_rewardsDuration), "IncentiveController: Provided reward too high");

        trancheBRewardsInfo[_idxMarket][_idxDistrib].lastUpdateTime = block.timestamp;
        trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish = block.timestamp.add(_rewardsDuration);
        emit RewardAddedTrancheB(_rewardAmount, trancheBRewardsInfo[_idxMarket][_idxDistrib].periodFinish);
    }

    /* USER CLAIM REWARDS */
    /**
     * @dev claim all rewards from all markets for a single user
     * @param _account claimer address
     */
    function claimRewardsAllMarkets(address _account) external override returns (bool) {
        // since this function is called from another contract, a way to be sure it was completed is to return a value, read by the caller contract
        for (uint256 i = 0; i < marketsCounter; i++) {
            claimHistoricalRewardSingleMarketTrA(i, _account);
            claimRewardSingleMarketTrA(i, availableMarketsRewards[i].trADistributionCounter, _account);
            claimHistoricalRewardSingleMarketTrB(i, _account);
            claimRewardSingleMarketTrB(i, availableMarketsRewards[i].trBDistributionCounter, _account);
        }
        return true;
    }

    /**
     * @dev claim all rewards from a market tranche A for a single user
     * @param _idxMarket market index
     * @param _idxDistrib distribution index
     * @param _account claimer address
     */
    function claimRewardSingleMarketTrA(uint256 _idxMarket, uint256 _idxDistrib, address _account) public override nonReentrant {
        updateRewardsPerMarketTrancheA(_idxMarket, _account, _idxDistrib);
        uint256 reward = trARewards[_idxMarket][_idxDistrib][_account];
        if (reward > 0) {
            trARewards[_idxMarket][_idxDistrib][_account] = 0;
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(rewardsTokenAddress), _account, reward);
            emit RewardPaid(_account, reward);
        }
    }

    /**
     * @dev claim all rewards from a market tranche B for a single user
     * @param _idxMarket market index
     * @param _idxDistrib distribution index
     * @param _account claimer address
     */
    function claimRewardSingleMarketTrB(uint256 _idxMarket, uint256 _idxDistrib, address _account) public override nonReentrant {
        updateRewardsPerMarketTrancheB(_idxMarket, _account, _idxDistrib);
        uint256 reward = trBRewards[_idxMarket][_idxDistrib][_account];
        if (reward > 0) {
            trBRewards[_idxMarket][_idxDistrib][_account] = 0;
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(rewardsTokenAddress), _account, reward);
            emit RewardPaid(_account, reward);
        }
    }

    /**
     * @dev claim historical rewards for an account in tranche A single market
     * @param _idxMarket market index
     * @param _account claimer address
     */
    function claimHistoricalRewardSingleMarketTrA(uint256 _idxMarket, address _account) public nonReentrant {
        uint256 _idxDistrib = availableMarketsRewards[_idxMarket].trADistributionCounter;
        // uint256 protNum = availableMarkets[_idxMarket].protocolTrNumber;
        // uint256 callerCounter = 
        //     IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrA(_account, protNum);
        uint256 pastRewards;
        
        if (_idxDistrib > 1) {
            // find all distributions and take only the ones with date and time compatible with staking details
            for (uint256 i = 1; i < _idxDistrib; i++) {
                // for (uint256 j = 1; j <= callerCounter; j++) {
                //     (uint256 startTime, uint256 amount) = 
                //         IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrA(_account, protNum, j);
                //     uint256 distEnd = trancheARewardsInfo[_idxMarket][i].periodFinish;
                //     if (startTime < distEnd && amount > 0) {
                        updateRewardsPerMarketTrancheA(_idxMarket, _account, i);
                        pastRewards = pastRewards.add(trARewards[_idxMarket][i][_account]);
                        trARewards[_idxMarket][i][_account] = 0;
                //     }
                // }
            }
        }
        if (pastRewards > 0) {
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(rewardsTokenAddress), _account, pastRewards);
            emit PastRewardsPaidTrancheA(_idxMarket, _account, pastRewards);
        }
    }

    /**
     * @dev claim historical rewards for an account in tranche B single market
     * @param _idxMarket market index
     * @param _account account address
     */
    function claimHistoricalRewardSingleMarketTrB(uint256 _idxMarket, address _account) public nonReentrant {
        uint256 _idxDistrib = availableMarketsRewards[_idxMarket].trBDistributionCounter;
        // uint256 protNum = availableMarkets[_idxMarket].protocolTrNumber;
        // uint256 callerCounter = 
        //     IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserStakeCounterTrB(_account, protNum);
        uint256 pastRewards;

        if (_idxDistrib > 1) {
            // find all distributions and take only the ones with date and time compatible with staking details
            for (uint256 i = 1; i < _idxDistrib; i++) {
                // for (uint256 j = 1; j <= callerCounter; j++) {
                //     (uint256 startTime, uint256 amount) = 
                //         IProtocol(availableMarkets[_idxMarket].protocol).getSingleTrancheUserSingleStakeDetailsTrB(_account, protNum, j);
                //     uint256 distEnd = trancheBRewardsInfo[_idxMarket][i].periodFinish;
                //     if (startTime < distEnd && amount > 0) {
                        updateRewardsPerMarketTrancheB(_idxMarket, _account, i);
                        pastRewards = pastRewards.add(trBRewards[_idxMarket][i][_account]);
                        trBRewards[_idxMarket][i][_account] = 0;
                //     }
                // }
            }
        }
        if (pastRewards > 0) {
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(rewardsTokenAddress), _account, pastRewards);
            emit PastRewardsPaidTrancheB(_idxMarket, _account, pastRewards);
        }
    }
    
    /**
     * @dev Recalculate and update Slice speeds for all markets
     */
    function refreshSliceSpeeds(/*bool _useChainlink*/) external onlyOwner {
        require(msg.sender == tx.origin, "IncentiveController: only externally owned accounts may refresh speeds");
        refreshSliceSpeedsInternal(/*_useChainlink*/);
    }

    /**
     * @dev internal function - refresh rewards percentage of available and enabled markets
     */
    function refreshSliceSpeedsInternal(/*bool _useChainlink*/) internal {
        uint256 allMarketsEnabledTVL = getAllMarketsTVL(/*_useChainlink*/);
        address _protocol;
        uint256 _trNum;
        uint256 _underPrice;
        uint256 _underDecs;
        uint256 _mktTVL;

        for (uint i = 0; i < marketsCounter; i++) {
            if (availableMarkets[i].enabled && allMarketsEnabledTVL > 0) {
                _protocol = availableMarkets[i].protocol;
                _trNum = availableMarkets[i].protocolTrNumber;
                // if (_useChainlink)
                //     setUnderlyingPriceFromChainlinkSingleMarket(i);
                _underPrice = availableMarketsRewards[i].underlyingPrice;
                _underDecs = availableMarketsRewards[i].underlyingDecimals;
                _mktTVL = IMarketHelper(mktHelperAddress).getTrancheMarketTVL(_protocol, _trNum, _underPrice, _underDecs);
                // uint256 _mktTVLtmpMarketVal = _mktTVL.mul(availableMarketsRewards[i].underlyingPrice).div(1e18);
                uint256 percentTVL = _mktTVL.mul(1e18).div(allMarketsEnabledTVL); //percentage scaled 1e18
                availableMarketsRewards[i].marketRewardsPercentage = percentTVL;
            } else {
                availableMarketsRewards[i].marketRewardsPercentage = 0;
            }

            emit SliceSpeedUpdated(i, availableMarketsRewards[i].marketRewardsPercentage);
        }
    }

    /**
     * @dev transfer tokens from here to a destination address (emergency only)
     * @param _token token address to transfer
     * @param _to recipient address
     * @param _amount token amount to transfer
     */
    function emergencyTokenTransfer(address _token, address _to, uint256 _amount) external onlyOwner {
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(_token), _to, _amount);
    }

}