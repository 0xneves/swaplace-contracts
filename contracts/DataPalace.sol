// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IDataPalace} from "./interfaces/IDataPalace.sol";

/** vOne&only
 *  ________   ___        ________   ________   ___  __     ________  ___  ___   ___
 * |\   __  \ |\  \      |\   __  \ |\   ____\ |\  \|\  \  |\  _____\|\  \|\  \ |\  \
 * \ \  \|\ /_\ \  \     \ \  \|\  \\ \  \___| \ \  \/  /|_\ \  \__/ \ \  \\\  \\ \  \
 *  \ \   __  \\ \  \     \ \  \\\  \\ \  \     \ \   ___  \\ \   __\ \ \  \\\  \\ \  \
 *   \ \  \|\  \\ \  \____ \ \  \\\  \\ \  \____ \ \  \\ \  \\ \  \_|  \ \  \\\  \\ \  \____
 *    \ \_______\\ \_______\\ \_______\\ \_______\\ \__\\ \__\\ \__\    \ \_______\\ \_______\
 *     \|_______| \|_______| \|_______| \|_______| \|__| \|__| \|__|     \|_______| \|_______|
 *
 * @title Data Palace
 * @author @0xneves | @blockful_io
 * @dev - This contract is a little bit odd. It's a contract that calls itself to execute anything
 * for anyones that codes for it. Its an shared/personal public allowance place for function calls.
 *
 * This is an application that can extends Swaplace into infinite possibilities. It works like a
 * looped multicall. Transactions can be chainned for executions to allow a trade to conclude on
 * Swaplace.
 *
 * In theory you can trade anything when you accept a trade in your behalf.
 * It stores and executes allowed function calls.
 *
 * This also abstract {Multicall} from OpenZeppelin to allow for a more flexible use for devs.
 * This contract has no owner and cannot be upgraded or altered in any way.
 */

contract DataPalace is IDataPalace {
    /// The id of the call. It will be incremented on every new call.
    uint256 public callId;

    /// The mapping holding all possible calldata combinations.
    mapping(uint256 => bytes) private datas;

    /**
     * @dev - Emitted when a call is executed.
     * @param id The id of the saved calldata.
     * @param creator The address of the creator of the saved calldata.
     */
    event Saved(
        uint256 indexed id,
        bytes32 indexed hash,
        address indexed creator
    );

    /**
     * @dev - Saves the calldata for a specific call.
     * @param _data - The calldata to be saved.
     * @return - The id of the saved calldata.
     */
    function save(bytes calldata _data) external returns (uint256) {
        unchecked {
            callId++;
        }

        datas[callId] = _data;
        emit Saved(callId, keccak256(_data), msg.sender);

        return callId;
    }

    /**
     * @dev - Returns the bytes memory for a specific call.
     * @param _callId - The id of the saved calldata.
     * @return - The calldata for the specific call.
     */
    function data(uint256 _callId) external view returns (bytes memory) {
        return datas[_callId];
    }

    /**
     * @dev - Will execute a `delegatecall` based on a `save` pointer.
     * @param _to - The address to call the data on.
     * @param _callId - The id of the saved calldata.
     * @return result - The result of the execution.
     */
    function executeCall(
        address _to,
        uint256 _callId
    ) external returns (bytes memory) {
        (bool success, bytes memory result) = _to.delegatecall(datas[_callId]);
        require(success);
        return result;
    }

    /**
     * @dev - Will delegate `msg.sender` to execute a function.
     * This function preserves the `msg.sender` and `msg.value` of the caller.
     * @param _to - The address to call the data on.
     * @param _data - The data to be executed.
     * @return result - The result of the execution.
     */
    function delegate(
        address _to,
        bytes calldata _data
    ) external returns (bytes memory) {
        (bool success, bytes memory result) = _to.delegatecall(_data);
        require(success);
        return result;
    }

    /**
     * @dev - Will execute multiple function calls.
     * @param _to - The addresses to call the data on.
     * @param _data - The array of datas to be executed.
     * @return results - The array of results of the executions.
     */
    function delegateMulticall(
        address[] calldata _to,
        bytes[] calldata _data
    ) external returns (bytes[] memory results) {
        results = new bytes[](_data.length);
        for (uint256 i = 0; i < _to.length; i++) {
            (bool success, bytes memory result) = _to[i].delegatecall(_data[i]);
            require(success);
            results[i] = result;
        }
        return results;
    }
}
