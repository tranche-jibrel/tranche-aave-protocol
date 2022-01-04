// SPDX-License-Identifier: MIT
/**
 * Created on 2021-04-06
 * @summary: Chainlink Interface
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./libraries/AggregatorV3Interface.sol";
// https://docs.chain.link/docs/ethereum-addresses/

contract Chainlink2 is AggregatorV3Interface, Initializable {
    function decimals() external pure override returns (uint8) {
        uint8 test = 8;
        return test;
    }

    function description() external pure override returns (string memory) {
        return "USDC / USD";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId) external pure override returns (uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound) {
            roundId = 0;
            answer = 101276543;
        }

    function latestRoundData() external pure override returns (uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound) {
            roundId = 0;
            answer = 101276543;
        }
}