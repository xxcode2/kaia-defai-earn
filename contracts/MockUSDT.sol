// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;
    constructor(address _owner) ERC20("Mock Tether USD", "USDT") Ownable(_owner) {}
    function decimals() public pure override returns (uint8) { return DECIMALS; }
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
}
