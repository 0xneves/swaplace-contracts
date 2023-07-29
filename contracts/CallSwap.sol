// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IDataPalace} from "./interfaces/IDataPalace.sol";
import {ICallSwap} from "./interfaces/swaps/ICallSwap.sol";
import {ITransfer} from "./interfaces/utils/ITransfer.sol";
import {ISwap} from "./interfaces/swaps/ISwap.sol";

error InvalidAddress(address caller);
error InvalidSwap(uint256 id);

contract CallSwap is ICallSwap, ISwap {
    address immutable DATAPALACE;

    constructor(address _dataPalace) {
        DATAPALACE = _dataPalace;
    }

    uint256 public swapId;

    mapping(uint256 => mapping(address => CallSwap)) private _callSwaps;

    mapping(uint256 => bool) public _finalized;

    function create(CallSwap calldata swap) external returns (uint256) {
        if (msg.sender == address(0)) {
            revert InvalidAddress(msg.sender);
        }

        unchecked {
            swapId++;
        }

        _callSwaps[swapId][msg.sender] = swap;

        return swapId;
    }

    function accept(uint256 id, address creator) external {
        if (_finalized[id]) {
            revert InvalidSwap(id);
        }
        _finalized[id] = true;

        CallSwap memory swap = _callSwaps[id][creator];

        Asset[] memory assets = swap.asking;

        for (uint256 i = 0; i < assets.length; ) {
            bytes memory data = abi.encodeWithSignature(
                "executeCall(address,uint256)",
                assets[i].addr,
                assets[i].amountOrCallOrId
            );

            DATAPALACE.delegatecall(data);

            unchecked {
                i++;
            }
        }

        assets = swap.biding;

        for (uint256 i = 0; i < assets.length; ) {
            ITransfer(assets[i].addr).transferFrom(
                creator,
                msg.sender,
                assets[i].amountOrCallOrId
            );
            unchecked {
                i++;
            }
        }
    }

    function cancel(uint256 id) external {
        CallSwap memory swap = _callSwaps[id][msg.sender];

        if (
            swap.biding.length == 0 || swap.asking.length == 0 || _finalized[id]
        ) {
            revert InvalidSwap(id);
        }

        _finalized[id] = true;
    }

    function getSwap(
        uint256 id,
        address creator
    ) external view returns (CallSwap memory) {
        return _callSwaps[id][creator];
    }
}
