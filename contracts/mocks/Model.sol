// SPDX-License-Identifier: MIT
pragma solidity 0.8.8;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../math/SafeMathInt.sol";


contract Model {
    using SafeMath for uint256;
    using SafeMathInt for int256;

    uint256 public trACurrentRPB;
    uint256 public totalBlocksPerYear;
    uint256 public totalTrancheMarketTVL;
    uint public trancheAMarketTVL;
    uint public extProtocolPercentage;
    uint public balanceFactor;
    uint public trAPrice;


    constructor(uint _trARPB,
            uint _extProtPercent, // 30000000000000000 = 0.03 * 1e18
            uint _balFactor, 
            uint _trAPrice) {
        trACurrentRPB = _trARPB;
        // totalBlocksPerYear = 2102400;
        totalBlocksPerYear = 31536000; // seconds in 1 year
        extProtocolPercentage = _extProtPercent;
        balanceFactor = _balFactor;
        trAPrice = _trAPrice;
    }

    function setTranchesMarketTVL(uint _totAmount, uint _trAAmount) public {
        totalTrancheMarketTVL = _totAmount;
        trancheAMarketTVL = _trAAmount;
    }

    function setExtProtocolPercent(uint _extProtPerc) public {
        extProtocolPercentage = _extProtPerc;
    }

    function setBalanceFactor(uint _balFactor) public {
        balanceFactor = _balFactor;
    }

    function setTrARPB(uint _trARPB) public {
        trACurrentRPB = _trARPB;
    }
    
    function setTrAPrice(uint _trAPrice) public {
        trAPrice = _trAPrice;
    }

    function getTrancheAReturns() public view returns (uint256 trAReturns) {
        //require(availableMarkets[_idxMarket].enabled, "Market not enabled");
        //address _protocol = availableMarkets[_idxMarket].protocol;
        //uint256 _trNum = availableMarkets[_idxMarket].protocolTrNumber;
        uint256 trancheARPB = trACurrentRPB;
        uint256 totBlksYear = totalBlocksPerYear;
        //uint256 trAPrice = _trAPrice;
        // calc percentage
        // trA APY = trARPB * 2102400 / trAPrice
        trAReturns = trancheARPB.mul(totBlksYear).mul(1e18).div(trAPrice);
        return trAReturns;
    }
    
    function getExtFutureMaxValue() public view returns (uint extVal) {
        uint256 totTrancheTVL = totalTrancheMarketTVL;
        uint256 totRetPercent = extProtocolPercentage.add(1e18); //(1+extProtRet)

        extVal = totTrancheTVL.mul(totRetPercent).div(1e18); // totalTVL*(1+extProtRet)
        return extVal;
    }
    
    function getTrAFutureValue() public view returns (uint trAFutVal) {
        //require(availableMarkets[_idxMarket].enabled, "Market not enabled");
        uint256 trAReturns = getTrancheAReturns();
        uint256 trARetPercent = trAReturns.add(1e18); //(1+trARet)
        uint256 trATVL = trancheAMarketTVL;

        trAFutVal = trATVL.mul(trARetPercent).div(1e18); // trATVL*(1+trARet)
        // (totalTVL*(1+extProtRet)-trATVL*(1+trARet)-trBTVL)/trBTVL
        return trAFutVal;
    }

    function getTrancheBReturns() public view returns (int trBReturns) {
        //require(availableMarkets[_idxMarket].enabled, "Market not enabled");
        uint256 trAReturns = getTrancheAReturns();
        uint256 trARetPercent = trAReturns.add(1e18); //(1+trARet)
        uint256 totTrancheTVL = totalTrancheMarketTVL;
        uint256 trATVL = trancheAMarketTVL;
        uint256 trBTVL = totTrancheTVL.sub(trATVL);
        uint256 totRetPercent = extProtocolPercentage.add(1e18); //(1+extProtRet)

        uint256 extFutureMaxValue = totTrancheTVL.mul(totRetPercent).div(1e18); // totalTVL*(1+extProtRet)
        uint256 trAFutureValue = trATVL.mul(trARetPercent).div(1e18); // trATVL*(1+trARet)
        // (totalTVL*(1+extProtRet)-trATVL*(1+trARet)-trBTVL)/trBTVL
        trBReturns = (int(extFutureMaxValue).sub(int(trAFutureValue)).sub(int(trBTVL))).mul(int(1e18)).div(int(trBTVL));  //check decimals!!!
        return trBReturns;
    }
    
    function getDeltaAPYPercentage() public view returns (int256 deltaAPYPercentage) {
        //require(availableMarkets[_idxMarket].enabled, "Market not enabled");
        int256 trBReturns = int256(getTrancheBReturns());
        int256 extProtRet = int256(extProtocolPercentage);
        int256 deltaAPY = (extProtRet).sub(trBReturns); // extProtRet - trancheBReturn = DeltaAPY
        deltaAPYPercentage = deltaAPY.mul(1e18).div(extProtRet); // DeltaAPY / extProtRet = DeltaAPYPercentage
        return deltaAPYPercentage;
    }
    

    function getTrancheBRewardsPercentage() public view returns (int256 trBRewardsPercentage) {
        //require(availableMarkets[_idxMarket].enabled, "Market not enabled");
        int256 trBReturns = int256(getTrancheBReturns());
        int256 extProtRet = int256(extProtocolPercentage);
        int256 deltaAPY = (extProtRet).sub(trBReturns); // extProtRet - trancheBReturn = DeltaAPY
        int256 deltaAPYPercentage = deltaAPY.mul(1e18).div(extProtRet); // DeltaAPY / extProtRet = DeltaAPYPercentage
        trBRewardsPercentage = deltaAPYPercentage.add(int256(balanceFactor)); // DeltaAPYPercentage + balanceFactor = trBPercentage
        if (trBRewardsPercentage < 0 )
            trBRewardsPercentage = 0;
        else if (trBRewardsPercentage > 1e18)
            trBRewardsPercentage = 1e18;
        return trBRewardsPercentage;
    }
}