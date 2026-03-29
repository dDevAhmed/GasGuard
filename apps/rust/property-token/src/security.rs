use cosmwasm_std::{Env, MessageInfo, StdError, StdResult};
use crate::state::NEXT_NONCE;

pub fn prevent_replay(
    deps: &mut cosmwasm_std::DepsMut,
    env: &Env,
    info: &MessageInfo,
    nonce: u64,
    expires_at: Option<u64>,
) -> StdResult<()> {
    let sender = info.sender.as_str();

    // 1. Signature Expiration Validation (#54-2)
    if let Some(expiry) = expires_at {
        if env.block.time.seconds() > expiry {
            // Provide clear descriptive error for expiration
            return Err(StdError::generic_err("SignatureExpired: Meta-transaction signature has expired."));
        }
    }

    // 2. Sequential Nonce Validation (#54-1)
    let current_nonce = NEXT_NONCE.may_load(deps.storage, sender)?.unwrap_or(0);
    
    // Check if the received nonce is the next expected one
    if nonce < current_nonce {
        return Err(StdError::generic_err("ReplayDetected: Nonce already used."));
    }
    
    if nonce > current_nonce {
        return Err(StdError::generic_err("OutOfOrderTransaction: Received nonce higher than expected."));
    }

    // 3. Update Nonce
    NEXT_NONCE.save(deps.storage, sender, &(current_nonce + 1))?;

    Ok(())
}

pub fn ensure_authorized(
    deps: &cosmwasm_std::Deps,
    info: &MessageInfo,
) -> StdResult<()> {
    let sender = info.sender.as_str();
    let is_authorized = crate::state::AUTHORIZED_ROLES.may_load(deps.storage, sender)?.unwrap_or(false);
    let admin = crate::state::ADMIN.load(deps.storage)?;
    
    if sender != admin && !is_authorized {
        return Err(StdError::generic_err("Unauthorized: Role-based access control restriction."));
    }
    
    Ok(())
}