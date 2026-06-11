// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Constants} from "@uniswap/v4-core/test/utils/Constants.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

import {SochalantHook} from "../src/SochalantHook.sol";
import {TrancheManager} from "../src/TrancheManager.sol";
import {RiskEngine} from "../src/RiskEngine.sol";

contract SochalantHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;

    SochalantHook public hook;
    PoolKey public poolKey;
    bytes32 public poolId;

    uint256 internal constant LIQ_AMOUNT = 100_000 * 1e18;

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        address hookAddress = address(
            uint160(type(uint160).max & clearAllHookPermissionsMask | flags)
        );
        deployCodeTo("SochalantHook", abi.encode(manager), hookAddress);
        hook = SochalantHook(hookAddress);

        poolKey = PoolKey(currency0, currency1, 3000, 60, IHooks(address(hook)));
        poolId = PoolId.unwrap(poolKey.toId());

        manager.initialize(poolKey, SQRT_PRICE_1_1);
    }

    function _addLiquidity() internal {
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams(-120, 120, int256(LIQ_AMOUNT), 0),
            Constants.ZERO_BYTES
        );
    }

    function _swap(bool zeroForOne, int256 amount) internal returns (BalanceDelta) {
        return swapRouter.swap(
            poolKey,
            SwapParams(zeroForOne, amount, zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT),
            PoolSwapTest.TestSettings(false, false),
            Constants.ZERO_BYTES
        );
    }

    // ───────────────────────────────────────────────
    // HOOK PERMISSIONS
    // ───────────────────────────────────────────────

    function test_getHookPermissions() public view {
        Hooks.Permissions memory permissions = hook.getHookPermissions();
        assertTrue(permissions.beforeSwap);
        assertTrue(permissions.afterSwap);
        assertTrue(permissions.beforeAddLiquidity);
        assertFalse(permissions.afterAddLiquidity);
        assertFalse(permissions.beforeRemoveLiquidity);
        assertFalse(permissions.afterRemoveLiquidity);
        assertFalse(permissions.beforeDonate);
        assertFalse(permissions.afterDonate);
        assertFalse(permissions.beforeInitialize);
        assertFalse(permissions.afterInitialize);
    }

    // ───────────────────────────────────────────────
    // TRANCHE MANAGER
    // ───────────────────────────────────────────────

    function test_getPosition_defaultsToZero() public view {
        TrancheManager.Position memory pos = hook.getPosition(address(this));
        assertEq(pos.seniorLiquidity, 0);
        assertEq(pos.juniorLiquidity, 0);
        assertEq(pos.totalLiquidity, 0);
    }

    function test_getPosition_afterAddLiquidity() public {
        vm.prank(address(manager));
        SochalantHook(address(hook)).beforeAddLiquidity(
            address(this), poolKey,
            ModifyLiquidityParams(-120, 120, int256(LIQ_AMOUNT), 0),
            Constants.ZERO_BYTES
        );

        TrancheManager.Position memory pos = hook.getPosition(address(this));
        assertEq(pos.totalLiquidity, LIQ_AMOUNT);
        assertEq(pos.seniorLiquidity, (LIQ_AMOUNT * 70) / 100);
        assertEq(pos.juniorLiquidity, (LIQ_AMOUNT * 30) / 100);
    }

    function test_getPosition_multipleUsers() public {
        address userA = makeAddr("userA");
        address userB = makeAddr("userB");

        vm.startPrank(address(manager));
        SochalantHook(address(hook)).beforeAddLiquidity(
            userA, poolKey,
            ModifyLiquidityParams(-120, 120, 1000 ether, 0),
            Constants.ZERO_BYTES
        );
        SochalantHook(address(hook)).beforeAddLiquidity(
            userB, poolKey,
            ModifyLiquidityParams(-120, 120, 2000 ether, 0),
            Constants.ZERO_BYTES
        );
        vm.stopPrank();

        TrancheManager.Position memory posA = hook.getPosition(userA);
        assertEq(posA.totalLiquidity, 1000 ether);
        assertEq(posA.seniorLiquidity, 700 ether);
        assertEq(posA.juniorLiquidity, 300 ether);

        TrancheManager.Position memory posB = hook.getPosition(userB);
        assertEq(posB.totalLiquidity, 2000 ether);
        assertEq(posB.seniorLiquidity, 1400 ether);
        assertEq(posB.juniorLiquidity, 600 ether);
    }

    // ───────────────────────────────────────────────
    // RISK ENGINE
    // ───────────────────────────────────────────────

    function test_RiskEngine_calculateRiskScore_zeroLiquidity() public {
        uint256 score = RiskEngine.calculateRiskScore(1e18, 1e18, 0, 0);
        assertEq(score, 0);
    }

    function test_RiskEngine_calculateRiskScore_low() public {
        // small priceDelta, small swapSize, low volatility → low risk
        uint256 score = RiskEngine.calculateRiskScore(0.01e18, 0.01e18, 1e18, 0.01e18);
        assertTrue(score <= 30);
    }

    function test_RiskEngine_calculateRiskScore_medium() public {
        uint256 score = RiskEngine.calculateRiskScore(0.5e18, 0.5e18, 1e18, 0.5e18);
        assertTrue(score > 30 && score <= 70);
    }

    function test_RiskEngine_calculateRiskScore_high() public {
        uint256 score = RiskEngine.calculateRiskScore(2e18, 2e18, 1e18, 2e18);
        assertEq(score, 100);
    }

    function test_RiskEngine_calculateRiskScore_capsAt100() public {
        uint256 score = RiskEngine.calculateRiskScore(100e18, 100e18, 1e18, 100e18);
        assertEq(score, 100);
    }

    function test_RiskEngine_getRiskLevel() public {
        assertEq(RiskEngine.getRiskLevel(0), "LOW");
        assertEq(RiskEngine.getRiskLevel(30), "LOW");
        assertEq(RiskEngine.getRiskLevel(31), "MEDIUM");
        assertEq(RiskEngine.getRiskLevel(70), "MEDIUM");
        assertEq(RiskEngine.getRiskLevel(71), "HIGH");
        assertEq(RiskEngine.getRiskLevel(100), "HIGH");
    }

    // ───────────────────────────────────────────────
    // INTEGRATION: BEFORE ADD LIQUIDITY
    // ───────────────────────────────────────────────

    function test_beforeAddLiquidity_createsPosition() public {
        _addLiquidity();

        TrancheManager.Position memory pos = hook.getPosition(address(modifyLiquidityRouter));
        assertEq(pos.totalLiquidity, LIQ_AMOUNT);
        assertEq(pos.seniorLiquidity, (LIQ_AMOUNT * 70) / 100);
        assertEq(pos.juniorLiquidity, (LIQ_AMOUNT * 30) / 100);
    }

    // ───────────────────────────────────────────────
    // INTEGRATION: BEFORE SWAP
    // ───────────────────────────────────────────────

    function test_beforeSwap_initializesLastPrice() public {
        _addLiquidity();

        SochalantHook.VaultState memory state = hook.getVaultState(poolId);
        assertEq(state.lastPrice, 0);

        _swap(true, -1e18);

        state = hook.getVaultState(poolId);
        assertTrue(state.lastPrice > 0);
    }

    // ───────────────────────────────────────────────
    // INTEGRATION: AFTER SWAP
    // ───────────────────────────────────────────────

    function test_afterSwap_updatesVaultState() public {
        _addLiquidity();
        _swap(true, -1e18);

        SochalantHook.VaultState memory state = hook.getVaultState(poolId);
        assertTrue(state.lastPrice > 0);
        assertTrue(state.riskScore > 0);
        assertTrue(state.volatility > 0);
    }

    function test_afterSwap_emitsRiskUpdated() public {
        _addLiquidity();

        vm.expectEmit(true, true, true, true);
        emit SochalantHook.RiskUpdated(poolId, 100);

        _swap(true, -1e18);
    }

    function test_afterSwap_largeSwap_triggersHedge() public {
        _addLiquidity();
        _swap(true, -10_000e18);

        SochalantHook.VaultState memory state = hook.getVaultState(poolId);
        assertTrue(state.hedgeActive);
        assertEq(state.hedgeIntensity, 100);
    }

    function test_afterSwap_riskScorePersistsAcrossSwaps() public {
        _addLiquidity();
        _swap(true, -1e18);

        uint256 riskAfterFirst = hook.getVaultState(poolId).riskScore;

        _swap(false, 0.5e18);

        uint256 riskAfterSecond = hook.getVaultState(poolId).riskScore;
        assertTrue(riskAfterSecond > 0);
    }

    function test_afterSwap_volatilityAccumulates() public {
        _addLiquidity();
        _swap(true, -1e18);

        uint256 volAfterFirst = hook.getVaultState(poolId).volatility;

        _swap(false, 0.5e18);

        uint256 volAfterSecond = hook.getVaultState(poolId).volatility;
        assertTrue(volAfterSecond >= volAfterFirst);
    }

    function test_afterSwap_smallSwapsInBothDirections() public {
        _addLiquidity();
        _swap(true, -0.01e18);

        SochalantHook.VaultState memory state = hook.getVaultState(poolId);
        assertTrue(state.lastPrice > 0);

        _swap(false, 0.01e18);

        state = hook.getVaultState(poolId);
        assertTrue(state.lastPrice > 0);
    }

    // ───────────────────────────────────────────────
    // INTEGRATION: FULL FLOW
    // ───────────────────────────────────────────────

    function test_fullFlow_addLiquidityThenSwap() public {
        _addLiquidity();

        TrancheManager.Position memory pos = hook.getPosition(address(modifyLiquidityRouter));
        assertEq(pos.totalLiquidity, LIQ_AMOUNT);

        _swap(true, -1e18);

        SochalantHook.VaultState memory state = hook.getVaultState(poolId);
        assertTrue(state.lastPrice > 0);
        assertTrue(state.riskScore > 0);
    }

    function test_fullFlow_multipleAddsThenMultipleSwaps() public {
        _addLiquidity();

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 500e18;
        amounts[1] = 1000e18;
        amounts[2] = 2000e18;

        for (uint256 i = 0; i < amounts.length; i++) {
            modifyLiquidityRouter.modifyLiquidity(
                poolKey,
                ModifyLiquidityParams(-120, 120, int256(amounts[i]), 0),
                Constants.ZERO_BYTES
            );
        }

        for (int256 i = 0; i < 5; i++) {
            _swap(true, -(1e18 + i * 0.5e18));
            _swap(false, (0.5e18 + i * 0.25e18));
        }

        SochalantHook.VaultState memory state = hook.getVaultState(poolId);
        assertTrue(state.lastPrice > 0);
        assertTrue(state.riskScore > 0);
        assertTrue(state.volatility > 0);
    }

    // ───────────────────────────────────────────────
    // EDGE CASES
    // ───────────────────────────────────────────────

    function test_swapWithZeroLiquidity_noRevert() public {
        _swap(true, -1e18);

        SochalantHook.VaultState memory state = hook.getVaultState(poolId);
        assertTrue(state.lastPrice > 0);
    }

    function test_getPosition_nonExistentUser() public {
        TrancheManager.Position memory pos = hook.getPosition(makeAddr("nonexistent"));
        assertEq(pos.totalLiquidity, 0);
        assertEq(pos.seniorLiquidity, 0);
        assertEq(pos.juniorLiquidity, 0);
    }

    function test_beforeAddLiquidity_zeroLiquidity() public {
        vm.prank(address(manager));
        SochalantHook(address(hook)).beforeAddLiquidity(
            address(this), poolKey,
            ModifyLiquidityParams(-120, 120, 0, 0),
            Constants.ZERO_BYTES
        );

        TrancheManager.Position memory pos = hook.getPosition(address(this));
        assertEq(pos.totalLiquidity, 0);
        assertEq(pos.seniorLiquidity, 0);
        assertEq(pos.juniorLiquidity, 0);
    }

    function test_getHookPermissions_stableAfterMultipleCalls() public view {
        for (uint256 i = 0; i < 5; i++) {
            Hooks.Permissions memory permissions = hook.getHookPermissions();
            assertTrue(permissions.beforeSwap);
            assertTrue(permissions.afterSwap);
            assertTrue(permissions.beforeAddLiquidity);
        }
    }
}