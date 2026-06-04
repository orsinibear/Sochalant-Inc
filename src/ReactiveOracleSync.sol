// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "reactive-lib/interfaces/IReactive.sol";
import "reactive-lib/abstract-base/AbstractReactive.sol";
import "reactive-lib/interfaces/ISubscriptionService.sol";

contract ReactiveOracleSync is IReactive, AbstractReactive {
    bytes32 constant RISK_UPDATE_TOPIC_0 = 0x73ed91d7aab93da2b8d1215c632401f6171834e0871d422fe652094188521b81;
    bytes32 constant HEDGE_ACTION_TOPIC_0 = 0x43b67053de385cb339f23ead334d8e8d050e07e6d24e9374ac5a3fb92aa844d0;

    uint64 private constant GAS_LIMIT = 500000;

    uint256 public unichainSepoliaChainId;
    address public hookAddress;
    address public callbackAddress;

    event SubscribedToHook(address indexed hook, uint256 chainId);

    constructor(
        uint256 _unichainSepoliaChainId,
        address _hookAddress,
        address _callbackAddress
    ) payable {
        unichainSepoliaChainId = _unichainSepoliaChainId;
        hookAddress = _hookAddress;
        callbackAddress = _callbackAddress;

        if (!vm) {
            service.subscribe(
                unichainSepoliaChainId,
                hookAddress,
                uint256(RISK_UPDATE_TOPIC_0),
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
            service.subscribe(
                unichainSepoliaChainId,
                hookAddress,
                uint256(HEDGE_ACTION_TOPIC_0),
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
            emit SubscribedToHook(hookAddress, unichainSepoliaChainId);
        }
    }

    function react(LogRecord calldata log) external vmOnly {
        if (log._contract != hookAddress) return;

        if (log.topic_0 == uint256(RISK_UPDATE_TOPIC_0)) {
            _handleRiskUpdate(log);
        }

        if (log.topic_0 == uint256(HEDGE_ACTION_TOPIC_0)) {
            _handleHedgeAction(log);
        }
    }

    function _handleRiskUpdate(LogRecord calldata log) internal {
        bytes32 poolId = bytes32(log.topic_1);
        uint256 riskScore = log.topic_2;
        uint256 volatility = log.topic_3;

        if (riskScore > 70) {
            bytes memory payload = abi.encodeWithSignature(
                "triggerHedge(bytes32,uint256)",
                poolId,
                riskScore
            );
            emit Callback(unichainSepoliaChainId, callbackAddress, GAS_LIMIT, payload);
        } else if (riskScore < 30) {
            bytes memory payload = abi.encodeWithSignature(
                "unwindHedge(bytes32)",
                poolId
            );
            emit Callback(unichainSepoliaChainId, callbackAddress, GAS_LIMIT, payload);
        }

        bytes memory pricePayload = abi.encodeWithSignature(
            "updatePriceFeed(bytes32,uint256,uint256)",
            poolId,
            riskScore,
            volatility
        );
        emit Callback(unichainSepoliaChainId, callbackAddress, GAS_LIMIT, pricePayload);
    }

    function _handleHedgeAction(LogRecord calldata log) internal {
        bytes32 poolId = bytes32(log.topic_1);
        bool active = log.topic_2 != 0;
        uint256 intensity = log.topic_3;

        if (active && intensity > 0) {
            bytes memory payload = abi.encodeWithSignature(
                "triggerHedge(bytes32,uint256)",
                poolId,
                intensity
            );
            emit Callback(unichainSepoliaChainId, callbackAddress, GAS_LIMIT, payload);
        } else if (!active) {
            bytes memory payload = abi.encodeWithSignature(
                "unwindHedge(bytes32)",
                poolId
            );
            emit Callback(unichainSepoliaChainId, callbackAddress, GAS_LIMIT, payload);
        }
    }

    function subscribeToExternalFeed(
        uint256 chainId,
        address feedContract,
        uint256 topic0
    ) external {
        if (!vm) {
            service.subscribe(
                chainId,
                feedContract,
                topic0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    }
}
