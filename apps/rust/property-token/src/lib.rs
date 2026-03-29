pub mod msg;
pub mod state;
pub mod security;

use cosmwasm_std::{
    attr, entry_point, DepsMut, Env, MessageInfo, Response, StdError, StdResult, Uint128, BankMsg, Coin,
};
use crate::msg::{Auth, BatchMsg, ExecuteMsg, PropertyMetadata, TreasuryAction};
use crate::state::{ADMIN, AUTHORIZED_ROLES, FEE_BALANCES, METADATA, TREASURY_BALANCE};
use crate::security::{ensure_authorized, prevent_replay};

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    ADMIN.save(deps.storage, &msg.admin.unwrap_or_else(|| info.sender.to_string()))?;
    TREASURY_BALANCE.save(deps.storage, &Uint128::zero())?;
    
    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("admin", msg.admin.unwrap_or_else(|| info.sender.to_string())))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    match msg {
        ExecuteMsg::SetMetadata { token_id, metadata, auth } => {
            execute_set_metadata(deps, env, info, token_id, metadata, auth)
        }
        ExecuteMsg::UpdateMetadata { token_id, metadata, auth } => {
            execute_update_metadata(deps, env, info, token_id, metadata, auth)
        }
        ExecuteMsg::Batch { msgs, auth } => execute_batch(deps, env, info, msgs, auth),
        ExecuteMsg::WithdrawFees { recipient, amount, token } => {
            execute_withdraw_fees(deps, env, info, recipient, amount, token)
        }
        ExecuteMsg::TreasuryAction { action } => execute_treasury_action(deps, env, info, action),
        ExecuteMsg::UpdateConfig { new_admin, authorized_roles } => {
            execute_update_config(deps, env, info, new_admin, authorized_roles)
        }
    }
}

pub fn execute_set_metadata(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    metadata: PropertyMetadata,
    auth: Auth,
) -> StdResult<Response> {
    // 🔒 Security: Replay protection with strict sequence check
    prevent_replay(&mut deps, &env, &info, auth.nonce, auth.expires_at)?;

    // State update
    METADATA.save(deps.storage, &token_id, &metadata)?;

    // 🏷️ Accurate Event Emission
    Ok(Response::new()
        .add_attribute("action", "set_metadata")
        .add_attribute("token_id", &token_id)
        .add_attribute("caller", &info.sender))
}

pub fn execute_update_metadata(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    metadata: PropertyMetadata,
    auth: Auth,
) -> StdResult<Response> {
    // 🔒 Security: Replay protection
    prevent_replay(&mut deps, &env, &info, auth.nonce, auth.expires_at)?;

    // Ensure metadata exists
    if !METADATA.has(deps.storage, &token_id) {
        return Err(StdError::generic_err("Property metadata not found"));
    }

    // State update
    METADATA.save(deps.storage, &token_id, &metadata)?;

    // 🏷️ Accurate Event Emission
    Ok(Response::new()
        .add_attribute("action", "update_metadata")
        .add_attribute("token_id", &token_id)
        .add_attribute("caller", &info.sender))
}

pub fn execute_batch(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msgs: Vec<BatchMsg>,
    auth: Auth,
) -> StdResult<Response> {
    // 🔒 Security: Replay protection for the entire batch
    prevent_replay(&mut deps, &env, &info, auth.nonce, auth.expires_at)?;

    let mut response = Response::new().add_attribute("action", "execute_batch");

    for (idx, msg) in msgs.into_iter().enumerate() {
        match msg {
            BatchMsg::SetMetadata { token_id, metadata } => {
                METADATA.save(deps.storage, &token_id, &metadata)?;
                response = response.add_attribute(format!("batch_event_{}", idx), format!("set_metadata_{}", token_id));
            }
            BatchMsg::UpdateMetadata { token_id, metadata } => {
                if !METADATA.has(deps.storage, &token_id) {
                    return Err(StdError::generic_err(format!("Property {} not found in batch", token_id)));
                }
                METADATA.save(deps.storage, &token_id, &metadata)?;
                response = response.add_attribute(format!("batch_event_{}", idx), format!("update_metadata_{}", token_id));
            }
        }
    }

    Ok(response)
}

pub fn execute_withdraw_fees(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    recipient: String,
    amount: Uint128,
    token: String,
) -> StdResult<Response> {
    // 🔒 RBAC Check (#138)
    ensure_authorized(&deps.as_ref(), &info)?;

    // Validate fee balance
    let current_balance = FEE_BALANCES.may_load(deps.storage, &token)?.unwrap_or_default();
    if amount > current_balance {
        return Err(StdError::generic_err(format!(
            "InsufficientFeeBalance: Available: {}, Requested: {}",
            current_balance, amount
        )));
    }

    // ⚡ Internal state update BEFORE external transfer (Checks-Effects-Interactions)
    let new_balance = current_balance.checked_sub(amount).map_err(|e| StdError::generic_err(e.to_string()))?;
    FEE_BALANCES.save(deps.storage, &token, &new_balance)?;

    // Prepare transfer message
    let bank_msg = BankMsg::Send {
        to_address: recipient.clone(),
        amount: vec![Coin { denom: token.clone(), amount }],
    };

    // 🏷️ Proper Audit Event Emission
    Ok(Response::new()
        .add_message(bank_msg)
        .add_attribute("action", "withdraw_fees")
        .add_attribute("recipient", recipient)
        .add_attribute("amount", amount)
        .add_attribute("token", token))
}

pub fn execute_treasury_action(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    action: TreasuryAction,
) -> StdResult<Response> {
    // 🔒 RBAC Check (#139)
    ensure_authorized(&deps.as_ref(), &info)?;

    match action {
        TreasuryAction::Deposit { amount } => {
            let current = TREASURY_BALANCE.load(deps.storage).unwrap_or_default();
            TREASURY_BALANCE.save(deps.storage, &(current + amount))?;
            
            Ok(Response::new()
                .add_attribute("action", "treasury_deposit")
                .add_attribute("amount", amount))
        }
        TreasuryAction::Withdraw { amount, recipient } | TreasuryAction::Transfer { amount, recipient } => {
            let current = TREASURY_BALANCE.load(deps.storage).unwrap_or_default();
            
            if amount > current {
                return Err(StdError::generic_err("TreasuryOverdraw: Insufficient funds in treasury vault."));
            }
            
            // State update FIRST
            TREASURY_BALANCE.save(deps.storage, &(current - amount))?;
            
            // Transfer logic
            let msg = BankMsg::Send {
                to_address: recipient.clone(),
                amount: vec![Coin { denom: "stablecoin".to_string(), amount }], // Usually would be configurable
            };
            
            Ok(Response::new()
                .add_message(msg)
                .add_attribute("action", "treasury_outflow")
                .add_attribute("type", "withdrawal/transfer")
                .add_attribute("recipient", recipient)
                .add_attribute("amount", amount))
        }
    }
}

pub fn execute_update_config(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    new_admin: Option<String>,
    authorized_roles: Option<Vec<(String, bool)>>,
) -> StdResult<Response> {
    let admin = ADMIN.load(deps.storage)?;
    if info.sender.as_str() != admin {
        return Err(StdError::generic_err("Only the current admin can update config"));
    }

    if let Some(addr) = new_admin {
        ADMIN.save(deps.storage, &addr)?;
    }

    if let Some(roles) = authorized_roles {
        for (addr, is_auth) in roles {
            AUTHORIZED_ROLES.save(deps.storage, &addr, &is_auth)?;
        }
    }

    Ok(Response::new().add_attribute("action", "update_config"))
}