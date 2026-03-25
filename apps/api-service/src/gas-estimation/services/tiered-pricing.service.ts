import { Injectable, Logger } from '@nestjs/common';
import {
  UsageTier,
  TierConfig,
  TieredPricingConfig,
  UserUsage,
  TieredPriceEstimate,
  TierTransition,
  TierValidationResult,
} from '../interfaces/tiered-pricing.interface';
import { DynamicGasEstimate } from '../interfaces/gas-price.interface';

/**
 * TieredPricingService
 * Implements usage-based pricing tiers for GasGuard
 * Handles tier calculations, transitions, and validation
 */
@Injectable()
export class TieredPricingService {
  private readonly logger = new Logger(TieredPricingService.name);

  // Default tier configuration
  private readonly defaultTierConfig: TieredPricingConfig = {
    defaultTier: UsageTier.DEVELOPER,
    usageTrackingPeriod: 30, // days
    autoUpgradeEnabled: true,
    tierChangeGracePeriod: 7, // days
    tiers: new Map([
      [UsageTier.STARTER, {
        tier: UsageTier.STARTER,
        name: 'Starter',
        description: 'Perfect for individual developers and small projects',
        requestLimit: 1000,
        basePricePerRequest: 0.00001, // 0.00001 XLM per request
        discountPercentage: 0,
        features: [
          'Basic gas estimation',
          'Standard priority support',
          'Monthly usage reports',
          'API access (1000 requests/month)'
        ],
        rateLimitPerMinute: 10,
        prioritySupport: false,
        customPricing: false,
      }],
      [UsageTier.DEVELOPER, {
        tier: UsageTier.DEVELOPER,
        name: 'Developer',
        description: 'Ideal for active developers and growing projects',
        requestLimit: 10000,
        basePricePerRequest: 0.000008, // 20% discount from starter
        discountPercentage: 20,
        features: [
          'Advanced gas estimation',
          'Priority support',
          'Real-time analytics',
          'API access (10,000 requests/month)',
          'Custom alerts',
          'Historical data access (6 months)'
        ],
        rateLimitPerMinute: 30,
        prioritySupport: true,
        customPricing: false,
      }],
      [UsageTier.PROFESSIONAL, {
        tier: UsageTier.PROFESSIONAL,
        name: 'Professional',
        description: 'For professional teams and production applications',
        requestLimit: 100000,
        basePricePerRequest: 0.000006, // 40% discount from starter
        discountPercentage: 40,
        features: [
          'Premium gas estimation',
          '24/7 priority support',
          'Advanced analytics dashboard',
          'API access (100,000 requests/month)',
          'Custom integrations',
          'Historical data access (2 years)',
          'Custom alerts and notifications',
          'SLA guarantees'
        ],
        rateLimitPerMinute: 100,
        prioritySupport: true,
        customPricing: true,
      }],
      [UsageTier.ENTERPRISE, {
        tier: UsageTier.ENTERPRISE,
        name: 'Enterprise',
        description: 'Custom solutions for large-scale operations',
        requestLimit: -1, // unlimited
        basePricePerRequest: 0.000004, // 60% discount from starter
        discountPercentage: 60,
        features: [
          'Enterprise-grade gas estimation',
          'Dedicated support team',
          'Custom analytics and reporting',
          'Unlimited API access',
          'White-label solutions',
          'Unlimited historical data',
          'Custom integrations and workflows',
          '99.9% SLA guarantee',
          'Custom contracts and pricing'
        ],
        rateLimitPerMinute: 1000,
        prioritySupport: true,
        customPricing: true,
      }],
    ]),
  };

  constructor() {
    this.logger.log('TieredPricingService initialized with default configuration');
  }

  /**
   * Get tier configuration by tier type
   */
  getTierConfig(tier: UsageTier): TierConfig | undefined {
    return this.defaultTierConfig.tiers.get(tier);
  }

  /**
   * Get all available tiers
   */
  getAllTiers(): TierConfig[] {
    return Array.from(this.defaultTierConfig.tiers.values());
  }

  /**
   * Calculate tiered pricing for a gas estimate
   */
  async calculateTieredPrice(
    baseEstimate: DynamicGasEstimate,
    userUsage: UserUsage,
  ): Promise<TieredPriceEstimate> {
    const tierConfig = this.getTierConfig(userUsage.currentTier);
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${userUsage.currentTier}`);
    }

    // Calculate tier discount
    const tierDiscount = tierConfig.discountPercentage / 100;
    const discountedPrice = baseEstimate.totalEstimatedCostXLM * (1 - tierDiscount);

    // Calculate usage metrics
    const usagePercentage = (userUsage.currentMonthRequests / tierConfig.requestLimit) * 100;
    const remainingRequests = Math.max(0, tierConfig.requestLimit - userUsage.currentMonthRequests);

    // Determine recommended tier based on usage
    const recommendedTier = this.getRecommendedTier(userUsage.currentMonthRequests);
    const upgradeSavings = this.calculateUpgradeSavings(
      userUsage.currentTier,
      recommendedTier,
      baseEstimate.totalEstimatedCostXLM,
    );

    // Check for downgrade warnings
    let downgradeWarning: string | undefined;
    if (usagePercentage < 20 && userUsage.currentTier !== UsageTier.STARTER) {
      const lowerTier = this.getLowerTier(userUsage.currentTier);
      downgradeWarning = `Consider downgrading to ${lowerTier} to save costs - you're only using ${usagePercentage.toFixed(1)}% of your current tier limit.`;
    }

    return {
      baseEstimate,
      appliedTier: userUsage.currentTier,
      tierDiscount: tierConfig.discountPercentage,
      finalPricePerRequest: discountedPrice,
      totalCostWithTier: discountedPrice,
      currentUsage: userUsage.currentMonthRequests,
      remainingRequests,
      usagePercentage,
      recommendedTier: recommendedTier !== userUsage.currentTier ? recommendedTier : undefined,
      upgradeSavings: upgradeSavings > 0 ? upgradeSavings : undefined,
      downgradeWarning,
    };
  }

  /**
   * Validate if user can proceed with request at current tier
   */
  validateTierAccess(userUsage: UserUsage): TierValidationResult {
    const tierConfig = this.getTierConfig(userUsage.currentTier);
    if (!tierConfig) {
      return {
        isValid: false,
        currentTier: userUsage.currentTier,
        canProceed: false,
        message: 'Invalid user tier configuration',
        suggestedAction: 'contact_support',
      };
    }

    // Check if user has exceeded their limit
    if (userUsage.currentMonthRequests >= tierConfig.requestLimit && tierConfig.requestLimit !== -1) {
      const nextTier = this.getHigherTier(userUsage.currentTier);
      return {
        isValid: false,
        currentTier: userUsage.currentTier,
        canProceed: false,
        message: `Monthly request limit exceeded (${tierConfig.requestLimit}). Please upgrade to ${nextTier} tier.`,
        suggestedAction: 'upgrade',
        nextAvailableTier: nextTier,
      };
    }

    // Check if user is approaching their limit
    const usagePercentage = (userUsage.currentMonthRequests / tierConfig.requestLimit) * 100;
    if (usagePercentage > 90) {
      return {
        isValid: true,
        currentTier: userUsage.currentTier,
        canProceed: true,
        message: `Warning: You've used ${usagePercentage.toFixed(1)}% of your monthly limit. Consider upgrading soon.`,
        suggestedAction: 'upgrade',
      };
    }

    return {
      isValid: true,
      currentTier: userUsage.currentTier,
      canProceed: true,
      message: 'Request authorized within current tier limits',
      suggestedAction: 'continue',
    };
  }

  /**
   * Get recommended tier based on usage
   */
  getRecommendedTier(monthlyRequests: number): UsageTier {
    if (monthlyRequests <= 1000) return UsageTier.STARTER;
    if (monthlyRequests <= 10000) return UsageTier.DEVELOPER;
    if (monthlyRequests <= 100000) return UsageTier.PROFESSIONAL;
    return UsageTier.ENTERPRISE;
  }

  /**
   * Calculate potential savings from tier upgrade
   */
  calculateUpgradeSavings(
    currentTier: UsageTier,
    recommendedTier: UsageTier,
    baseCost: number,
  ): number {
    if (currentTier === recommendedTier) return 0;

    const currentConfig = this.getTierConfig(currentTier);
    const recommendedConfig = this.getTierConfig(recommendedTier);

    if (!currentConfig || !recommendedConfig) return 0;

    const currentPrice = baseCost * (1 - currentConfig.discountPercentage / 100);
    const recommendedPrice = baseCost * (1 - recommendedConfig.discountPercentage / 100);

    return currentPrice - recommendedPrice;
  }

  /**
   * Process tier transition
   */
  async processTierTransition(
    userId: string,
    fromTier: UsageTier,
    toTier: UsageTier,
    reason: TierTransition['reason'],
  ): Promise<TierTransition> {
    const effectiveDate = new Date();
    effectiveDate.setDate(effectiveDate.getDate() + this.defaultTierConfig.tierChangeGracePeriod);

    const transition: TierTransition = {
      fromTier,
      toTier,
      effectiveDate,
      reason,
      prorationRequired: reason !== 'admin_change',
      notificationRequired: true,
    };

    this.logger.log(`Processing tier transition for user ${userId}: ${fromTier} -> ${toTier}`);
    
    // In a real implementation, this would:
    // 1. Update user record in database
    // 2. Process billing proration if required
    // 3. Send notification to user
    // 4. Update rate limiting rules
    // 5. Log the transition for audit

    return transition;
  }

  /**
   * Check if auto-upgrade should be triggered
   */
  shouldAutoUpgrade(userUsage: UserUsage): boolean {
    if (!this.defaultTierConfig.autoUpgradeEnabled) return false;

    const currentConfig = this.getTierConfig(userUsage.currentTier);
    if (!currentConfig) return false;

    // Auto-upgrade if consistently using >90% of limit for 3 months
    const recentMonths = userUsage.monthlyUsage.slice(-3);
    if (recentMonths.length < 3) return false;

    const highUsageMonths = recentMonths.filter(month => {
      const monthConfig = this.getTierConfig(month.tier);
      if (!monthConfig) return false;
      return (month.requests / monthConfig.requestLimit) > 0.9;
    });

    return highUsageMonths.length >= 3;
  }

  /**
   * Get next higher tier
   */
  private getHigherTier(currentTier: UsageTier): UsageTier {
    switch (currentTier) {
      case UsageTier.STARTER: return UsageTier.DEVELOPER;
      case UsageTier.DEVELOPER: return UsageTier.PROFESSIONAL;
      case UsageTier.PROFESSIONAL: return UsageTier.ENTERPRISE;
      case UsageTier.ENTERPRISE: return UsageTier.ENTERPRISE; // Already highest
      default: return UsageTier.DEVELOPER;
    }
  }

  /**
   * Get next lower tier
   */
  private getLowerTier(currentTier: UsageTier): UsageTier {
    switch (currentTier) {
      case UsageTier.STARTER: return UsageTier.STARTER; // Already lowest
      case UsageTier.DEVELOPER: return UsageTier.STARTER;
      case UsageTier.PROFESSIONAL: return UsageTier.DEVELOPER;
      case UsageTier.ENTERPRISE: return UsageTier.PROFESSIONAL;
      default: return UsageTier.STARTER;
    }
  }

  /**
   * Get tier comparison for user decision making
   */
  getTierComparison(): Array<{
    tier: UsageTier;
    config: TierConfig;
    monthlyCost: number; // Estimated at 50% usage
    valueScore: number; // Features vs price ratio
  }> {
    return Array.from(this.defaultTierConfig.tiers.values()).map(config => {
      const estimatedMonthlyRequests = config.requestLimit === -1 ? 50000 : config.requestLimit * 0.5;
      const monthlyCost = estimatedMonthlyRequests * config.basePricePerRequest;
      
      // Simple value score based on features and price
      const featureScore = config.features.length;
      const priceScore = monthlyCost > 0 ? 1000 / monthlyCost : 1000; // Inverse price relationship
      const valueScore = featureScore * priceScore;

      return {
        tier: config.tier,
        config,
        monthlyCost,
        valueScore,
      };
    }).sort((a, b) => b.valueScore - a.valueScore);
  }
}
