// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DefaiVault is Ownable, Pausable {
    IERC20 public immutable asset;          // USDT (6 decimals)
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    uint256 public feeBps;                  // demo: 0
    uint256 public depositCap;              // optional

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);
    event MissionCompleted(address indexed user, string missionId);
    event Referred(address indexed referrer, address indexed user, uint256 amount);

    // ✅ pass initial owner to OZ v5 Ownable
    constructor(IERC20 _asset) Ownable(msg.sender) {
        asset = _asset;
        feeBps = 0;
    }

    // --- admin ---
    function setDepositCap(uint256 cap) external onlyOwner { depositCap = cap; }
    function setFee(uint256 _bps) external onlyOwner { require(_bps <= 1000, "max 10%"); feeBps = _bps; }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // --- views ---
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    // --- core ---
    function deposit(uint256 assets) external whenNotPaused returns (uint256 mintShares) {
        require(assets > 0, "zero");
        if (depositCap > 0) require(totalAssets() + assets <= depositCap, "cap");

        uint256 _totalAssets = totalAssets();
        if (totalShares == 0) {
            // contoh rasio shares (1e6 = 6 desimal agar sejalan dengan USDT)
            mintShares = assets * 1e6;
        } else {
            mintShares = (assets * totalShares) / _totalAssets;
        }

        shares[msg.sender] += mintShares;
        totalShares += mintShares;

        require(asset.transferFrom(msg.sender, address(this), assets), "transferFrom");
        emit Deposit(msg.sender, assets, mintShares);

        // Mission: first deposit >= 100 USDT
        if (assets >= 100 * 1e6) {
            emit MissionCompleted(msg.sender, "DEPOSIT_100");
        }
        return mintShares;
    }

    function withdraw(uint256 burnShares) external whenNotPaused returns (uint256 assetsOut) {
        require(burnShares > 0, "zero");
        require(shares[msg.sender] >= burnShares, "insufficient");

        uint256 _totalAssets = totalAssets();
        assetsOut = (burnShares * _totalAssets) / totalShares;

        shares[msg.sender] -= burnShares;
        totalShares -= burnShares;

        require(asset.transfer(msg.sender, assetsOut), "transfer");
        emit Withdraw(msg.sender, assetsOut, burnShares);
        return assetsOut;
    }

    // --- referral (dipanggil UI setelah deposit pertama) ---
    function recordReferral(address referrer, uint256 amount) external whenNotPaused {
        require(referrer != address(0) && referrer != msg.sender, "bad ref");
        emit Referred(referrer, msg.sender, amount);
    }
}
