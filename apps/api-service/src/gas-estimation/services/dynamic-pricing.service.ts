import { Injectable, Logger } from "@nestjs/common";
import {
  DynamicGasEstimate,
  PricingStrategy,
  GasPriceSnapshot,
} from "../interfaces/gas-price.interface";
import { NetworkMonitorService } from "./network-monitor.service";
import { TieredPricingService } from "./tiered-pricing.service";
import {
  UserUsage,
  TieredPriceEstimate,
} from "../interfaces/tiered-pricing.interface";

/**
 * DynamicPricingService
 * Calculates dynamic gas prices based on real-time network conditions
 * Implements adaptive pricing strategies with safety margins
 */
@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  // Default pricing strategy for Soroban
  private readonly defaultStrategy: PricingStrategy = {
    name: "soroban-adaptive",
    baseMultiplier: 1.0,
    congestionThresholds: {
      low: 30,
      medium: 60,
      high: 85,
    },
    surgeMultipliers: {
      low: 1.0,
      medium: 1.3,
      high: 2.0,
      critical: 3.5,
    },
    safetyMargin: 1.15, // 15% safety margin
  };

  constructor(
    private networkMonitor: NetworkMonitorService,
    private tieredPricingService: TieredPricingService,
  ) {}

  /**
   * Get dynamic gas estimate for a transaction with tiered pricing
   */
  async estimateGasPrice(
    chainId: string,
    gasUnits: number,
    priority: "low" | "normal" | "high" | "critical" = "normal",
    userUsage?: UserUsage,
  ): Promise<DynamicGasEstimate> {
    try {
      // Get current network snapshot
      const snapshot = await this.networkMonitor.getGasPriceSnapshot(chainId);

      // Apply priority multiplier
      const priorityMultiplier = this.getPriorityMultiplier(priority);
      const finalGasPrice = snapshot.recommendedFeeRate * priorityMultiplier;

      // Apply safety margin
      const safetyAdjustedPrice =
        finalGasPrice * this.defaultStrategy.safetyMargin;

      // Calculate total cost
      let totalEstimatedCostStroops = gasUnits * safetyAdjustedPrice;
      let totalEstimatedCostXLM = totalEstimatedCostStroops / 1e7; // 1 XLM = 10^7 stroops

      // Apply tiered pricing if user usage is provided
      if (userUsage) {
        const tieredEstimate =
          await this.tieredPricingService.calculateTieredPrice(
            {
              chainId,
              estimatedGasUnits: gasUnits,
              baseGasPrice: snapshot.baseFeePerInstruction,
              surgeMultiplier: snapshot.surgePriceMultiplier,
              dynamicGasPrice: safetyAdjustedPrice,
              totalEstimatedCostStroops,
              totalEstimatedCostXLM,
              priceValidityDurationMs: this.calculatePriceValidityWindow(
                snapshot.volatilityIndex,
              ),
              expiresAt: new Date(
                Date.now() +
                  this.calculatePriceValidityWindow(snapshot.volatilityIndex),
              ),
              recommendedPriority: priority,
              alternativePrices: this.generateAlternativePrices(
                snapshot,
                gasUnits,
              ),
            },
            userUsage,
          );

        totalEstimatedCostStroops = tieredEstimate.totalCostWithTier * 1e7;
        totalEstimatedCostXLM = tieredEstimate.totalCostWithTier;
      }

      // Determine price validity window (shorter during high volatility)
      const priceValidityDurationMs = this.calculatePriceValidityWindow(
        snapshot.volatilityIndex,
      );

      // Generate alternative price suggestions
      const alternativePrices = this.generateAlternativePrices(
        snapshot,
        gasUnits,
      );

      return {
        chainId,
        estimatedGasUnits: gasUnits,
        baseGasPrice: snapshot.baseFeePerInstruction,
        surgeMultiplier: snapshot.surgePriceMultiplier,
        dynamicGasPrice: safetyAdjustedPrice,
        totalEstimatedCostStroops,
        totalEstimatedCostXLM,
        priceValidityDurationMs,
        expiresAt: new Date(Date.now() + priceValidityDurationMs),
        recommendedPriority: priority,
        alternativePrices,
      };
    } catch (error) {
      this.logger.error("Failed to estimate gas price", error);
      throw new Error("Gas price estimation failed");
    }
  }

  /**
   * Get tiered gas estimate with full tier analysis
   */
  async estimateGasPriceWithTier(
    chainId: string,
    gasUnits: number,
    userUsage: UserUsage,
    priority: "low" | "normal" | "high" | "critical" = "normal",
  ): Promise<TieredPriceEstimate> {
    // First get the base estimate
    const baseEstimate = await this.estimateGasPrice(
      chainId,
      gasUnits,
      priority,
    );

    // Then apply tiered pricing
    return this.tieredPricingService.calculateTieredPrice(
      baseEstimate,
      userUsage,
    );
  }

  /**
   * Get multiple price options with tiered pricing
   */
  async getMultipleTieredPriceOptions(
    chainId: string,
    gasUnits: number,
    userUsage: UserUsage,
  ): Promise<{
    low: TieredPriceEstimate;
    normal: TieredPriceEstimate;
    high: TieredPriceEstimate;
    critical: TieredPriceEstimate;
  }> {
    const [low, normal, high, critical] = await Promise.all([
      this.estimateGasPriceWithTier(chainId, gasUnits, userUsage, "low"),
      this.estimateGasPriceWithTier(chainId, gasUnits, userUsage, "normal"),
      this.estimateGasPriceWithTier(chainId, gasUnits, userUsage, "high"),
      this.estimateGasPriceWithTier(chainId, gasUnits, userUsage, "critical"),
    ]);

    return { low, normal, high, critical };
  }

  /**
   * Validate user access and provide tier recommendations
   */
  async validateUserTierAccess(userUsage: UserUsage): Promise<{
    validation: any;
    tierComparison: any[];
    recommendedActions: string[];
  }> {
    const validation = this.tieredPricingService.validateTierAccess(userUsage);
    const tierComparison = this.tieredPricingService.getTierComparison();
    const recommendedActions: string[] = [];

    // Generate recommended actions based on validation
    if (validation.suggestedAction === "upgrade") {
      recommendedActions.push(
        `Consider upgrading to ${validation.nextAvailableTier} tier for higher limits`,
      );
    }

    if (validation.suggestedAction === "downgrade") {
      recommendedActions.push(
        "You may be overpaying for your current usage level",
      );
    }

    // Check for auto-upgrade eligibility
    if (this.tieredPricingService.shouldAutoUpgrade(userUsage)) {
      recommendedActions.push(
        "You are eligible for automatic tier upgrade based on consistent high usage",
      );
    }

    return {
      validation,
      tierComparison,
      recommendedActions,
    };
  }

  /**
   * Get recommended gas price for different priority levels
   */
  async getMultiplePriceOptions(
    chainId: string,
    gasUnits: number,
  ): Promise<{
    low: DynamicGasEstimate;
    normal: DynamicGasEstimate;
    high: DynamicGasEstimate;
    critical: DynamicGasEstimate;
  }> {
    const [low, normal, high, critical] = await Promise.all([
      this.estimateGasPrice(chainId, gasUnits, "low"),
      this.estimateGasPrice(chainId, gasUnits, "normal"),
      this.estimateGasPrice(chainId, gasUnits, "high"),
      this.estimateGasPrice(chainId, gasUnits, "critical"),
    ]);

    return { low, normal, high, critical };
  }

  /**
   * Calculate optimal gas price based on historical patterns
   */
  async suggestOptimalPrice(
    chainId: string,
    gasUnits: number,
  ): Promise<{
    recommendedPrice: number;
    reasoning: string;
    expectedConfirmationTime: string;
  }> {
    const snapshot = await this.networkMonitor.getGasPriceSnapshot(chainId);
    const historical = await this.networkMonitor.getHistoricalMetrics(
      chainId,
      6,
    );

    // Analyze recent trend
    const recentAverage =
      historical.slice(-12).reduce((sum, h) => sum + h.recommendedFeeRate, 0) /
      12;
    const trend =
      snapshot.recommendedFeeRate > recentAverage ? "increasing" : "decreasing";

    // Confidence-based recommendation
    const recommendedPrice = this.adjustForConfidence(
      snapshot.recommendedFeeRate * this.defaultStrategy.safetyMargin,
      snapshot.priceConfidence,
    );

    const confirmationTime = this.estimateConfirmationTime(
      snapshot.networkLoad,
      snapshot.averageBlockTime,
    );

    return {
      recommendedPrice,
      reasoning: `Network is ${trend} with ${snapshot.networkLoad.toFixed(1)}% load. Confidence: ${snapshot.priceConfidence.toFixed(0)}%`,
      expectedConfirmationTime: confirmationTime,
    };
  }

  /**
   * Get priority multiplier for transaction urgency
   */
  private getPriorityMultiplier(priority: string): number {
    const multipliers = {
      low: 0.8, // Save 20% on fees
      normal: 1.0,
      high: 1.5, // Cost 50% more for faster inclusion
      critical: 2.5, // Emergency pricing
    };
    return multipliers[priority as keyof typeof multipliers] || 1.0;
  }

  /**
   * Calculate how long a gas price quote remains valid
   * Shorter validity during high volatility
   */
  private calculatePriceValidityWindow(volatilityIndex: number): number {
    const baseWindow = 60000; // 60 seconds base
    const volatilityFactor = Math.max(0.3, 1.0 - volatilityIndex / 200);
    return Math.round(baseWindow * volatilityFactor);
  }

  /**
   * Generate alternative pricing options
   */
  private generateAlternativePrices(
    snapshot: GasPriceSnapshot,
    gasUnits: number,
  ): { low: number; medium: number; high: number } {
    return {
      low:
        snapshot.baseFeePerInstruction *
        0.85 *
        this.defaultStrategy.safetyMargin, // 15% discount
      medium: snapshot.recommendedFeeRate * this.defaultStrategy.safetyMargin,
      high:
        snapshot.recommendedFeeRate * 1.3 * this.defaultStrategy.safetyMargin, // 30% premium
    };
  }

  /**
   * Adjust price based on confidence level
   */
  private adjustForConfidence(basePrice: number, confidence: number): number {
    // Higher confidence = can accept lower prices
    // Lower confidence = need higher safety margin
    const confidenceMultiplier = 1.0 + (100 - confidence) / 500;
    return basePrice * confidenceMultiplier;
  }

  /**
   * Estimate confirmation time based on network conditions
   */
  private estimateConfirmationTime(
    networkLoad: number,
    blockTime: number,
  ): string {
    const estimatedBlocks = Math.ceil(networkLoad / 20); // Rough estimate
    const confirmationMs = estimatedBlocks * blockTime;

    if (confirmationMs < 5000) {
      return "< 5 seconds";
    } else if (confirmationMs < 30000) {
      return `${Math.ceil(confirmationMs / 1000)}-${Math.ceil(confirmationMs / 1000) + 3} seconds`;
    } else if (confirmationMs < 120000) {
      return `${Math.ceil(confirmationMs / 1000)}-${Math.ceil(confirmationMs / 1000) + 5} seconds`;
    } else {
      return "> 2 minutes";
    }
  }
}
