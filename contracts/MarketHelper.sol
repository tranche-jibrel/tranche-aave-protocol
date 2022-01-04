// SPDX-License-Identifier: MIT
/**
 * Created on 2021-04-06
 * @summary: Markets contract
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IProtocol.sol";
import "./interfaces/IMarketHelper.sol";
import "./math/SafeMathInt.sol";


contract MarketHelper is OwnableUpgradeable, IMarketHelper {
    using SafeMath for uint256;
    using SafeMathInt for int256;

    /**
     * @dev initialize contract
     */
    function initialize () public initializer() {
        OwnableUpgradeable.__Ownable_init();
    }

    /**
     * @dev return total values locked in a market (tranche A)
     * @param _protocol market protocol (JCompound, JAave, and so on) 
     * @param _protTrNum market tranche number inside protocol
     * @param _underlyingPrice underlying price of the market
     * @return trancheATVL market total value locked (tracnhe A)
     */
    function getTrancheAMarketTVL(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice,
            uint256 _underlyingDecs) public view override returns(uint256 trancheATVL) {
        require(_underlyingDecs <= 18, "MarketHelper: too many decimals");
        uint256 decsDiff = uint256(18).sub(_underlyingDecs);
        if (decsDiff > 0)
            trancheATVL = (IProtocol(_protocol).getTrAValue(_protTrNum)).mul(_underlyingPrice).mul(10**decsDiff).div(1e18);
        else
            trancheATVL = (IProtocol(_protocol).getTrAValue(_protTrNum)).mul(_underlyingPrice).div(1e18);
        return trancheATVL;
    }

    /**
     * @dev return total values locked in a market (tranche B)
     * @param _protocol market protocol (JCompound, JAave, and so on) 
     * @param _protTrNum market tranche number inside protocol
     * @param _underlyingPrice underlying price of the market
     * @return trancheBTVL market total value locked (tranche B)
     */
    function getTrancheBMarketTVL(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice,
            uint256 _underlyingDecs) public view override returns(uint256 trancheBTVL) {
        require(_underlyingDecs <= 18, "MarketHelper: too many decimals");
        uint256 decsDiff = uint256(18).sub(_underlyingDecs);
        if (decsDiff > 0)
            trancheBTVL = (IProtocol(_protocol).getTrBValue(_protTrNum)).mul(_underlyingPrice).mul(10**decsDiff).div(1e18);
        else
            trancheBTVL = (IProtocol(_protocol).getTrBValue(_protTrNum)).mul(_underlyingPrice).div(1e18);
        return trancheBTVL;
    }

    /**
     * @dev return total values locked in a market
     * @param _protocol market protocol (JCompound, JAave, and so on) 
     * @param _protTrNum market tranche number inside protocol
     * @param _underlyingPrice underlying price of the market
     * @return trancheTVL market total value locked
     */
    function getTrancheMarketTVL(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice,
            uint256 _underlyingDecs) public view override returns(uint256 trancheTVL) {
        uint256 trATVL = getTrancheAMarketTVL(_protocol, _protTrNum, _underlyingPrice, _underlyingDecs);
        uint256 trBTVL = getTrancheBMarketTVL(_protocol, _protTrNum, _underlyingPrice, _underlyingDecs);
        trancheTVL = trATVL.add(trBTVL);
        return trancheTVL;
    }

/*************************************** MODEL ************************************************/
    /**
     * @dev get tranche A returns of an available market 
     * @param _protocol market protocol (JCompound, JAave, and so on) 
     * @param _protTrNum market tranche number inside protocol
     * @return trAReturns tranche A returns (0 - 1e18)
     */
    function getTrancheAReturns(address _protocol, uint256 _protTrNum) public view returns (uint256 trAReturns) {
        uint256 trancheARPB = IProtocol(_protocol).getTrancheACurrentRPB(_protTrNum);
        uint256 totBlksYear = IProtocol(_protocol).totalBlocksPerYear();
        uint256 trAPrice = IProtocol(_protocol).getTrancheAExchangeRate(_protTrNum);
        // calc percentage
        // trA APY = trARPB * 2102400 / trAPrice
        trAReturns = trancheARPB.mul(totBlksYear).mul(1e18).div(trAPrice);
        return trAReturns;
    }

    /**
     * @dev get tranche B returns of an available market
     * @param _protocol market protocol (JCompound, JAave, and so on) 
     * @param _protTrNum market tranche number inside protocol
     * @param _underlyingPrice underlying price of the market
     * @param _extProtRet external protocol return (from Compound, Aaave, and so on)
     * @return trBReturns tranche B returns (0 - 1e18)
     */
    function getTrancheBReturns(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice, 
            uint256 _underlyingDecs,
            uint256 _extProtRet) public view returns (int256 trBReturns) {
        uint256 trAReturns = getTrancheAReturns(_protocol, _protTrNum);
        uint256 trARetPercent = trAReturns.add(1e18); //(1+trARet)
        uint256 totTrancheTVL = getTrancheMarketTVL(_protocol, _protTrNum, _underlyingPrice,_underlyingDecs);
        uint256 trATVL = getTrancheAMarketTVL(_protocol, _protTrNum, _underlyingPrice,_underlyingDecs);
        uint256 trBTVL = totTrancheTVL.sub(trATVL);
        uint256 totRetPercent = _extProtRet.add(1e18); //(1+extProtRet)

        uint256 extFutureValue = totTrancheTVL.mul(totRetPercent).div(1e18); // totalTVL*(1+extProtRet)
        uint256 trAFutureValue = trATVL.mul(trARetPercent).div(1e18); // trATVL*(1+trARet)
        // (totalTVL*(1+extProtRet)-trATVL*(1+trARet)-trBTVL)/trBTVL
        trBReturns = (int256(extFutureValue).sub(int256(trAFutureValue)).sub(int256(trBTVL))).mul(int256(1e18)).div(int256(trBTVL));  //check decimals!!!
        return trBReturns;
    }

    /**
     * @dev get tranche B rewards percentage of an available market (scaled by 1e18)
     * @param _protocol market protocol (JCompound, JAave, and so on) 
     * @param _protTrNum market tranche number inside protocol
     * @param _underlyingPrice underlying price of the market
     * @param _extProtRet external protocol return (from Compound, Aaave, and so on)
     * @param _balFactor asynthotic balance factor between tranche A & B
     * @return trBRewardsPercentage tranche B rewards percentage (0 - 1e18)
     */
    function getTrancheBRewardsPercentage(address _protocol, 
            uint256 _protTrNum, 
            uint256 _underlyingPrice, 
            uint256 _underlyingDecs,
            uint256 _extProtRet, 
            uint256 _balFactor) external view override returns (int256 trBRewardsPercentage) {
        int256 trBReturns = int256(getTrancheBReturns(_protocol, _protTrNum, _underlyingPrice, _underlyingDecs, _extProtRet));
        int256 deltaAPY = int256(_extProtRet).sub(trBReturns); // extProtRet - trancheBReturn = DeltaAPY
        int256 deltaAPYPercentage = deltaAPY.mul(1e18).div(int256(_extProtRet)); // DeltaAPY / extProtRet = DeltaAPYPercentage
        trBRewardsPercentage = deltaAPYPercentage.add(int256(_balFactor)); // DeltaAPYPercentage + balanceFactor = trBPercentage
        if (trBRewardsPercentage < 0 )
            trBRewardsPercentage = 0;
        else if (trBRewardsPercentage > 1e18)
            trBRewardsPercentage = 1e18;
        return trBRewardsPercentage;
    }
}