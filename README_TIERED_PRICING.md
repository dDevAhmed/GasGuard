# GasGuard Tiered Pricing - Quick Start Guide

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/MDTechLabs/GasGuard.git
cd GasGuard

# Build the project
cargo build --release

# The binary will be available at target/release/gasguard
```

### Basic Usage

```bash
# View available pricing tiers
./target/release/gasguard tiers

# Compare all tiers side-by-side
./target/release/gasguard tiers --comparison

# Get detailed information about a specific tier
./target/release/gasguard tiers --tier professional

# Scan a contract with tiered pricing
./target/release/gasguard tiered-scan contract.rs --tier developer --usage 5000

# Scan with JSON output for CI/CD integration
./target/release/gasguard tiered-scan contract.rs --tier enterprise --usage 50000 --format json
```

## 💰 Pricing Tiers Overview

| Tier | Monthly Limit | Price/Request | Discount | Best For |
|------|---------------|---------------|-----------|-----------|
| 🌱 Starter | 1,000 | 0.00001 XLM | 0% | Individual developers |
| 🚀 Developer | 10,000 | 0.000008 XLM | 20% | Growing projects |
| 💼 Professional | 100,000 | 0.000006 XLM | 40% | Production apps |
| 🏢 Enterprise | Unlimited | 0.000004 XLM | 60% | Large operations |

## 🎯 Key Features

### Smart Tier Recommendations
- Automatic tier suggestions based on usage patterns
- Upgrade/downgrade recommendations for cost optimization
- Real-time usage monitoring and alerts

### Flexible Pricing
- Pay-per-request with volume discounts
- No long-term commitments
- Prorated billing for tier changes

### Advanced Analytics
- Usage trend analysis
- Cost optimization insights
- Historical data access (tier-dependent)

## 📊 Example Outputs

### Tier Comparison
```bash
$ gasguard tiers --comparison

📊 Tier Comparison
==================
Tier            Limit        Price/Request   Discount  Features
----------------------------------------------------------------------
Starter         1,000        0.00001000 XLM  0.0%      4
Developer       10,000       0.00000800 XLM  20.0%     6
Professional    100,000      0.00000600 XLM  40.0%     8
Enterprise      Unlimited     0.00000400 XLM  60.0%     9
```

### Tiered Scan Results
```bash
$ gasguard tiered-scan contract.rs --tier professional --usage 5000

🔍 Scanning file with tiered pricing: "contract.rs"

🎯 Tiered Scan Results
======================
File: contract.rs
Applied Tier: Professional
Tier Discount: 40.0%
Final Price: 0.00000600 XLM
Usage: 5000/100000 (5.0%)

⚠️  1 Warnings:
  [WARNING]
  📍 Line 8: unused_var
  📝 State variable 'unused_var' is declared but never used in contract 'TestContract'.
  💡 Consider removing the unused state variable 'unused_var'.

💰 Storage Optimization Potential:
   • 1 unused state variables
   • 2.5 KB storage savings
   • 0.0025 XLM/month ledger rent savings
```

### JSON Output for CI/CD
```json
{
  "base_result": {
    "source": "contract.rs",
    "violations": [
      {
        "rule_name": "unused-state-variables",
        "variable_name": "unused_var",
        "line_number": 8,
        "severity": "Warning"
      }
    ]
  },
  "applied_tier": "Professional",
  "tier_discount": 40.0,
  "final_price_per_request": 0.000006,
  "total_cost_with_tier": 0.000006,
  "current_usage": 5000,
  "remaining_requests": 95000,
  "usage_percentage": 5.0
}
```

## 🔧 Integration Examples

### GitHub Actions
```yaml
name: GasGuard Analysis
on: [push, pull_request]

jobs:
  gasguard:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Run GasGuard with Tiered Pricing
      run: |
        ./gasguard tiered-scan contracts/ \
          --tier developer \
          --usage 5000 \
          --format json > gasguard-report.json
    - name: Upload Report
      uses: actions/upload-artifact@v2
      with:
        name: gasguard-report
        path: gasguard-report.json
```

### Node.js Integration
```javascript
const { execSync } = require('child_process');

function scanWithTier(contractPath, tier, usage) {
  const result = execSync(
    `./gasguard tiered-scan ${contractPath} --tier ${tier} --usage ${usage} --format json`,
    { encoding: 'utf8' }
  );
  
  const scanResult = JSON.parse(result);
  console.log(`Scan completed with ${scanResult.applied_tier} tier`);
  console.log(`Discount applied: ${scanResult.tier_discount}%`);
  console.log(`Final cost: ${scanResult.final_price_per_request} XLM`);
  
  return scanResult;
}

// Usage
const result = scanWithTier('contract.rs', 'professional', 5000);
```

### Python Integration
```python
import subprocess
import json

def scan_with_tier(contract_path, tier, usage):
    result = subprocess.run([
        './gasguard', 'tiered-scan', contract_path,
        '--tier', tier,
        '--usage', str(usage),
        '--format', 'json'
    ], capture_output=True, text=True)
    
    scan_result = json.loads(result.stdout)
    print(f"Scan completed with {scan_result['applied_tier']} tier")
    print(f"Discount applied: {scan_result['tier_discount']}%")
    print(f"Final cost: {scan_result['final_price_per_request']} XLM")
    
    return scan_result

# Usage
result = scan_with_tier('contract.rs', 'professional', 5000)
```

## 📈 Cost Optimization Tips

### 1. Choose the Right Tier
- Start with the tier that matches your expected usage
- Monitor usage patterns for the first month
- Adjust tiers based on actual usage

### 2. Batch Your Scans
- Combine multiple contracts into single requests when possible
- Schedule scans during off-peak hours
- Use caching to avoid duplicate scans

### 3. Monitor Usage
- Set up alerts for 80% and 90% usage thresholds
- Review monthly usage reports
- Consider auto-upgrade for consistent high usage

### 4. Optimize Contracts
- Fix unused state variables to reduce storage costs
- Use efficient data structures
- Implement lazy loading patterns

## 🚨 Usage Limits and Alerts

### Warning Thresholds
- **80% Usage**: Email notification
- **90% Usage**: SMS and email notification
- **100% Usage**: Request blocking with upgrade options

### Automatic Actions
- **Auto-upgrade**: Enabled by default for consistent high usage
- **Downgrade suggestions**: Sent for low usage patterns
- **Grace periods**: 7 days for manual tier changes

## 📞 Support

- **Documentation**: [Full Documentation](docs/TIERED_PRICING_SYSTEM.md)
- **API Reference**: [API Docs](docs/API_REFERENCE.md)
- **Issues**: [GitHub Issues](https://github.com/MDTechLabs/GasGuard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MDTechLabs/GasGuard/discussions)

## 🆙 Upgrading from Flat Pricing

### Migration Steps
1. **Analyze Current Usage**: Check your average monthly requests
2. **Select Appropriate Tier**: Use the tier comparison tool
3. **Update Integration**: Modify API calls to include tier information
4. **Test Thoroughly**: Verify functionality with new pricing
5. **Monitor Closely**: Watch usage and costs after migration

### Benefits of Tiered Pricing
- **Cost Savings**: Volume discounts for higher usage
- **Predictable Costs**: Clear monthly limits and pricing
- **Better Features**: Enhanced functionality at higher tiers
- **Scalability**: Automatic scaling with your needs

## 🔮 Future Enhancements

- **Custom Tiers**: Bespoke pricing for enterprise customers
- **Usage Predictions**: ML-powered usage forecasting
- **Advanced Analytics**: More detailed insights and recommendations
- **Multi-currency Support**: Payment in various cryptocurrencies
- **Team Management**: Multi-user account management

---

**Ready to get started?** Choose your tier and begin optimizing your Stellar contracts today!
