//! Memory optimization rules for Soroban smart contracts.
//!
//! This module contains rules that detect inefficient memory usage patterns,
//! including unnecessary `Bytes` allocations that increase execution overhead.

pub mod inefficient_bytes_allocation;

pub use inefficient_bytes_allocation::InefficientBytesAllocationRule;
