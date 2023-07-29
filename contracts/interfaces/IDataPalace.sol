// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IDataPalace} from "./IDataPalace.sol";

interface IDataPalace {
    function save(bytes calldata data) external returns (uint256);

    function data(uint256 id) external view returns (bytes memory);

    function delegate(
        address _to,
        bytes calldata _callData
    ) external returns (bytes memory);

    function delegateMulticall(
        address[] calldata _to,
        bytes[] calldata _callData
    ) external returns (bytes[] memory results);
}
