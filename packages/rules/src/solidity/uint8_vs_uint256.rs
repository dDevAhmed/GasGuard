use crate::rule_engine::{Rule, RuleViolation};
use syn::Item;

pub struct Uint8VsUint256Rule;

impl Rule for Uint8VsUint256Rule {
    fn name(&self) -> &str {
        "uint8-vs-uint256"
    }

    fn description(&self) -> &str {
        "Using uint8 outside structs is often more gas-expensive than uint256 on EVM chains."
    }

    fn check(&self, _ast: &[Item]) -> Vec<RuleViolation> {
        // This rule applies to Solidity/EVM contracts, not Rust AST.
        // Detection is handled at the Solidity source level.
        Vec::new()
    }
}
