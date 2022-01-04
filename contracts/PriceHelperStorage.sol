// SPDX-License-Identifier: MIT
/**
 * Created on 2020-12-10
 * @summary: Price Oracle storage
 * @author: Jibrel Team
 */
pragma solidity 0.8.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PriceHelperStorage is OwnableUpgradeable {
/* WARNING: NEVER RE-ORDER VARIABLES! Always double-check that new variables are added APPEND-ONLY. Re-ordering variables can permanently BREAK the deployed proxy contract.*/
    struct Pair {
        address externalProviderAddress;    // external provider address
        uint256 chLinkDecimals;             // chainlink decimals
        bool reciprocalPrice;               // reciprocal price
    }

    uint256 public constant fixed_1 = 1e24;
    address public controllerAddress;

    mapping(uint256 => Pair) public pairs;
}