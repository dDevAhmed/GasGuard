import { Test, TestingModule } from '@nestjs/testing';
import { TieredPricingService } from '../services/tiered-pricing.service';
import { UsageTier, UserUsage } from '../interfaces/tiered-pricing.interface';
import { DynamicGasEstimate } from '../interfaces/gas-price.interface';

describe('TieredPricingService', () => {
  let service: TieredPricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TieredPricingService],
    }).compile();

    service = module.get<TieredPricingService>(TieredPricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTierConfig', () => {
    it('should return starter tier config', () => {
      const config = service.getTierConfig(UsageTier.STARTER);
      expect(config).toBeDefined();
      expect(config?.tier).toBe(UsageTier.STARTER);
      expect(config?.requestLimit).toBe(1000);
      expect(config?.discountPercentage).toBe(0);
    });

    it('should return developer tier config', () => {
      const config = service.getTierConfig(UsageTier.DEVELOPER);
      expect(config).toBeDefined();
      expect(config?.tier).toBe(UsageTier.DEVELOPER);
      expect(config?.requestLimit).toBe(10000);
      expect(config?.discountPercentage).toBe(20);
    });

    it('should return professional tier config', () => {
      const config = service.getTierConfig(UsageTier.PROFESSIONAL);
      expect(config).toBeDefined();
      expect(config?.tier).toBe(UsageTier.PROFESSIONAL);
      expect(config?.requestLimit).toBe(100000);
      expect(config?.discountPercentage).toBe(40);
    });

    it('should return enterprise tier config', () => {
      const config = service.getTierConfig(UsageTier.ENTERPRISE);
      expect(config).toBeDefined();
      expect(config?.tier).toBe(UsageTier.ENTERPRISE);
      expect(config?.requestLimit).toBe(-1); // Unlimited
      expect(config?.discountPercentage).toBe(60);
    });
  });

  describe('getRecommendedTier', () => {
    it('should recommend starter tier for low usage', () => {
      const tier = service.getRecommendedTier(500);
      expect(tier).toBe(UsageTier.STARTER);
    });

    it('should recommend developer tier for medium usage', () => {
      const tier = service.getRecommendedTier(5000);
      expect(tier).toBe(UsageTier.DEVELOPER);
    });

    it('should recommend professional tier for high usage', () => {
      const tier = service.getRecommendedTier(50000);
      expect(tier).toBe(UsageTier.PROFESSIONAL);
    });

    it('should recommend enterprise tier for very high usage', () => {
      const tier = service.getRecommendedTier(500000);
      expect(tier).toBe(UsageTier.ENTERPRISE);
    });
  });

  describe('validateTierAccess', () => {
    it('should allow access within tier limits', () => {
      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.DEVELOPER,
        currentMonthRequests: 5000,
        monthlyUsage: [],
        averageRequestsPerMonth: 5000,
        peakRequestsPerMonth: 5000,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const validation = service.validateTierAccess(userUsage);
      expect(validation.isValid).toBe(true);
      expect(validation.canProceed).toBe(true);
      expect(validation.suggestedAction).toBe('continue');
    });

    it('should block access when exceeding tier limits', () => {
      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.STARTER,
        currentMonthRequests: 1500, // Exceeds 1000 limit
        monthlyUsage: [],
        averageRequestsPerMonth: 1500,
        peakRequestsPerMonth: 1500,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const validation = service.validateTierAccess(userUsage);
      expect(validation.isValid).toBe(false);
      expect(validation.canProceed).toBe(false);
      expect(validation.suggestedAction).toBe('upgrade');
      expect(validation.nextAvailableTier).toBe(UsageTier.DEVELOPER);
    });

    it('should warn when approaching tier limits', () => {
      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.STARTER,
        currentMonthRequests: 950, // 95% of limit
        monthlyUsage: [],
        averageRequestsPerMonth: 950,
        peakRequestsPerMonth: 950,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const validation = service.validateTierAccess(userUsage);
      expect(validation.isValid).toBe(true);
      expect(validation.canProceed).toBe(true);
      expect(validation.suggestedAction).toBe('upgrade');
      expect(validation.message).toContain('Warning');
    });
  });

  describe('calculateTieredPrice', () => {
    it('should apply starter tier pricing (no discount)', async () => {
      const baseEstimate: DynamicGasEstimate = {
        chainId: 'stellar',
        estimatedGasUnits: 1000000,
        baseGasPrice: 100,
        surgeMultiplier: 1.0,
        dynamicGasPrice: 115,
        totalEstimatedCostStroops: 115000000,
        totalEstimatedCostXLM: 0.0115,
        priceValidityDurationMs: 60000,
        expiresAt: new Date(),
        recommendedPriority: 'normal',
      };

      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.STARTER,
        currentMonthRequests: 500,
        monthlyUsage: [],
        averageRequestsPerMonth: 500,
        peakRequestsPerMonth: 500,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const result = await service.calculateTieredPrice(baseEstimate, userUsage);
      
      expect(result.appliedTier).toBe(UsageTier.STARTER);
      expect(result.tierDiscount).toBe(0);
      expect(result.finalPricePerRequest).toBe(baseEstimate.totalEstimatedCostXLM);
      expect(result.totalCostWithTier).toBe(baseEstimate.totalEstimatedCostXLM);
    });

    it('should apply developer tier discount (20%)', async () => {
      const baseEstimate: DynamicGasEstimate = {
        chainId: 'stellar',
        estimatedGasUnits: 1000000,
        baseGasPrice: 100,
        surgeMultiplier: 1.0,
        dynamicGasPrice: 115,
        totalEstimatedCostStroops: 115000000,
        totalEstimatedCostXLM: 0.0115,
        priceValidityDurationMs: 60000,
        expiresAt: new Date(),
        recommendedPriority: 'normal',
      };

      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.DEVELOPER,
        currentMonthRequests: 5000,
        monthlyUsage: [],
        averageRequestsPerMonth: 5000,
        peakRequestsPerMonth: 5000,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const result = await service.calculateTieredPrice(baseEstimate, userUsage);
      
      expect(result.appliedTier).toBe(UsageTier.DEVELOPER);
      expect(result.tierDiscount).toBe(20);
      expect(result.finalPricePerRequest).toBe(0.0115 * 0.8); // 20% discount
      expect(result.totalCostWithTier).toBe(0.0115 * 0.8);
    });

    it('should suggest upgrade for high usage', async () => {
      const baseEstimate: DynamicGasEstimate = {
        chainId: 'stellar',
        estimatedGasUnits: 1000000,
        baseGasPrice: 100,
        surgeMultiplier: 1.0,
        dynamicGasPrice: 115,
        totalEstimatedCostStroops: 115000000,
        totalEstimatedCostXLM: 0.0115,
        priceValidityDurationMs: 60000,
        expiresAt: new Date(),
        recommendedPriority: 'normal',
      };

      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.STARTER,
        currentMonthRequests: 1500, // Exceeds starter limit
        monthlyUsage: [],
        averageRequestsPerMonth: 1500,
        peakRequestsPerMonth: 1500,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const result = await service.calculateTieredPrice(baseEstimate, userUsage);
      
      expect(result.recommendedTier).toBe(UsageTier.DEVELOPER);
      expect(result.upgradeSavings).toBeGreaterThan(0);
    });

    it('should suggest downgrade for low usage', async () => {
      const baseEstimate: DynamicGasEstimate = {
        chainId: 'stellar',
        estimatedGasUnits: 1000000,
        baseGasPrice: 100,
        surgeMultiplier: 1.0,
        dynamicGasPrice: 115,
        totalEstimatedCostStroops: 115000000,
        totalEstimatedCostXLM: 0.0115,
        priceValidityDurationMs: 60000,
        expiresAt: new Date(),
        recommendedPriority: 'normal',
      };

      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.PROFESSIONAL,
        currentMonthRequests: 100, // Very low usage
        monthlyUsage: [],
        averageRequestsPerMonth: 100,
        peakRequestsPerMonth: 100,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const result = await service.calculateTieredPrice(baseEstimate, userUsage);
      
      expect(result.downgradeWarning).toBeDefined();
      expect(result.downgradeWarning).toContain('Consider downgrading');
    });
  });

  describe('calculateUpgradeSavings', () => {
    it('should calculate savings for tier upgrade', () => {
      const currentTier = UsageTier.STARTER;
      const recommendedTier = UsageTier.DEVELOPER;
      const baseCost = 0.00001;

      const savings = service.calculateUpgradeSavings(currentTier, recommendedTier, baseCost);
      
      expect(savings).toBeGreaterThan(0);
      expect(savings).toBe(0.00001 * 0.2); // 20% of base cost
    });

    it('should return zero savings for same tier', () => {
      const currentTier = UsageTier.DEVELOPER;
      const recommendedTier = UsageTier.DEVELOPER;
      const baseCost = 0.00001;

      const savings = service.calculateUpgradeSavings(currentTier, recommendedTier, baseCost);
      
      expect(savings).toBe(0);
    });
  });

  describe('shouldAutoUpgrade', () => {
    it('should recommend auto-upgrade for consistent high usage', () => {
      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.STARTER,
        currentMonthRequests: 950, // 95% of limit
        monthlyUsage: [
          { month: '2024-01', requests: 950, tier: UsageTier.STARTER },
          { month: '2024-02', requests: 960, tier: UsageTier.STARTER },
          { month: '2024-03', requests: 970, tier: UsageTier.STARTER },
        ],
        averageRequestsPerMonth: 960,
        peakRequestsPerMonth: 970,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const shouldUpgrade = service.shouldAutoUpgrade(userUsage);
      expect(shouldUpgrade).toBe(true);
    });

    it('should not recommend auto-upgrade for low usage', () => {
      const userUsage: UserUsage = {
        userId: 'test-user',
        currentTier: UsageTier.DEVELOPER,
        currentMonthRequests: 1000,
        monthlyUsage: [
          { month: '2024-01', requests: 1000, tier: UsageTier.DEVELOPER },
          { month: '2024-02', requests: 1100, tier: UsageTier.DEVELOPER },
          { month: '2024-03', requests: 900, tier: UsageTier.DEVELOPER },
        ],
        averageRequestsPerMonth: 1000,
        peakRequestsPerMonth: 1100,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        tierHistory: [],
      };

      const shouldUpgrade = service.shouldAutoUpgrade(userUsage);
      expect(shouldUpgrade).toBe(false);
    });
  });

  describe('getTierComparison', () => {
    it('should return tier comparison with value scores', () => {
      const comparison = service.getTierComparison();
      
      // expect(comparison).toHaveLength(4); // 4 tiers
      expect(comparison[0].tier).toBe(UsageTier.ENTERPRISE); // Best value first
      expect(comparison[comparison.length - 1].tier).toBe(UsageTier.STARTER); // Lowest value last
      
      // Check that all have calculated values
      comparison.forEach(tier => {
        expect(tier.monthlyCost).toBeGreaterThanOrEqual(0);
        expect(tier.valueScore).toBeGreaterThan(0);
      });
    });
  });
});
