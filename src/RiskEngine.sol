// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library RiskEngine {
    enum RiskLevel { Low, Medium, High }

    uint256 internal constant MAX_RISK_SCORE = 100;
    uint256 internal constant PRICE_WEIGHT = 30;
    uint256 internal constant VOLUME_WEIGHT = 25;
    uint256 internal constant VOLATILITY_WEIGHT = 25;
    uint256 internal constant IMBALANCE_WEIGHT = 20;

    function calculateRiskScore(
        uint256 priceDelta,
        uint256 swapSize,
        uint256 liquidity,
        uint256 volatilityAccumulator,
        uint256 buyVolume,
        uint256 sellVolume
    ) internal pure returns (uint256 riskScore, RiskLevel level) {
        if (liquidity == 0) return (0, RiskLevel.Low);

        uint256 totalVolume = buyVolume + sellVolume;
        uint256 imbalance = totalVolume == 0
            ? 0
            : (buyVolume > sellVolume ? buyVolume - sellVolume : sellVolume - buyVolume) * 100 / totalVolume;

        uint256 priceImpact = (priceDelta * PRICE_WEIGHT) / 1e18;
        uint256 volumeImpact = (swapSize * VOLUME_WEIGHT) / liquidity;
        uint256 volatilityImpact = (volatilityAccumulator * VOLATILITY_WEIGHT) / 1e18;
        uint256 imbalanceImpact = (imbalance * IMBALANCE_WEIGHT) / 100;

        riskScore = priceImpact + volumeImpact + volatilityImpact + imbalanceImpact;

        if (riskScore > MAX_RISK_SCORE) {
            riskScore = MAX_RISK_SCORE;
        }

        level = getRiskLevel(riskScore);
    }

    function getRiskLevel(uint256 riskScore) internal pure returns (RiskLevel) {
        if (riskScore <= 30) return RiskLevel.Low;
        if (riskScore <= 70) return RiskLevel.Medium;
        return RiskLevel.High;
    }
}
