// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStrategy} from "./IStrategy.sol";

contract DefaiVault is Ownable {
    IERC20 public immutable asset;
    IStrategy public strategy;

    mapping(address => uint256) public shares;
    uint256 public totalShares;

    uint16 public feeBps;
    address public feeRecipient;

    event Deposit(address indexed user, uint256 assets, uint256 sharesMinted);
    event Withdraw(address indexed user, uint256 assets, uint256 sharesBurned);
    event StrategyUpdated(address indexed newStrategy);

    constructor(address _asset, address _feeRecipient) Ownable(msg.sender) {
        require(_asset != address(0) && _feeRecipient != address(0), "zero");
        asset = IERC20(_asset);
        feeRecipient = _feeRecipient;
        feeBps = 50; // 0.5%
    }

    function setStrategy(address _strategy) external onlyOwner {
        require(_strategy != address(0), "zero");
        strategy = IStrategy(_strategy);
        asset.approve(_strategy, type(uint256).max);
        emit StrategyUpdated(_strategy);
    }

    function setFee(uint16 _bps) external onlyOwner { require(_bps <= 500, "max 5%"); feeBps = _bps; }
    function setFeeRecipient(address to) external onlyOwner { feeRecipient = to; }

    function totalAssets() public view returns (uint256) {
        uint256 a = asset.balanceOf(address(this));
        if (address(strategy) != address(0)) a += strategy.totalAssets();
        return a;
    }

    function previewDeposit(uint256 assets) public view returns (uint256) {
        uint256 supply = totalShares;
        uint256 tot = totalAssets();
        return (supply == 0 || tot == 0) ? assets : (assets * supply) / tot;
    }

    function deposit(uint256 assets) external returns (uint256 minted) {
        require(assets > 0, "zero");
        require(asset.transferFrom(msg.sender, address(this), assets), "pull failed");
        if (address(strategy) != address(0)) { strategy.deposit(assets); }
        minted = previewDeposit(assets);
        shares[msg.sender] += minted;
        totalShares += minted;
        emit Deposit(msg.sender, assets, minted);
    }

    function previewWithdraw(uint256 shares_) public view returns (uint256) {
        uint256 supply = totalShares;
        uint256 tot = totalAssets();
        require(supply > 0 && shares_ <= supply, "bad shares");
        return (shares_ * tot) / supply;
    }

    function withdraw(uint256 shares_) external returns (uint256 assetsOut) {
        require(shares_ > 0 && shares[msg.sender] >= shares_, "insufficient");
        assetsOut = previewWithdraw(shares_);
        shares[msg.sender] -= shares_;
        totalShares -= shares_;

        uint256 bal = asset.balanceOf(address(this));
        if (bal < assetsOut && address(strategy) != address(0)) {
            strategy.withdraw(assetsOut - bal, address(this));
        }

        uint256 fee = (assetsOut * feeBps) / 10_000;
        if (fee > 0) { require(asset.transfer(feeRecipient, fee)); assetsOut -= fee; }
        require(asset.transfer(msg.sender, assetsOut));
        emit Withdraw(msg.sender, assetsOut, shares_);
    }
}
