// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SochalantHook} from "./SochalantHook.sol";

contract HedgeCallbackReceiver {
    SochalantHook public hook;
    address public callbackSender;

    event HedgeTriggered(bytes32 indexed poolId, uint256 riskScore);
    event HedgeUnwound(bytes32 indexed poolId);
    event PriceFeedUpdated(bytes32 indexed poolId, uint256 price, uint256 volatility);
    event CallbackSenderUpdated(address indexed oldSender, address indexed newSender);

    modifier onlyCallbackSender() {
        require(msg.sender == callbackSender, "unauthorized");
        _;
    }

    constructor(address _hook, address _callbackSender) {
        hook = SochalantHook(_hook);
        callbackSender = _callbackSender;
    }

    function setCallbackSender(address _newSender) external {
        emit CallbackSenderUpdated(callbackSender, _newSender);
        callbackSender = _newSender;
    }

    function triggerHedge(bytes32 poolId, uint256 riskScore) external onlyCallbackSender {
        emit HedgeTriggered(poolId, riskScore);
    }

    function unwindHedge(bytes32 poolId) external onlyCallbackSender {
        emit HedgeUnwound(poolId);
    }

    function updatePriceFeed(bytes32 poolId, uint256 price, uint256 volatility) external onlyCallbackSender {
        emit PriceFeedUpdated(poolId, price, volatility);
    }
}
