use cosmwasm_schema::cw_serde;
use cosmwasm_std::Uint128;

#[cw_serde]
pub struct Auth {
    pub nonce: u64,
    pub expires_at: Option<u64>,
}

#[cw_serde]
pub struct InstantiateMsg {
    pub admin: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    SetMetadata {
        token_id: String,
        metadata: PropertyMetadata,
        auth: Auth,
    },
    UpdateMetadata {
        token_id: String,
        metadata: PropertyMetadata,
        auth: Auth,
    },
    Batch {
        msgs: Vec<BatchMsg>,
        auth: Auth,
    },
    
    // #138 Fee Withdrawal Security
    WithdrawFees {
        recipient: String,
        amount: Uint128,
        token: String,
    },
    
    // #139 Treasury Management Logic
    TreasuryAction {
        action: TreasuryAction,
    },
    
    // Role-based Access Control
    UpdateConfig {
        new_admin: Option<String>,
        authorized_roles: Option<Vec<(String, bool)>>,
    },
}

#[cw_serde]
pub enum TreasuryAction {
    Deposit { amount: Uint128 },
    Withdraw { amount: Uint128, recipient: String },
    Transfer { amount: Uint128, recipient: String },
}

#[cw_serde]
pub enum BatchMsg {
    SetMetadata {
        token_id: String,
        metadata: PropertyMetadata,
    },
    UpdateMetadata {
        token_id: String,
        metadata: PropertyMetadata,
    },
}

#[cw_serde]
pub struct PropertyMetadata {
    pub name: String,
    pub description: String,
    pub image_url: Option<String>,
}