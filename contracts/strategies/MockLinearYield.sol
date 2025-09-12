// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IStrategy} from "../IStrategy.sol";

contract MockLinearYield is IStrategy {
    IERC20 public immutable asset;
    uint256 public _totalAssets;
    uint256 public last;
    uint256 public ratePerSecond;

    constructor(address _asset, uint256 _ratePerSecond) {
        asset = IERC20(_asset);
        last = block.timestamp;
        ratePerSecond = _ratePerSecond;
    }

    function _accrue() internal {
        uint256 dt = block.timestamp - last;
        if (dt > 0) { _totalAssets += dt * ratePerSecond; last = block.timestamp; }
    }

    function deposit(uint256 amount) external {
        _accrue();
        require(asset.transferFrom(msg.sender, address(this), amount), "xferFrom");
        _totalAssets += amount;
    }

    function withdraw(uint256 amount, address to) external {
        _accrue();
        require(amount <= _totalAssets, "insufficient");
        _totalAssets -= amount;
        require(asset.transfer(to, amount), "xfer");
    }

    function totalAssets() external view returns (uint256) {
        uint256 dt = block.timestamp - last;
        return _totalAssets + (dt * ratePerSecond);
    }
}
