# Tiered Pricing System

## Overview

GasGuard's tiered pricing system provides flexible usage-based pricing that scales with your needs. The system automatically applies discounts based on your usage tier and provides intelligent recommendations for optimal tier selection.

## Pricing Tiers

### 🌱 Starter Tier
**Perfect for individual developers and small projects**

- **Request Limit**: 1,000 requests/month
- **Price**: 0.00001 XLM per request
- **Discount**: 0% (base price)
- **Rate Limit**: 10 requests/minute
- **Features**:
  - Basic gas estimation
  - Standard priority support
  - Monthly usage reports
  - API access (1,000 requests/month)

### 🚀 Developer Tier
**Ideal for active developers and growing projects**

- **Request Limit**: 10,000 requests/month
- **Price**: 0.000008 XLM per request
- **Discount**: 20% off base price
- **Rate Limit**: 30 requests/minute
- **Features**:
  - Advanced gas estimation
  - Priority support
  - Real-time analytics
  - API access (10,000 requests/month)
  - Custom alerts
  - Historical data access (6 months)

### 💼 Professional Tier
**For professional teams and production applications**

- **Request Limit**: 100,000 requests/month
- **Price**: 0.000006 XLM per request
- **Discount**: 40% off base price
- **Rate Limit**: 100 requests/minute
- **Features**:
  - Premium gas estimation
  - 24/7 priority support
  - Advanced analytics dashboard
  - API access (100,000 requests/month)
  - Custom integrations
  - Historical data access (2 years)
  - Custom alerts and notifications
  - SLA guarantees

### 🏢 Enterprise Tier
**Custom solutions for large-scale operations**

- **Request Limit**: Unlimited
- **Price**: 0.000004 XLM per request
- **Discount**: 60% off base price
- **Rate Limit**: 1,000 requests/minute
- **Features**:
  - Enterprise-grade gas estimation
  - Dedicated support team
  - Custom analytics and reporting
  - Unlimited API access
  - White-label solutions
  - Unlimited historical data
  - Custom integrations and workflows
  - 99.9% SLA guarantee
  - Custom contracts and pricing

## Tier Comparison

| Tier | Requests/Month | Price/Request | Discount | Rate Limit | Priority Support |
|------|----------------|---------------|-----------|-------------|-----------------|
| Starter | 1,000 | 0.00001 XLM | 0% | 10/min | No |
| Developer | 10,000 | 0.000008 XLM | 20% | 30/min | Yes |
| Professional | 100,000 | 0.000006 XLM | 40% | 100/min | Yes |
| Enterprise | Unlimited | 0.000004 XLM | 60% | 1,000/min | Yes |

## Usage Thresholds

### Automatic Tier Recommendations

The system automatically recommends tier upgrades based on your usage patterns:

- **≤ 1,000 requests/month**: Starter tier
- **1,001 - 10,000 requests/month**: Developer tier
- **10,001 - 100,000 requests/month**: Professional tier
- **> 100,000 requests/month**: Enterprise tier

### Tier Limit Enforcement

- **90% Usage Warning**: When you reach 90% of your tier limit, you'll receive upgrade recommendations
- **100% Usage Block**: When you exceed your tier limit, further requests are blocked until upgrade
- **Auto-upgrade Eligibility**: Consistent usage >90% for 3+ months triggers auto-upgrade recommendations

### Downgrade Recommendations

- **< 20% Usage**: If you're using less than 20% of your tier limit, you'll receive downgrade suggestions to optimize costs

## API Integration

### CLI Usage

```bash
# View available tiers
gasguard tiers

# Compare all tiers
gasguard tiers --comparison

# Get specific tier details
gasguard tiers --tier developer

# Scan with tiered pricing
gasguard tiered-scan contract.rs --tier professional --usage 5000

# JSON output for CI/CD
gasguard tiered-scan contract.rs --tier enterprise --usage 50000 --format json
```

### REST API Endpoints

#### Get All Tiers
```http
GET /tiered-pricing/tiers
```

#### Get Tier Comparison
```http
GET /tiered-pricing/tiers/comparison
```

#### Get Tiered Estimate
```http
POST /tiered-pricing/estimate
Content-Type: application/json

{
  "chainId": "stellar",
  "gasUnits": 1000000,
  "userUsage": {
    "userId": "user123",
    "currentTier": "developer",
    "currentMonthRequests": 5000,
    "averageRequestsPerMonth": 5000,
    "peakRequestsPerMonth": 5000
  },
  "priority": "normal"
}
```

#### Validate Tier Access
```http
POST /tiered-pricing/validate
Content-Type: application/json

{
  "userUsage": {
    "userId": "user123",
    "currentTier": "starter",
    "currentMonthRequests": 950
  }
}
```

## Response Examples

### Tiered Estimate Response
```json
{
  "success": true,
  "data": {
    "baseEstimate": {
      "chainId": "stellar",
      "estimatedGasUnits": 1000000,
      "totalEstimatedCostXLM": 0.0115,
      "recommendedPriority": "normal"
    },
    "appliedTier": "developer",
    "tierDiscount": 20.0,
    "finalPricePerRequest": 0.0092,
    "totalCostWithTier": 0.0092,
    "currentUsage": 5000,
    "remainingRequests": 5000,
    "usagePercentage": 50.0,
    "recommendedTier": null,
    "upgradeSavings": null,
    "downgradeWarning": null
  }
}
```

### Tier Validation Response
```json
{
  "success": true,
  "data": {
    "validation": {
      "isValid": false,
      "currentTier": "starter",
      "canProceed": false,
      "message": "Monthly request limit exceeded (1000). Please upgrade to developer tier.",
      "suggestedAction": "upgrade",
      "nextAvailableTier": "developer"
    },
    "tierComparison": [...],
    "recommendedActions": [
      "Consider upgrading to developer tier for higher limits"
    ]
  }
}
```

## Cost Optimization Features

### Smart Recommendations

The system provides intelligent recommendations based on:

- **Current Usage Patterns**: Real-time analysis of your usage
- **Historical Trends**: 12-month usage history analysis
- **Cost Efficiency**: Price-to-feature ratio optimization
- **Seasonal Patterns**: Accounting for usage fluctuations

### Upgrade Savings Calculator

When considering an upgrade, the system calculates:

- **Immediate Savings**: Per-request cost reduction
- **Monthly Savings**: Based on average usage
- **Annual Savings**: Projected yearly savings
- **ROI Analysis**: Time to recover upgrade costs

### Usage Analytics

- **Real-time Monitoring**: Current month usage tracking
- **Trend Analysis**: Usage growth patterns
- **Peak Detection**: Identify usage spikes
- **Efficiency Metrics**: Cost per optimization found

## Billing and Proration

### Tier Changes

- **Upgrades**: Effective immediately with prorated billing
- **Downgrades**: Effective next billing cycle
- **Grace Period**: 7-day grace period for manual changes
- **Auto-upgrade**: Can be enabled/disabled in settings

### Billing Cycles

- **Monthly Billing**: Charged on the same day each month
- **Usage Tracking**: Real-time usage monitoring
- **Overage Protection**: Requests blocked at limit to prevent overage charges
- **Invoices**: Detailed usage breakdown and cost analysis

## Integration Examples

### Node.js SDK
```javascript
const { GasGuard } = require('@gasguard/sdk');

const gasguard = new GasGuard({
  apiKey: 'your-api-key',
  tier: 'professional'
});

// Scan with tiered pricing
const result = await gasguard.scanWithTier(contract, {
  currentTier: 'professional',
  currentMonthRequests: 5000,
  averageRequestsPerMonth: 5000
});

console.log(`Applied tier: ${result.appliedTier}`);
console.log(`Discount: ${result.tierDiscount}%`);
console.log(`Final price: ${result.finalPricePerRequest} XLM`);
```

### Python SDK
```python
from gasguard import GasGuard

gasguard = GasGuard(api_key='your-api-key', tier='professional')

# Scan with tiered pricing
result = gasguard.scan_with_tier(contract, {
    'current_tier': 'professional',
    'current_month_requests': 5000,
    'average_requests_per_month': 5000
})

print(f"Applied tier: {result.applied_tier}")
print(f"Discount: {result.tier_discount}%")
print(f"Final price: {result.final_price_per_request} XLM")
```

## Monitoring and Alerts

### Usage Alerts

- **80% Usage Warning**: Email notification
- **90% Usage Alert**: SMS and email notification
- **100% Usage Block**: Immediate notification with upgrade options

### Cost Alerts

- **Budget Thresholds**: Set monthly spending limits
- **Unusual Activity**: Alert on usage spikes
- **Tier Recommendations**: Proactive optimization suggestions

## Support and SLA

### Support Levels by Tier

| Tier | Support Response Time | Availability |
|------|---------------------|--------------|
| Starter | 48 hours | Business hours |
| Developer | 24 hours | Business hours |
| Professional | 4 hours | 24/7 |
| Enterprise | 1 hour | 24/7 (dedicated) |

### SLA Guarantees

- **Starter**: 99% uptime
- **Developer**: 99.5% uptime
- **Professional**: 99.9% uptime
- **Enterprise**: 99.95% uptime with financial penalties

## Migration Guide

### Upgrading Tiers

1. **Review Usage**: Check current usage patterns
2. **Compare Costs**: Use the savings calculator
3. **Plan Migration**: Schedule during low-usage periods
4. **Update Integration**: Modify API calls if needed
5. **Monitor Performance**: Track post-upgrade metrics

### Downgrading Tiers

1. **Analyze Usage**: Ensure reduced limits won't impact operations
2. **Backup Data**: Export historical data if needed
3. **Schedule Change**: Effective next billing cycle
4. **Update Alerts**: Adjust notification thresholds
5. **Monitor Closely**: Watch for limit approaches

## Best Practices

### Cost Optimization

1. **Choose Right Tier**: Start with the tier that matches your expected usage
2. **Monitor Usage**: Regularly review usage analytics
3. **Batch Requests**: Combine multiple scans when possible
4. **Cache Results**: Store scan results to avoid duplicate requests
5. **Schedule Smart**: Run scans during low-traffic periods

### Performance Optimization

1. **Rate Limiting**: Respect tier rate limits to avoid blocks
2. **Error Handling**: Implement proper error handling for limit exceeded
3. **Retry Logic**: Use exponential backoff for failed requests
4. **Async Processing**: Use async/await for better performance
5. **Connection Pooling**: Reuse connections for multiple requests

## Frequently Asked Questions

### Q: How are requests counted?
A: Each call to the scan API counts as one request, regardless of contract size or complexity.

### Q: What happens when I hit my limit?
A: You'll receive a warning at 90% usage. At 100%, further requests are blocked until you upgrade or wait for the next billing cycle.

### Q: Can I change tiers anytime?
A: Yes, upgrades are effective immediately with prorated billing. Downgrades take effect next billing cycle.

### Q: Is there a free tier?
A: We don't offer a free tier, but the Starter tier is very affordable for individual developers and small projects.

### Q: How accurate are the savings calculations?
A: Savings calculations are based on your actual usage patterns and current pricing, providing accurate estimates for decision making.

### Q: Can I get custom pricing?
A: Enterprise tier includes custom pricing options. Contact our sales team for large-scale requirements.

## Support

- **Documentation**: [docs.gasguard.dev](https://docs.gasguard.dev)
- **API Reference**: [api.gasguard.dev](https://api.gasguard.dev)
- **Support Email**: support@gasguard.dev
- **Status Page**: [status.gasguard.dev](https://status.gasguard.dev)
- **Community**: [GitHub Discussions](https://github.com/gasguard/discussions)
