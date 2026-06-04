// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TrancheManager {
    struct Vault {
        uint256 seniorLiquidity;
        uint256 juniorLiquidity;
        uint256 totalLiquidity;
        uint256 seniorValue;
        uint256 juniorValue;
    }

    uint256 public constant SENIOR_PERCENT = 70;
    uint256 public constant JUNIOR_PERCENT = 30;
    uint256 public constant SENIOR_YIELD_BOOST = 110;
    uint256 public constant JUNIOR_YIELD_BOOST = 90;

    mapping(address => mapping(address => Vault)) internal vaults;

    event Deposited(address indexed user, address indexed token, uint256 amount, uint256 senior, uint256 junior);
    event Withdrawn(address indexed user, address indexed token, uint256 amount, uint256 senior, uint256 junior);
    event PnLDistributed(address indexed user, address indexed token, int256 pnl, uint256 seniorImpact, uint256 juniorImpact);

    function _deposit(address user, address token, uint256 amount) internal {
        require(amount > 0, "amount zero");

        Vault storage v = vaults[user][token];

        uint256 senior = (amount * SENIOR_PERCENT) / 100;
        uint256 junior = (amount * JUNIOR_PERCENT) / 100;

        v.seniorLiquidity += senior;
        v.juniorLiquidity += junior;
        v.totalLiquidity += amount;
        v.seniorValue += senior;
        v.juniorValue += junior;

        emit Deposited(user, token, amount, senior, junior);
    }

    function _withdraw(address user, address token, uint256 amount) internal {
        Vault storage v = vaults[user][token];
        require(v.totalLiquidity >= amount, "insufficient balance");

        uint256 seniorShare = (amount * v.seniorLiquidity) / v.totalLiquidity;
        uint256 juniorShare = (amount * v.juniorLiquidity) / v.totalLiquidity;

        v.seniorLiquidity -= seniorShare;
        v.juniorLiquidity -= juniorShare;
        v.totalLiquidity -= amount;

        uint256 combinedValue = v.seniorValue + v.juniorValue;
        uint256 seniorValShare = (amount * v.seniorValue) / combinedValue;
        uint256 juniorValShare = amount - seniorValShare;

        v.seniorValue -= seniorValShare;
        v.juniorValue -= juniorValShare;

        emit Withdrawn(user, token, amount, seniorShare, juniorShare);
    }

    function _distributePnL(address user, address token, int256 pnl) internal {
        Vault storage v = vaults[user][token];
        if (pnl == 0) return;

        uint256 seniorImpact;
        uint256 juniorImpact;

        if (pnl > 0) {
            uint256 profit = uint256(pnl);
            seniorImpact = (profit * SENIOR_YIELD_BOOST) / 200;
            juniorImpact = profit - seniorImpact;
            v.seniorValue += seniorImpact;
            v.juniorValue += juniorImpact;
        } else {
            uint256 loss = uint256(-pnl);
            uint256 juniorCapacity = v.juniorValue;

            if (loss <= juniorCapacity) {
                juniorImpact = loss;
                v.juniorValue -= juniorImpact;
            } else {
                juniorImpact = juniorCapacity;
                seniorImpact = loss - juniorCapacity;
                v.juniorValue = 0;
                v.seniorValue -= seniorImpact;
            }
        }

        emit PnLDistributed(user, token, pnl, seniorImpact, juniorImpact);
    }

    function getVault(address user, address token) public view returns (Vault memory) {
        return vaults[user][token];
    }
}
