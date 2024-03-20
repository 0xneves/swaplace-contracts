// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @dev Interface for the Swap Struct, used in the {Swaplace} implementation.
 */
interface ISwap {
  /**
   * @dev Enum for the `valueReceiver` to determine whom will receive native Ether.
   */
  enum ValueReceiver {
    OWNER,
    ACCEPTEE
  }

  /**
   * @dev Assets can be ERC20 or ERC721.
   *
   * It is composed of:
   * - `addr` of the asset.
   * - `amountOrId` of the asset based on the standard.
   *
   * NOTE: `amountOrId` is the `amount` of ERC20 or the `tokenId` of ERC721.
   */
  struct Asset {
    address addr;
    uint256 amountOrId;
  }

  /**
   * @dev The Swap struct is the heart of Swaplace.
   *
   * It is composed of:
   * - `config` represents two packed values: 'allowed' for the allowed address
   * to accept the swap and 'expiry' for the expiration date of the swap.
   * - `biding` assets that are being bided by the owner.
   * - `asking` assets that are being asked by the owner.
   *
   * NOTE: When `allowed` address is the zero address, anyone can accept the Swap.
   */
  struct Swap {
    uint256 config;
    Asset[] biding;
    Asset[] asking;
  }

  /**
   * @dev This struct purpose is to use less gas when working with swaps.
   * The cons is that not all tokens might support such method because their
   * totalSupply might be greater than uint96.
   *
   * Some NFT standards might as well be compatible. NFTs like ENS, for example,
   * will use a bytes32 turned into uint256 which will be greater than uint96.
   *
   * IMPORTANT: Not all token are subjected to accepting this standard.
   * Maximum size accepted is uint96, which is represented by 79_228_162_514e18.
   *
   * It is composed of a packed value of:
   * - `addr` of the asset.
   * - `amountOrId` of the asset based on the standard.
   *
   * NOTE: `amountOrId` is the `amount` of ERC20 or the `tokenId` of ERC721.
   */
  struct LightAsset {
    uint256 addrAmountOrId;
  }

  /**
   * @dev The Swap struct for the light weight version.
   *
   * It is composed of:
   * - `config` represents two packed values:
   * 'allowed' for the allowed address to accept the swap;
   * 'expiry' for the expiration date of the swap;
   * 'valueReceiver' as the uint8 defining which side receives native ETH;
   * `valueToReceive` as the amount of native ETH to receive.
   * - `biding` assets that are being bided by the owner.
   * - `asking` assets that are being asked by the owner.
   *
   * NOTE: When `allowed` address is the zero address, anyone can accept the Swap.
   */
  struct LightSwap {
    uint256 config;
    Asset[] biding;
    Asset[] asking;
  }
}
