#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

/// Helper to create a test token and mint to an address
fn create_token<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(env, &contract_address.address()),
        StellarAssetClient::new(env, &contract_address.address()),
    )
}

/// Helper to set initial ledger state with proper protocol version
fn setup_ledger(env: &Env) {
    env.ledger().set(LedgerInfo {
        timestamp: 1000, // Start at non-zero timestamp
        protocol_version: 25, // Use current protocol version
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10000,
    });
}

/// Helper to advance ledger time
fn advance_time(env: &Env, seconds: u64) {
    let current = env.ledger().timestamp();
    let current_seq = env.ledger().sequence();
    env.ledger().set(LedgerInfo {
        timestamp: current + seconds,
        protocol_version: 25,
        sequence_number: current_seq + 1,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 10000,
    });
}

#[test]
fn test_create_subscription() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let provider = Address::generate(&env);
    let admin = Address::generate(&env);

    // Create token
    let (token_client, _) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Create subscription: 100 tokens every 30 days (in seconds)
    let amount: i128 = 100_0000000; // 100 tokens with 7 decimals
    let interval: u64 = 30 * 24 * 60 * 60; // 30 days in seconds

    let subscription = client.create_subscription(
        &subscriber,
        &provider,
        &token_address,
        &amount,
        &interval,
    );

    // Verify subscription data
    assert_eq!(subscription.token, token_address);
    assert_eq!(subscription.amount, amount);
    assert_eq!(subscription.interval, interval);
    assert_eq!(subscription.last_payment, 0);
    assert!(subscription.is_active);
}

#[test]
fn test_process_payment() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let provider = Address::generate(&env);
    let admin = Address::generate(&env);

    // Create token and mint to subscriber
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000; // 100 tokens
    stellar_client.mint(&subscriber, &(amount * 10)); // Mint 1000 tokens

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Subscriber approves the SoroSub contract to spend tokens
    // Allowance should cover multiple payments
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription
    let interval: u64 = 30 * 24 * 60 * 60; // 30 days
    client.create_subscription(
        &subscriber,
        &provider,
        &token_address,
        &amount,
        &interval,
    );

    // Process first payment (should work since last_payment = 0)
    let paid = client.process_payment(&subscriber, &provider);
    assert_eq!(paid, amount);

    // Verify balances
    assert_eq!(token_client.balance(&subscriber), amount * 10 - amount);
    assert_eq!(token_client.balance(&provider), amount);
}

#[test]
#[should_panic(expected = "Payment interval has not passed yet")]
fn test_process_payment_too_early() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let provider = Address::generate(&env);
    let admin = Address::generate(&env);

    // Create token and mint to subscriber
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription with 30 day interval
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &provider,
        &token_address,
        &amount,
        &interval,
    );

    // First payment succeeds
    client.process_payment(&subscriber, &provider);

    // Advance only 1 day
    advance_time(&env, 24 * 60 * 60);

    // Second payment should fail - interval not passed
    client.process_payment(&subscriber, &provider);
}

#[test]
fn test_process_payment_after_interval() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let provider = Address::generate(&env);
    let admin = Address::generate(&env);

    // Create token and mint to subscriber
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription with 30 day interval
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &provider,
        &token_address,
        &amount,
        &interval,
    );

    // First payment
    client.process_payment(&subscriber, &provider);
    assert_eq!(token_client.balance(&provider), amount);

    // Advance 31 days
    advance_time(&env, 31 * 24 * 60 * 60);

    // Second payment should succeed
    client.process_payment(&subscriber, &provider);
    assert_eq!(token_client.balance(&provider), amount * 2);
}

#[test]
fn test_cancel_subscription() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let provider = Address::generate(&env);
    let admin = Address::generate(&env);

    // Create token
    let (token_client, _) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Create subscription
    let amount: i128 = 100_0000000;
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &provider,
        &token_address,
        &amount,
        &interval,
    );

    // Cancel subscription
    client.cancel_subscription(&subscriber, &provider);

    // Verify subscription is inactive
    let subscription = client.get_subscription(&subscriber, &provider);
    assert!(!subscription.is_active);
}

#[test]
#[should_panic(expected = "Subscription is not active")]
fn test_payment_after_cancel() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let provider = Address::generate(&env);
    let admin = Address::generate(&env);

    // Create token and mint
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create and cancel subscription
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &provider,
        &token_address,
        &amount,
        &interval,
    );
    client.cancel_subscription(&subscriber, &provider);

    // Payment should fail
    client.process_payment(&subscriber, &provider);
}

#[test]
fn test_can_process_payment() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let provider = Address::generate(&env);
    let admin = Address::generate(&env);

    // Create token and mint
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &provider,
        &token_address,
        &amount,
        &interval,
    );

    // Should be able to process (first payment, last_payment = 0)
    assert!(client.can_process_payment(&subscriber, &provider));

    // Process payment
    client.process_payment(&subscriber, &provider);

    // Verify the subscription now has last_payment set
    let sub = client.get_subscription(&subscriber, &provider);
    assert!(sub.last_payment > 0);

    // Should NOT be able to process immediately after
    assert!(!client.can_process_payment(&subscriber, &provider));

    // Advance time past interval
    advance_time(&env, 31 * 24 * 60 * 60);

    // Should be able to process again
    assert!(client.can_process_payment(&subscriber, &provider));
}
