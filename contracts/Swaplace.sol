// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IERC165} from "./interfaces/IERC165.sol";
import {IErrors} from "./interfaces/IErrors.sol";
import {ISwap} from "./interfaces/ISwap.sol";
import {ISwaplace} from "./interfaces/ISwaplace.sol";
import {ITransfer} from "./interfaces/ITransfer.sol";

/**
 * @author @0xneves | @blockful_io
 * @dev Swaplace is a Decentralized Feeless DEX. It has no owners, it cannot be stopped.
 * Its cern is to facilitate swaps between virtual assets following the ERC standard.
 * Users can propose or accept swaps by allowing Swaplace to move their assets using the
 * `approve` or `permit` function.
 */
contract Swaplace is ISwaplace, ISwap, IErrors, IERC165 {
  /// @dev Swap Identifier counter.
  uint256 private _totalSwaps;

  /// @dev Mapping of Swap ID to Swap structs. See {ISwap-Swap/LightSwap}.
  mapping(uint256 => Swap) private _swaps;
  mapping(uint256 => LightSwap) private _lightswaps;

  /**
   * @dev Getter function for _totalSwaps.
   */
  function totalSwaps() public view returns (uint256) {
    return _totalSwaps;
  }

  /**
   * @dev See {ISwaplace-getSwap}.
   */
  function getSwap(uint256 swapId) public view returns (Swap memory) {
    return _swaps[swapId];
  }

  /**
   * @dev See {ISwaplace-getSwap}.
   */
  function getLightSwap(uint256 swapId) public view returns (LightSwap memory) {
    return _lightswaps[swapId];
  }

  /**
   * @dev See {ISwaplace-createSwap}.
   */
  function createSwap(Swap calldata swap) public returns (uint256) {
    assembly {
      sstore(_totalSwaps.slot, add(sload(_totalSwaps.slot), 1))
    }

    uint256 swapId = packData(msg.sender, _totalSwaps);
    _swaps[swapId] = swap;

    (
      address allowed,
      ,
      uint8 valueReceiver,
      uint56 valueToReceive
    ) = parseFullData(swap.config);

    if (valueToReceive > 0 && valueReceiver == uint(ValueReceiver.ACCEPTEE)) {
      if (msg.value != valueToReceive)
        revert InvalidValue(msg.value, valueToReceive);
    }

    emit SwapCreated(swapId, msg.sender, allowed);

    return swapId;
  }

  /**
   * @dev See {ISwaplace-createLightSwap}.
   */
  function createLightSwap(LightSwap calldata swap) public returns (uint256) {
    assembly {
      sstore(_totalSwaps.slot, add(sload(_totalSwaps.slot), 1))
    }

    uint256 swapId = packData(msg.sender, _totalSwaps);
    _lightswaps[swapId] = swap;

    (
      address allowed,
      ,
      uint8 valueReceiver,
      uint56 valueToReceive
    ) = parseFullData(swap.config);

    if (valueToReceive > 0 && valueReceiver == uint(ValueReceiver.ACCEPTEE)) {
      if (msg.value != valueToReceive)
        revert InvalidValue(msg.value, valueToReceive);
    }

    emit SwapCreated(swapId, msg.sender, allowed);

    return swapId;
  }

  /**
   * @dev See {ISwaplace-acceptSwap}.
   */
  function acceptSwap(uint256 swapId, address receiver) public returns (bool) {
    (address owner, ) = parseData(swapId);
    Swap memory swap = _swaps[swapId];

    (
      address allowed,
      uint32 expiry,
      uint8 valueReceiver,
      uint56 valueToReceive
    ) = parseFullData(swap.config);

    if (allowed != address(0) && allowed != msg.sender)
      revert InvalidAddress(msg.sender);

    if (expiry < block.timestamp) revert InvalidExpiry(expiry);
    _swaps[swapId].config = 0;

    if (valueToReceive > 0) {
      if (valueReceiver == uint(ValueReceiver.ACCEPTEE)) {
        _payNativeEth(receiver, valueToReceive);
      } else {
        if (msg.value != valueToReceive)
          revert InvalidValue(msg.value, valueToReceive);
        _payNativeEth(owner, valueToReceive);
      }
    }

    Asset[] memory assets = swap.asking;

    for (uint256 i = 0; i < assets.length; ) {
      ITransfer(assets[i].addr).transferFrom(
        msg.sender,
        owner,
        assets[i].amountOrId
      );
      assembly {
        i := add(i, 1)
      }
    }

    assets = swap.biding;

    for (uint256 i = 0; i < assets.length; ) {
      ITransfer(assets[i].addr).transferFrom(
        owner,
        receiver,
        assets[i].amountOrId
      );
      assembly {
        i := add(i, 1)
      }
    }

    emit SwapAccepted(swapId, owner, msg.sender);

    return true;
  }

  /**
   * @dev See {ISwaplace-cancelSwap}.
   */
  function cancelSwap(uint256 swapId) public {
    if (_swaps[swapId].owner != msg.sender) revert InvalidAddress(msg.sender);

    (, uint256 expiry) = parseData(_swaps[swapId].config);

    if (expiry < block.timestamp) revert InvalidExpiry(expiry);

    _swaps[swapId].config = 0;

    emit SwapCanceled(swapId, msg.sender);
  }

  /**
   * @dev Pay native Ether to the receiver.
   */
  function _payNativeEth(address receiver, uint256 value) internal {
    (bool success, ) = receiver.call{value: value}("");
    if (!success) revert InvalidValue(msg.value, value);
  }

  /**
   * @dev See {ISwapFactory-packData}.
   */
  function packData(address addr, uint256 value) public pure returns (uint256) {
    return (uint256(uint160(addr)) << 96) | uint256(value);
  }

  /**
   * @dev See {ISwapFactory-parseData}.
   */
  function parseData(uint256 config) public pure returns (address, uint256) {
    return (address(uint160(config >> 96)), uint256(config & ((1 << 96) - 1)));
  }

  /**
   * @dev See {ISwapFactory-packFullData}.
   */
  function packFullData(
    address allowed,
    uint256 expiry,
    uint8 valueReceiver,
    uint56 valueToReceive
  ) public pure returns (uint256) {
    return
      (uint256(uint160(allowed)) << 96) |
      (uint256(expiry) << 64) |
      (uint256(valueReceiver) << 56) |
      uint256(valueToReceive);
  }

  /**
   * @dev See {ISwapFactory-parseFullData}.
   */
  function parseFullData(
    uint256 config
  ) public pure returns (address, uint32, uint8, uint56) {
    return (
      address(uint160(config >> 96)),
      uint32(config >> 64),
      uint8(config >> 56),
      uint56(config)
    );
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceID
  ) external pure override(IERC165) returns (bool) {
    return
      interfaceID == type(IERC165).interfaceId ||
      interfaceID == type(ISwaplace).interfaceId;
  }
}
