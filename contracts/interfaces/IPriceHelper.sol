// SPDX-License-Identifier: MIT
/**
 * Created on 2021-06-18
 * @summary: PriceHelper Interface
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

interface IPriceHelper {
    function setExternalProviderParameters(uint256 _idxMarket, address _extProvAddress, bool _reciprPrice) external;
    function getLatestChainlinkPairInfo(uint256 _idxMarket) external view returns (string memory, uint256, uint8);
    function getNormalizedChainlinkPrice(uint256 _idxMarket) external view returns (uint256);
    function getChainlinkDecimals(uint256 _idxMarket) external view returns (uint8);
}