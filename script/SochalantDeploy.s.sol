// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/SochalantHook.sol";
import "../src/HedgeCallbackReceiver.sol";
import "../src/ReactiveOracleSync.sol";

import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract SochalantDeploy is Script {
    function run() external {
        address poolManager = vm.envOr("POOL_MANAGER", address(0));

        vm.startBroadcast();

        // ----------------------------
        // Tokens
        // ----------------------------
        MockERC20 tokenA = new MockERC20("Token A", "TKA");
        MockERC20 tokenB = new MockERC20("Token B", "TKB");

        // ----------------------------
        // Hook deployment (CREATE2 with salt brute-force)
        // ----------------------------
        bytes memory initCode = abi.encodePacked(
            type(SochalantHook).creationCode,
            abi.encode(poolManager)
        );
        bytes32 initCodeHash = keccak256(initCode);

        SochalantHook hook;
        for (uint256 i = 0; i < 50000; i++) {
            bytes32 salt = bytes32(uint256(i));
            address predicted = vm.computeCreate2Address(salt, initCodeHash);
            // beforeSwap=0x80, afterSwap=0x40, both=0xC0
            if (uint160(predicted) & 0x3FFF == 0xC0) {
                hook = new SochalantHook{salt: salt}(IPoolManager(poolManager));
                break;
            }
        }
        require(address(hook) != address(0), "no valid hook address found");

        // ----------------------------
        // Register tokens
        // ----------------------------
        hook.addSupportedToken(address(tokenA));
        hook.addSupportedToken(address(tokenB));

        // ----------------------------
        // Callback receiver
        // ----------------------------
        HedgeCallbackReceiver callback = new HedgeCallbackReceiver(
            address(hook),
            address(0)
        );

        vm.stopBroadcast();

        console.log("HOOK:", address(hook));
        console.log("CALLBACK:", address(callback));
        console.log("TOKEN A:", address(tokenA));
        console.log("TOKEN B:", address(tokenB));
    }
}
