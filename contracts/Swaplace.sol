// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISwaplace} from "./interfaces/ISwaplace.sol";
import {ISwap} from "./interfaces/swaps/ISwap.sol";

contract Swaplace is ISwaplace, IERC165, Ownable {
    uint256 ids;

    mapping(uint256 => address) public swaplacedApps;
    mapping(uint256 => string) public dAppsInterfaces;

    function addApp(address _protocol) public onlyOwner {
        unchecked {
            ids++;
        }
        swaplacedApps[ids] = _protocol;
    }

    function accept(
        uint256 _swapId,
        address _creator,
        uint256 _dAppId
    ) external {
        bytes memory data = abi.encodeWithSignature(
            "accept(uint256, address)",
            _swapId,
            _creator
        );

        (bool success, ) = swaplacedApps[_dAppId].delegatecall(data);
        require(success);
    }

    function cancel(uint256 _swapId, uint256 _dAppId) external {
        bytes memory data = abi.encodeWithSignature("cancel(uint256)", _swapId);

        (bool success, ) = swaplacedApps[_dAppId].delegatecall(data);
        require(success);
    }

    function supportsInterface(
        bytes4 interfaceID
    ) external pure override(IERC165, ISwaplace) returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(ISwaplace).interfaceId;
    }
}
