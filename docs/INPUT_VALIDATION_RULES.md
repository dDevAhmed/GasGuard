# Input Validation Rules

This document outlines the validation rules implemented across the GasGuard API for all external inputs.

## Overview

The GasGuard API implements comprehensive input validation to prevent invalid data from breaking application logic. Validation is applied at multiple layers:

1. **Base Validation Layer** - Common validation utilities
2. **Endpoint-Specific Validators** - Express middleware for analysis endpoints
3. **Controller Validation** - Inline validation in NestJS controllers

## Base Validation Rules

### Address Validation

**Ethereum Addresses:**
- Format: `0x` followed by 40 hexadecimal characters
- Regex: `/^0x[a-fA-F0-9]{40}$/`
- Example: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`

**Stellar Addresses:**
- Format: `G` or `C` followed by 55 alphanumeric characters
- Regex: `/^[GC][A-Z0-9]{55}$/`
- Example: `GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ`

**Chain-Specific Validation:**
- EVM chains (1, 56, 137, 42161, 10, 43114, 250): Ethereum address format
- Stellar/Soroban (chain 0): Stellar address format
- Unknown chains: Default to Ethereum format

### Amount Validation

**Gas Limits:**
- Minimum: 21,000 (base transaction gas)
- Maximum: 30,000,000 (30M gas)
- Type: Integer or string that parses to integer

**Gas Prices:**
- Minimum: 1,000,000,000 wei (1 gwei)
- Maximum: 1,000,000,000,000 wei (1000 gwei)
- Type: Integer or string that parses to integer

### Chain ID Validation

**Supported Chains:**
- 1: Ethereum
- 56: Binance Smart Chain
- 137: Polygon
- 42161: Arbitrum One
- 10: Optimism
- 43114: Avalanche C-Chain
- 250: Fantom

### Transaction Type Validation

**Supported Types:**
- `transfer`
- `contract-call`
- `swap`

### URL Validation

**Supported Protocols:**
- `http:`
- `https:`
- `git:`

**Validation:** Uses native URL constructor with protocol checking

### Timestamp Validation

**Format:** ISO 8601 with timezone
- Example: `2024-01-01T00:00:00.000Z`
- Validation: Parses successfully and matches original string

## Endpoint-Specific Validation

### Analysis Submission (`POST /analysis`)

**Project Information:**
- `name`: Required, string, max 100 characters
- `description`: Optional, string
- `repositoryUrl`: Optional, valid URL format
- `commitHash`: Optional, string
- `version`: Optional, string

**Files:**
- At least 1 file required
- Maximum 100 files
- Total size limit: 50MB
- Individual file size limit: 10MB

**File Properties:**
- `path`: Required, non-empty string
- `content`: Required, non-empty string
- `language`: Required, one of: `rust`, `typescript`, `javascript`, `solidity`, `soroban`
- `size`: Required, number
- `lastModified`: Optional, string

**Options:**
- `scanType`: Optional, one of: `security`, `performance`, `gas-optimization`, `full`
- `severity`: Optional, one of: `low`, `medium`, `high`, `critical`
- `includeRecommendations`: Optional, boolean
- `excludePatterns`: Optional, string array

**Metadata:**
- `framework`: Optional, one of: `soroban`, `solidity`, `general`
- `version`: Optional, string
- `dependencies`: Optional, object
- `buildSystem`: Optional, one of: `cargo`, `npm`, `yarn`, `hardhat`
- `network`: Optional, one of: `stellar`, `ethereum`, `polygon`, `bsc`

**Soroban-Specific Validation:**
- At least one Rust file required
- `Cargo.toml` must be present
- Must include `soroban-sdk` or `stellar-sdk` dependency
- Contract implementation required (`#[contractimpl]`, `soroban_sdk::contract`, etc.)

### Failed Transaction Analysis (`POST /failed-transactions/analyze`)

**Request Body:**
- `wallet`: Required, valid blockchain address
- `chainIds`: Optional, array of valid chain IDs
- `timeframe.start`: Optional, valid ISO timestamp
- `timeframe.end`: Optional, valid ISO timestamp
- `includeRecommendations`: Optional, boolean

**Validation Rules:**
- Start timestamp must be before end timestamp
- Chain IDs must be supported
- Wallet address must match appropriate format for chain

### Wallet Summary (`GET /failed-transactions/:wallet/summary`)

**Path Parameters:**
- `wallet`: Required, valid blockchain address

**Query Parameters:**
- `chainIds`: Optional, comma-separated list of valid chain IDs

### Cross-Chain Gas Comparison (`GET /v1/analytics/cross-chain-gas`)

**Query Parameters:**
- `txType`: Required, one of: `transfer`, `contract-call`, `swap`

### Gas History (`GET /v1/analytics/cross-chain-gas/history`)

**Query Parameters:**
- `chainId`: Required, valid supported chain ID
- `hours`: Optional, positive number ≤ 168 (1 week)

## Error Handling

### Validation Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "unique-request-id"
  },
  "validationErrors": [
    {
      "field": "fieldName",
      "message": "Human-readable error message",
      "value": "invalid-value",
      "constraint": "constraint-name"
    }
  ]
}
```

### HTTP Status Codes

- `400 Bad Request`: Validation failed
- `500 Internal Server Error`: Unexpected validation error

## Security Considerations

1. **Input Sanitization**: All string inputs are validated for format and length
2. **Type Safety**: Strict type checking prevents type confusion attacks
3. **Resource Limits**: File size and count limits prevent DoS attacks
4. **Address Validation**: Prevents invalid addresses from causing downstream errors
5. **Chain Isolation**: Chain-specific validation prevents cross-chain attacks

## Testing

Validation rules are tested with comprehensive unit tests covering:

- Valid input acceptance
- Invalid input rejection
- Edge cases and boundary conditions
- Error message accuracy
- Security boundary validation

Run tests with: `npm test`