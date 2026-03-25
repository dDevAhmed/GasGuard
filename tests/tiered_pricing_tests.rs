use gasguard_engine::{TieredScanner, UserUsage, UsageTier};

#[test]
fn test_starter_tier_thresholds() {
    let scanner = TieredScanner::new();
    
    // Test within starter tier limits
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Starter,
        current_month_requests: 500,
        monthly_usage: vec![],
        average_requests_per_month: 500.0,
        peak_requests_per_month: 500,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(validation.is_valid);
    assert!(validation.can_proceed);
    assert_eq!(validation.suggested_action, gasguard_engine::SuggestedAction::Continue);
}

#[test]
fn test_starter_tier_exceeded() {
    let scanner = TieredScanner::new();
    
    // Test exceeding starter tier limits
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Starter,
        current_month_requests: 1500, // Exceeds 1000 limit
        monthly_usage: vec![],
        average_requests_per_month: 1500.0,
        peak_requests_per_month: 1500,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(!validation.is_valid);
    assert!(!validation.can_proceed);
    assert_eq!(validation.suggested_action, gasguard_engine::SuggestedAction::Upgrade);
    assert_eq!(validation.next_available_tier, Some(UsageTier::Developer));
}

#[test]
fn test_developer_tier_thresholds() {
    let scanner = TieredScanner::new();
    
    // Test within developer tier limits
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Developer,
        current_month_requests: 5000,
        monthly_usage: vec![],
        average_requests_per_month: 5000.0,
        peak_requests_per_month: 5000,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(validation.is_valid);
    assert!(validation.can_proceed);
}

#[test]
fn test_developer_tier_exceeded() {
    let scanner = TieredScanner::new();
    
    // Test exceeding developer tier limits
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Developer,
        current_month_requests: 15000, // Exceeds 10,000 limit
        monthly_usage: vec![],
        average_requests_per_month: 15000.0,
        peak_requests_per_month: 15000,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(!validation.is_valid);
    assert!(!validation.can_proceed);
    assert_eq!(validation.suggested_action, gasguard_engine::SuggestedAction::Upgrade);
    assert_eq!(validation.next_available_tier, Some(UsageTier::Professional));
}

#[test]
fn test_professional_tier_thresholds() {
    let scanner = TieredScanner::new();
    
    // Test within professional tier limits
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Professional,
        current_month_requests: 50000,
        monthly_usage: vec![],
        average_requests_per_month: 50000.0,
        peak_requests_per_month: 50000,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(validation.is_valid);
    assert!(validation.can_proceed);
}

#[test]
fn test_professional_tier_exceeded() {
    let scanner = TieredScanner::new();
    
    // Test exceeding professional tier limits
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Professional,
        current_month_requests: 150000, // Exceeds 100,000 limit
        monthly_usage: vec![],
        average_requests_per_month: 150000.0,
        peak_requests_per_month: 150000,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(!validation.is_valid);
    assert!(!validation.can_proceed);
    assert_eq!(validation.suggested_action, gasguard_engine::SuggestedAction::Upgrade);
    assert_eq!(validation.next_available_tier, Some(UsageTier::Enterprise));
}

#[test]
fn test_enterprise_tier_unlimited() {
    let scanner = TieredScanner::new();
    
    // Test enterprise tier with very high usage
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Enterprise,
        current_month_requests: 1000000, // 1 million requests
        monthly_usage: vec![],
        average_requests_per_month: 1000000.0,
        peak_requests_per_month: 1000000,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(validation.is_valid);
    assert!(validation.can_proceed);
    assert_eq!(validation.suggested_action, gasguard_engine::SuggestedAction::Continue);
}

#[test]
fn test_tier_recommendations() {
    let scanner = TieredScanner::new();
    
    // Test tier recommendations based on usage
    assert_eq!(scanner.get_recommended_tier(500), UsageTier::Starter);
    assert_eq!(scanner.get_recommended_tier(1500), UsageTier::Developer);
    assert_eq!(scanner.get_recommended_tier(15000), UsageTier::Professional);
    assert_eq!(scanner.get_recommended_tier(150000), UsageTier::Enterprise);
}

#[test]
fn test_upgrade_savings() {
    let scanner = TieredScanner::new();
    
    let base_cost = 0.00001; // Base cost per scan
    
    // Test savings from starter to developer
    let savings = scanner.calculate_upgrade_savings(
        &UsageTier::Starter,
        &UsageTier::Developer,
        base_cost,
    );
    assert!(savings > 0.0); // Should have savings
    
    // Test savings from developer to professional
    let savings = scanner.calculate_upgrade_savings(
        &UsageTier::Developer,
        &UsageTier::Professional,
        base_cost,
    );
    assert!(savings > 0.0); // Should have savings
    
    // Test no savings for same tier
    let savings = scanner.calculate_upgrade_savings(
        &UsageTier::Developer,
        &UsageTier::Developer,
        base_cost,
    );
    assert_eq!(savings, 0.0); // No savings for same tier
}

#[test]
fn test_tiered_scan_with_discount() {
    let scanner = TieredScanner::new();
    let contract_code = r#"
#[contracttype]
pub struct TestContract {
    pub used_var: u64,
    pub unused_var: String,
}
"#;
    
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Professional, // 40% discount
        current_month_requests: 5000,
        monthly_usage: vec![],
        average_requests_per_month: 5000.0,
        peak_requests_per_month: 5000,
    };
    
    let result = scanner.scan_with_tier(
        contract_code,
        "test.rs".to_string(),
        &user_usage,
    ).unwrap();
    
    assert_eq!(result.applied_tier, UsageTier::Professional);
    assert_eq!(result.tier_discount, 40.0);
    assert!(result.final_price_per_request < 0.00001); // Should be discounted
}

#[test]
fn test_approaching_limit_warning() {
    let scanner = TieredScanner::new();
    
    // Test user approaching 95% of starter tier limit
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Starter,
        current_month_requests: 950, // 95% of 1000 limit
        monthly_usage: vec![],
        average_requests_per_month: 950.0,
        peak_requests_per_month: 950,
    };
    
    let validation = scanner.validate_tier_access(&user_usage);
    assert!(validation.is_valid);
    assert!(validation.can_proceed);
    assert!(validation.message.contains("Warning"));
    assert_eq!(validation.suggested_action, gasguard_engine::SuggestedAction::Upgrade);
}

#[test]
fn test_downgrade_warning_low_usage() {
    let scanner = TieredScanner::new();
    let contract_code = r#"
#[contracttype]
pub struct TestContract {
    pub used_var: u64,
}
"#;
    
    // Test user with very low usage in high tier
    let user_usage = UserUsage {
        user_id: "test-user".to_string(),
        current_tier: UsageTier::Professional,
        current_month_requests: 100, // Only 10% of professional tier
        monthly_usage: vec![],
        average_requests_per_month: 100.0,
        peak_requests_per_month: 100,
    };
    
    let result = scanner.scan_with_tier(
        contract_code,
        "test.rs".to_string(),
        &user_usage,
    ).unwrap();
    
    assert!(result.usage_percentage < 20.0);
    assert!(result.downgrade_warning.is_some());
    assert!(result.downgrade_warning.unwrap().contains("Consider downgrading"));
}

#[test]
fn test_tier_configurations() {
    let scanner = TieredScanner::new();
    
    // Test starter tier config
    let starter_config = scanner.get_tier_config(&UsageTier::Starter).unwrap();
    assert_eq!(starter_config.request_limit, 1000);
    assert_eq!(starter_config.discount_percentage, 0.0);
    assert_eq!(starter_config.rate_limit_per_minute, 10);
    assert!(!starter_config.priority_support);
    
    // Test developer tier config
    let developer_config = scanner.get_tier_config(&UsageTier::Developer).unwrap();
    assert_eq!(developer_config.request_limit, 10000);
    assert_eq!(developer_config.discount_percentage, 20.0);
    assert_eq!(developer_config.rate_limit_per_minute, 30);
    assert!(developer_config.priority_support);
    
    // Test professional tier config
    let professional_config = scanner.get_tier_config(&UsageTier::Professional).unwrap();
    assert_eq!(professional_config.request_limit, 100000);
    assert_eq!(professional_config.discount_percentage, 40.0);
    assert_eq!(professional_config.rate_limit_per_minute, 100);
    assert!(professional_config.priority_support);
    assert!(professional_config.custom_pricing);
    
    // Test enterprise tier config
    let enterprise_config = scanner.get_tier_config(&UsageTier::Enterprise).unwrap();
    assert_eq!(enterprise_config.request_limit, -1); // Unlimited
    assert_eq!(enterprise_config.discount_percentage, 60.0);
    assert_eq!(enterprise_config.rate_limit_per_minute, 1000);
    assert!(enterprise_config.priority_support);
    assert!(enterprise_config.custom_pricing);
}
