// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MockERC20.sol";
import "../src/RiskEngine.sol";
import "../src/TrancheManager.sol";
import "../src/SochalantHook.sol";
import "@uniswap/v4-core/src/types/PoolKey.sol";
import "@uniswap/v4-core/src/types/Currency.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract TestTrancheManager is TrancheManager {
    function distributePnL(address user, address token, int256 pnl) public {
        _distributePnL(user, token, pnl);
    }

    function deposit(address user, address token, uint256 amount) public {
        _deposit(user, token, amount);
    }

    function withdraw(address user, address token, uint256 amount) public {
        _withdraw(user, token, amount);
    }
}

contract SochalantHookTest is Test {
    MockERC20 tokenA;
    MockERC20 tokenB;
    SochalantHook hook;
    TestTrancheManager tm;

    function setUp() public {
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");

        tm = new TestTrancheManager();

        bytes memory initCode = abi.encodePacked(type(SochalantHook).creationCode, abi.encode(address(0)));
        bytes32 initCodeHash = keccak256(initCode);

        for (uint256 i = 0; i < 50000; i++) {
            bytes32 salt = bytes32(uint256(i));
            address predicted = vm.computeCreate2Address(salt, initCodeHash, address(this));
            if (uint160(predicted) & 0x3FFF == 0xC0) {
                hook = new SochalantHook{salt: salt}(IPoolManager(address(0)));
                break;
            }
        }
        require(address(hook) != address(0), "no deployable address found");

        hook.addSupportedToken(address(tokenA));
        hook.addSupportedToken(address(tokenB));
    }

    function test_MintTokens() public {
        tokenA.mint(address(this), 1000 ether);
        assertEq(tokenA.balanceOf(address(this)), 1000 ether);
    }

    function test_Deposit() public {
        tokenA.mint(address(this), 1000 ether);
        tokenA.approve(address(hook), 1000 ether);
        hook.deposit(tokenA, 1000 ether);

        TrancheManager.Vault memory v = hook.getVault(address(this), address(tokenA));
        assertEq(v.totalLiquidity, 1000 ether);
        assertEq(v.seniorLiquidity, 700 ether);
        assertEq(v.juniorLiquidity, 300 ether);
        assertEq(v.seniorValue, 700 ether);
        assertEq(v.juniorValue, 300 ether);
    }

    function test_DepositAndWithdraw() public {
        tokenA.mint(address(this), 1000 ether);
        tokenA.approve(address(hook), 1000 ether);
        hook.deposit(tokenA, 1000 ether);

        uint256 balanceBefore = tokenA.balanceOf(address(this));
        hook.withdraw(tokenA, 1000 ether);
        uint256 balanceAfter = tokenA.balanceOf(address(this));

        assertApproxEqAbs(balanceAfter - balanceBefore, 1000 ether, 1);
    }

    function test_RiskEngineScoring() public pure {
        (uint256 score, ) = RiskEngine.calculateRiskScore(
            0.5 ether, 1e17, 1e18, 0.1 ether, 1000 ether, 100 ether
        );
        assertEq(score, 35);
    }

    function test_RiskEngineLow() public pure {
        (, RiskEngine.RiskLevel level) = RiskEngine.calculateRiskScore(
            0.01 ether, 1e15, 1e18, 0.01 ether, 100 ether, 100 ether
        );
        assertEq(uint256(level), uint256(RiskEngine.RiskLevel.Low));
    }

    function test_RiskEngineHigh() public pure {
        (, RiskEngine.RiskLevel level) = RiskEngine.calculateRiskScore(
            1 ether, 1e18, 1e18, 1 ether, 1000 ether, 10 ether
        );
        assertEq(uint256(level), uint256(RiskEngine.RiskLevel.High));
    }

    function test_SimulateSwapTriggersRiskUpdate() public {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(tokenA)),
            currency1: Currency.wrap(address(tokenB)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        hook.simulateSwap(key, 0.1 ether, 1e17, true);

        SochalantHook.PoolState memory state = hook.getPoolState(key);
        assertTrue(state.riskScore > 0);
        assertEq(state.buyVolume, 1e17);
    }

    function test_HedgeActivatesAbove70() public {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(tokenA)),
            currency1: Currency.wrap(address(tokenB)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        hook.simulateSwap(key, 1 ether, 1e18, true);
        hook.simulateSwap(key, 1 ether, 1e18, true);
        hook.simulateSwap(key, 1 ether, 1e18, true);
        hook.simulateSwap(key, 1 ether, 1e18, true);

        SochalantHook.PoolState memory state = hook.getPoolState(key);
        assertTrue(state.hedgeActive);
        assertEq(state.hedgeIntensity, 100);
    }

    function test_HedgeDeactivatesBelow30() public {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(tokenA)),
            currency1: Currency.wrap(address(tokenB)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        hook.simulateSwap(key, 1 ether, 1e18, true);
        hook.simulateSwap(key, 1 ether, 1e18, true);
        hook.simulateSwap(key, 1 ether, 1e18, true);

        SochalantHook.PoolState memory state = hook.getPoolState(key);
        assertTrue(state.hedgeActive);

        for (uint256 i = 0; i < 20; i++) {
            hook.simulateSwap(key, 0.001 ether, 1e14, true);
        }

        state = hook.getPoolState(key);
        assertFalse(state.hedgeActive);
        assertEq(state.hedgeIntensity, 0);
    }

    function test_PnLDistributionJuniorAbsorbsLoss() public {
        tm.deposit(address(this), address(tokenA), 1000 ether);
        tm.distributePnL(address(this), address(tokenA), -100 ether);

        TrancheManager.Vault memory v = tm.getVault(address(this), address(tokenA));
        assertEq(v.seniorValue, 700 ether);
        assertEq(v.juniorValue, 200 ether);
    }

    function test_PnLDistributionLossExceedsJunior() public {
        tm.deposit(address(this), address(tokenA), 1000 ether);
        tm.distributePnL(address(this), address(tokenA), -500 ether);

        TrancheManager.Vault memory v = tm.getVault(address(this), address(tokenA));
        assertEq(v.juniorValue, 0);
        assertEq(v.seniorValue, 500 ether);
    }

    function test_PnLDistributionProfitBoost() public {
        tm.deposit(address(this), address(tokenA), 1000 ether);
        tm.distributePnL(address(this), address(tokenA), 100 ether);

        TrancheManager.Vault memory v = tm.getVault(address(this), address(tokenA));
        assertEq(v.seniorValue, 755 ether);
        assertEq(v.juniorValue, 345 ether);
    }

    function test_MultipleUsers() public {
        tokenA.mint(address(this), 2000 ether);
        tokenA.approve(address(hook), 2000 ether);
        hook.deposit(tokenA, 1000 ether);

        vm.prank(address(0xABCD));
        tokenA.mint(address(0xABCD), 500 ether);
        vm.prank(address(0xABCD));
        tokenA.approve(address(hook), 500 ether);
        vm.prank(address(0xABCD));
        hook.deposit(tokenA, 500 ether);

        TrancheManager.Vault memory v1 = hook.getVault(address(this), address(tokenA));
        TrancheManager.Vault memory v2 = hook.getVault(address(0xABCD), address(tokenA));

        assertEq(v1.totalLiquidity, 1000 ether);
        assertEq(v2.totalLiquidity, 500 ether);
    }

    function test_UnsupportedTokenDepositFails() public {
        MockERC20 unsupported = new MockERC20("Bad", "BAD");
        unsupported.mint(address(this), 100 ether);
        unsupported.approve(address(hook), 100 ether);

        vm.expectRevert("token not supported");
        hook.deposit(unsupported, 100 ether);
    }
}
