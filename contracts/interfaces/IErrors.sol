// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @dev Errors only interface for the {Swaplace} implementations.
 */
interface IErrors {
  /**
   * @dev Displayed when the caller is not the owner of the swap.
   */
  error InvalidAddress(address caller);

  /**
   * @dev Displayed when the `expiry` date is in the past.
   */
  error InvalidExpiry(uint256 timestamp);

  /**
   * @dev Displayed when the `msg.value` doesn't match the swap request.
   */
  error InvalidValue(uint256 msgValue, uint256 valueToReceive);
}
