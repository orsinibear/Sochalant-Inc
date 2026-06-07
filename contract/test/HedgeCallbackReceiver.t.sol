// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/HedgeCallbackReceiver.sol";

contract HedgeCallbackReceiverTest is Test {
    HedgeCallbackReceiver public receiver;
    address public hook = address(0x1234);
    address public sender = address(0x5678);

    event HedgeTriggered(bytes32 indexed poolId, uint256 riskScore);
    event HedgeUnwound(bytes32 indexed poolId);
    event PriceFeedUpdated(bytes32 indexed poolId, uint256 price, uint256 volatility);
    event CallbackSenderUpdated(address indexed oldSender, address indexed newSender);

    function setUp() public {
        receiver = new HedgeCallbackReceiver(hook, sender);
    }

    function test_Constructor() public {
        assertEq(address(receiver.hook()), hook);
        assertEq(receiver.callbackSender(), sender);
    }

    function test_TriggerHedge() public {
        bytes32 poolId = keccak256("pool1");
        uint256 riskScore = 85;

        vm.prank(sender);
        vm.expectEmit(true, false, false, true);
        emit HedgeTriggered(poolId, riskScore);
        receiver.triggerHedge(poolId, riskScore);
    }

    function test_TriggerHedgeUnauthorized() public {
        vm.prank(address(0xdead));
        vm.expectRevert("unauthorized");
        receiver.triggerHedge(keccak256("pool1"), 85);
    }

    function test_UnwindHedge() public {
        bytes32 poolId = keccak256("pool2");

        vm.prank(sender);
        vm.expectEmit(true, false, false, false);
        emit HedgeUnwound(poolId);
        receiver.unwindHedge(poolId);
    }

    function test_UpdatePriceFeed() public {
        bytes32 poolId = keccak256("pool3");
        uint256 price = 100e18;
        uint256 volatility = 500;

        vm.prank(sender);
        vm.expectEmit(true, false, false, true);
        emit PriceFeedUpdated(poolId, price, volatility);
        receiver.updatePriceFeed(poolId, price, volatility);
    }

    function test_SetCallbackSender() public {
        address newSender = address(0x9abc);

        vm.expectEmit(true, true, false, false);
        emit CallbackSenderUpdated(sender, newSender);
        receiver.setCallbackSender(newSender);

        assertEq(receiver.callbackSender(), newSender);
    }
}
