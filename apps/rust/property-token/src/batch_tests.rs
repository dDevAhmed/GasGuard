#[test]
fn test_batch_set_metadata() {
    let mut deps = mock_dependencies();

    let metadata = mock_metadata();

    let msgs = vec![
        BatchMsg::SetMetadata {
            token_id: "1".to_string(),
            metadata: metadata.clone(),
        },
        BatchMsg::SetMetadata {
            token_id: "2".to_string(),
            metadata,
        },
    ];

    let res = execute_batch(
        deps.as_mut(),
        mock_env(),
        mock_info("owner", &[]),
        msgs,
    );

    assert!(res.is_ok());
}