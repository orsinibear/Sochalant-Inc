// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BaseHook} from "v4-hooks-public/src/base/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {RiskEngine} from "./RiskEngine.sol";
import {TrancheManager} from "./TrancheManager.sol";

contract SochalantHook is BaseHook, TrancheManager {
    using SafeERC20 for IERC20;
    using RiskEngine for uint256;

    struct PoolState {
        uint256 lastPrice;
        uint256 volatility;
        uint256 buyVolume;
        uint256 sellVolume;
        uint256 riskScore;
        RiskEngine.RiskLevel riskLevel;
        bool hedgeActive;
        uint256 hedgeIntensity;
    }

    mapping(PoolId => PoolState) public poolStates;
    mapping(address => bool) public supportedTokens;

    event PoolStateUpdated(PoolId indexed poolId, uint256 riskScore, RiskEngine.RiskLevel riskLevel);
    event HedgeUpdated(PoolId indexed poolId, bool active, uint256 intensity);
    event TokenSupported(address indexed token, bool supported);

    event ReactiveRiskUpdate(bytes32 indexed poolId, uint256 riskScore, uint256 volatility);
    event ReactiveHedgeAction(bytes32 indexed poolId, bool active, uint256 intensity);

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory permissions)
    {
        permissions.beforeSwap = true;
        permissions.afterSwap = true;
    }

    function addSupportedToken(address token) external {
        supportedTokens[token] = true;
        emit TokenSupported(token, true);
    }

    function removeSupportedToken(address token) external {
        supportedTokens[token] = false;
        emit TokenSupported(token, false);
    }

    function deposit(IERC20 token, uint256 amount) external {
        require(supportedTokens[address(token)], "token not supported");
        token.safeTransferFrom(msg.sender, address(this), amount);
        _deposit(msg.sender, address(token), amount);
    }

    function withdraw(IERC20 token, uint256 amount) external {
        Vault memory v = getVault(msg.sender, address(token));
        require(v.totalLiquidity >= amount, "insufficient balance");

        uint256 combinedValue = v.seniorValue + v.juniorValue;
        uint256 withdrawRatio = (amount * 1e18) / combinedValue;
        uint256 actualWithdraw = (v.totalLiquidity * withdrawRatio) / 1e18;

        _withdraw(msg.sender, address(token), actualWithdraw);
        token.safeTransfer(msg.sender, actualWithdraw);
    }

    function simulateSwap(
        PoolKey calldata key,
        uint256 priceChange,
        uint256 swapVolume,
        bool isBuy
    ) external {
        PoolId poolId = PoolIdLibrary.toId(key);
        PoolState storage state = poolStates[poolId];

        state.lastPrice = state.lastPrice == 0 ? 1e18 : state.lastPrice;
        uint256 newPrice = isBuy
            ? state.lastPrice + priceChange
            : state.lastPrice - (priceChange > state.lastPrice ? state.lastPrice : priceChange);

        uint256 priceDelta = newPrice > state.lastPrice
            ? newPrice - state.lastPrice
            : state.lastPrice - newPrice;

        state.lastPrice = newPrice;
        state.volatility += priceDelta / 1e12;

        if (isBuy) {
            state.buyVolume += swapVolume;
        } else {
            state.sellVolume += swapVolume;
        }

        _updateRiskAndHedge(poolId, priceDelta, swapVolume);
    }

    function _beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        bytes calldata
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = PoolIdLibrary.toId(key);
        PoolState storage state = poolStates[poolId];

        if (state.lastPrice == 0) {
            state.lastPrice = 1e18;
        }

        return (BaseHook.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = PoolIdLibrary.toId(key);
        PoolState storage state = poolStates[poolId];

        if (state.lastPrice == 0) {
            state.lastPrice = 1e18;
        }

        uint256 currentPrice = uint256(PoolId.unwrap(poolId));
        uint256 priceDelta = currentPrice > state.lastPrice
            ? currentPrice - state.lastPrice
            : state.lastPrice - currentPrice;

        state.lastPrice = currentPrice;

        uint256 swapSize = uint256(
            uint128(uint256(int256(delta.amount0() + delta.amount1())))
        );

        state.volatility += priceDelta / 1e12;

        bool isBuy = int256(delta.amount0()) > 0;
        if (isBuy) {
            state.buyVolume += swapSize;
        } else {
            state.sellVolume += swapSize;
        }

        _updateRiskAndHedge(poolId, priceDelta, swapSize);

        return (BaseHook.afterSwap.selector, 0);
    }

    function _updateRiskAndHedge(PoolId poolId, uint256 priceDelta, uint256 swapSize) internal {
        PoolState storage state = poolStates[poolId];

        (uint256 riskScore, RiskEngine.RiskLevel riskLevel) = RiskEngine.calculateRiskScore(
            priceDelta,
            swapSize,
            1e18,
            state.volatility,
            state.buyVolume,
            state.sellVolume
        );

        state.riskScore = riskScore;
        state.riskLevel = riskLevel;

        emit PoolStateUpdated(poolId, riskScore, riskLevel);
        emit ReactiveRiskUpdate(PoolId.unwrap(poolId), riskScore, state.volatility);

        _evaluateHedge(poolId);
    }

    function _evaluateHedge(PoolId poolId) internal {
        PoolState storage state = poolStates[poolId];

        if (state.riskScore > 70) {
            state.hedgeActive = true;
            state.hedgeIntensity = 100;
        } else if (state.riskScore > 40 && state.riskScore <= 70) {
            state.hedgeActive = true;
            state.hedgeIntensity = 50;
        } else if (state.riskScore < 30) {
            if (state.hedgeIntensity > 10) {
                state.hedgeIntensity -= 10;
            } else {
                state.hedgeIntensity = 0;
                state.hedgeActive = false;
            }
        }

        emit HedgeUpdated(poolId, state.hedgeActive, state.hedgeIntensity);
        emit ReactiveHedgeAction(PoolId.unwrap(poolId), state.hedgeActive, state.hedgeIntensity);
    }

    function getPoolState(PoolKey calldata key) external view returns (PoolState memory) {
        return poolStates[PoolIdLibrary.toId(key)];
    }
}
