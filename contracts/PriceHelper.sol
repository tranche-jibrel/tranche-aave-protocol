// SPDX-License-Identifier: MIT
/**
 * Created on 2021-04-06
 * @summary: Price Helper contract
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./mocks/libraries/AggregatorV3Interface.sol";
import "./PriceHelperStorage.sol";
import "./interfaces/IPriceHelper.sol";

contract PriceHelper is OwnableUpgradeable, PriceHelperStorage, IPriceHelper {
    using SafeMathUpgradeable for uint;

    function initialize() external initializer() {
        OwnableUpgradeable.__Ownable_init();
    }

    function setControllerAddress(address _controller) external onlyOwner {
        controllerAddress = _controller;
    }

    modifier onlyController() {
        require(msg.sender == controllerAddress, "Not a controller");
        _;
    }

    /**
    * @dev set a chainlink parameters for the specified pair
    * @param _idxMarket market index
    * @param _extProvAddress chainlink address of the pair
    * @param _reciprPrice reciprocal price or not for the pair
    */
    function setExternalProviderParameters(uint256 _idxMarket, address _extProvAddress, bool _reciprPrice) external override onlyController {
        pairs[_idxMarket].externalProviderAddress = _extProvAddress;
        pairs[_idxMarket].chLinkDecimals = getChainlinkDecimals(_idxMarket);
        pairs[_idxMarket].reciprocalPrice = _reciprPrice;
        // emit NewExternalProviderParameters(_idxMarket, pairs[_pairId].basePairName, pairs[_pairId].quotePairName, pairs[_pairId].externalProviderAddress, pairs[_pairId].reciprocalPrice, block.number);
    }

    /**
     * @dev get latest info on single pair from chainlink
     * @param _idxMarket pair id
     * @return string as pair description, int as pair price, uint8 as pair decimals
     */
    function getLatestChainlinkPairInfo(uint256 _idxMarket) external view override returns (string memory, uint256, uint8) {
        uint256 clPrice = getNormalizedChainlinkPrice(_idxMarket);
        uint8 clDecimals = getChainlinkDecimals(_idxMarket);
        string memory clDescr = getChainlinkDescription(_idxMarket);
        return (clDescr, clPrice, clDecimals);
    }

    /**
     * @dev get latest decimals of a single pair from chainlink
     * @param _idxMarket pair id
     * @return uint8 as pair decimals
     */
    function getChainlinkDecimals(uint256 _idxMarket) public view override returns (uint8) {
        return AggregatorV3Interface(pairs[_idxMarket].externalProviderAddress).decimals();
    }

    /**
     * @dev get latest description of a single pair from chainlink
     * @param _idxMarket pair id
     * @return string as pair description
     */
    function getChainlinkDescription(uint256 _idxMarket) internal view returns (string memory) {
        return AggregatorV3Interface(pairs[_idxMarket].externalProviderAddress).description();
    }

    /**
     * @dev get latest price of a single pair from chainlink
     * @param _idxMarket pair id
     * @return int as pair price (18 decimals)
     */
    function getNormalizedChainlinkPrice(uint256 _idxMarket) public view override returns (uint256) {
        (uint80 roundID, 
            int price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound) = AggregatorV3Interface(pairs[_idxMarket].externalProviderAddress).latestRoundData();
        uint256 clPrice = uint256(price);
        uint256 clDecs = pairs[_idxMarket].chLinkDecimals;

        if(clDecs < 18) {
            uint256 diffDec = uint256(18).sub(clDecs);
            clPrice = clPrice.mul(10 ** diffDec);
        }

        if (pairs[_idxMarket].reciprocalPrice) {
            clPrice = reciprocal(uint256(price));
        }

        return clPrice; // scaled by 1e18
    }

    /**
     * @notice 1/x
     * @dev 
     * Test reciprocal(0) fails
     * Test reciprocal(fixed1()) returns fixed1()
     * Test reciprocal(fixed1()*fixed1()) returns 1 // Testing how the fractional is truncated
     * Test reciprocal(2*fixed1()*fixed1()) returns 0 // Testing how the fractional is truncated
     */
    function reciprocal(uint256 x) public pure returns (uint256) {
        require(x != 0, "PriceOracle: x = 0");
        // here "x" is already sacaled by 1e18
        // 24 + 24 - 18 = 30 decimals --> divide by 1e12 to have result scaled by 1e18
        return fixed_1.mul(fixed_1).div(x).div(1e12); // scaled by 1e18
    }

}