// SPDX-License-Identifier: MIT
pragma solidity 0.8.8;
// pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IWETH} from './interfaces/IWETH.sol';
import {IWETHGateway} from './interfaces/IWETHGateway.sol';
import "./TransferETHHelper.sol";

contract WETHGateway is IWETHGateway, Ownable {

  IWETH internal immutable WETH;
  address internal jAaveAddress;

  /**
   * @dev Sets the WETH address and the jAave contract address. Infinite approves lending pool.
   * @param _weth Address of the Wrapped Ether contract
   * @param _jAaveAddress Address of the JAvve contract
   **/
  constructor(address _weth, address _jAaveAddress) {
    jAaveAddress = _jAaveAddress;
    WETH = IWETH(_weth);
    IWETH(_weth).approve(_jAaveAddress, type(uint256).max);
  }

  /**
   * @dev set JAave contract address 
   **/
  function setJAaveAddress(address _jAaveAddress) external onlyOwner {
    require(_jAaveAddress != address(0), "WETHGateway: address not allowed");
    jAaveAddress = _jAaveAddress;
  }

  /**
   * @dev deposits WETH, using native ETH. 
   **/
  function depositETH() external payable override {
    WETH.deposit{value: msg.value}();
    uint256 wethBalance = IERC20(address(WETH)).balanceOf(address(this));
    IERC20(address(WETH)).transfer(jAaveAddress, wethBalance);
  }

  /**
   * @dev withdraws WETH amount and reverts it in ETH, sending them to an address.
   * @param _amount amount of WETH to withdraw and receive native ETH
   */
  function withdrawETH(uint256 _amount) external override {
    WETH.withdraw(_amount);
    TransferETHHelper.safeTransferETH(jAaveAddress, _amount);
  }

  /**
   * @dev transfer ERC20 from the utility contract, for ERC20 recovery in case of stuck tokens due
   * direct transfers to the contract address.
   * @param _token token to transfer
   * @param _to recipient of the transfer
   * @param _amount amount to send
   */
  function emergencyTokenTransfer(address _token, address _to, uint256 _amount) external onlyOwner {
    IERC20(_token).transfer(_to, _amount);
  }

  /**
   * @dev transfer native Ether from the utility contract, for native Ether recovery in case of stuck Ether
   * due selfdestructs or transfer ether to pre-computated contract address before deployment.
   * @param _to recipient of the transfer
   * @param _amount amount to send
   */
  function emergencyEtherTransfer(address _to, uint256 _amount) external onlyOwner {
    TransferETHHelper.safeTransferETH(_to, _amount);
  }

  /**
   * @dev Get WETH address used by WETHGateway
   */
  function getWETHAddress() external view returns (address) {
    return address(WETH);
  }

  /**
   * @dev Only WETH contract is allowed to transfer ETH here. Prevent other addresses to send Ether to this contract.
   */
  receive() external payable {
    require(msg.sender == address(WETH), 'Receive not allowed');
  }

  /**
   * @dev Revert fallback calls
   */
  fallback() external payable {
    revert('Fallback not allowed');
  }
}
