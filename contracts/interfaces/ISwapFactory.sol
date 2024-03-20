// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ISwap} from "./ISwap.sol";

/**
 * @dev Interface of the {SwapFactory} implementation.
 */
interface ISwapFactory {
  /**
   * @dev Constructs an asset struct that works for ERC20 or ERC721.
   * This function is a utility to easily create an `Asset` struct on-chain or off-chain.
   */
  function makeAsset(
    address addr,
    uint256 amountOrId
  ) external pure returns (ISwap.Asset memory);

  /**
   * @dev Build a swap struct to use in the {Swaplace-createSwap} function.
   *
   * Requirements:
   *
   * - `expiry` cannot be in the past timestamp.
   * - `biding` and `asking` cannot be empty.
   */
  function makeSwap(
    address owner,
    address allowed,
    uint256 expiry,
    ISwap.Asset[] memory assets,
    ISwap.Asset[] memory asking
  ) external view returns (ISwap.Swap memory);

  /**
   * @dev Packs `addr` and `value`.
   * This function returns the bitwise packing of `addr` and `value` as a uint256.
   */
  function packData(
    address addr,
    uint256 value
  ) external pure returns (uint256);

  /**
   * @dev Parsing the `config`.
   * This function returns the extracted values for an  address and a uint96 value.
   */
  function parseData(uint256 config) external pure returns (address, uint256);
}
