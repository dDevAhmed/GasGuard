#[cw_serde]
pub enum ExecuteMsg {
    SetMetadata {
        token_id: String,
        metadata: PropertyMetadata,
    },
    UpdateMetadata {
        token_id: String,
        metadata: PropertyMetadata,
    },

    Batch {
        msgs: Vec<BatchMsg>,
    },
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