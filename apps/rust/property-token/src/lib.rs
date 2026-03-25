pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, StdError> {
    match msg {
        ExecuteMsg::SetMetadata { token_id, metadata } => {
            execute_set_metadata(deps, env, info, token_id, metadata)
        }
        ExecuteMsg::UpdateMetadata { token_id, metadata } => {
            execute_update_metadata(deps, env, info, token_id, metadata)
        }
        ExecuteMsg::Batch { msgs } => execute_batch(deps, env, info, msgs),
    }
}