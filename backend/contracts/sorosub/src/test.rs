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
        protocol_version: 25,
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

/// Helper to setup contract with initialization
fn setup_contract<'a>(env: &'a Env, liquidity_pool: &Address) -> (Address, SoroSubContractClient<'a>) {
    let admin = Address::generate(env);
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(env, &contract_id);
    client.initialize(&admin, liquidity_pool);
    (contract_id, client)
}

// ============================================================================
// BASIC SUBSCRIPTION TESTS
// ============================================================================

#[test]
fn test_create_subscription() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token
    let (token_client, _) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    // Register and initialize contract
    let (_, client) = setup_contract(&env, &liquidity_pool);

    // Create subscription: 100 tokens every 30 days (in seconds)
    let amount: i128 = 100_0000000; // 100 tokens with 7 decimals
    let interval: u64 = 30 * 24 * 60 * 60; // 30 days in seconds

    let subscription = client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Verify subscription data
    assert_eq!(subscription.subscriber, subscriber);
    assert_eq!(subscription.merchant, merchant);
    assert_eq!(subscription.token, token_address);
    assert_eq!(subscription.amount, amount);
    assert_eq!(subscription.interval, interval);
    assert_eq!(subscription.last_payment_time, 0);
    assert!(subscription.is_active);
    assert_eq!(subscription.credit_score, 0); // Starts at 0
}

#[test]
fn test_process_payment() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token and mint to subscriber
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000; // 100 tokens
    stellar_client.mint(&subscriber, &(amount * 10)); // Mint 1000 tokens

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Subscriber approves the SoroSub contract to spend tokens
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription
    let interval: u64 = 30 * 24 * 60 * 60; // 30 days
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Process first payment (should work since last_payment_time = 0)
    let paid = client.collect_payment(&subscriber, &merchant);
    assert_eq!(paid, amount);

    // Verify balances
    assert_eq!(token_client.balance(&subscriber), amount * 10 - amount);
    assert_eq!(token_client.balance(&merchant), amount);

    // Verify credit score increased
    let subscription = client.get_subscription(&subscriber, &merchant);
    assert_eq!(subscription.credit_score, 10);
}

#[test]
#[should_panic(expected = "Payment interval has not passed yet")]
fn test_process_payment_too_early() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token and mint to subscriber
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription with 30 day interval
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // First payment succeeds
    client.collect_payment(&subscriber, &merchant);

    // Advance only 1 day
    advance_time(&env, 24 * 60 * 60);

    // Second payment should fail - interval not passed
    client.collect_payment(&subscriber, &merchant);
}

#[test]
fn test_process_payment_after_interval() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token and mint to subscriber
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription with 30 day interval
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // First payment
    client.collect_payment(&subscriber, &merchant);
    assert_eq!(token_client.balance(&merchant), amount);

    // Advance 31 days
    advance_time(&env, 31 * 24 * 60 * 60);

    // Second payment should succeed
    client.collect_payment(&subscriber, &merchant);
    assert_eq!(token_client.balance(&merchant), amount * 2);
}

#[test]
fn test_cancel_subscription() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token
    let (token_client, _) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    // Register and initialize contract
    let (_, client) = setup_contract(&env, &liquidity_pool);

    // Create subscription
    let amount: i128 = 100_0000000;
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Cancel subscription
    client.cancel_subscription(&subscriber, &merchant);

    // Verify subscription is inactive
    let subscription = client.get_subscription(&subscriber, &merchant);
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
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token and mint
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create and cancel subscription
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );
    client.cancel_subscription(&subscriber, &merchant);

    // Payment should fail
    client.collect_payment(&subscriber, &merchant);
}

#[test]
fn test_can_process_payment() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token and mint
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 10));

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 1000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Should be able to process (first payment, last_payment_time = 0)
    assert!(client.can_process_payment(&subscriber, &merchant));

    // Process payment
    client.collect_payment(&subscriber, &merchant);

    // Verify the subscription now has last_payment_time set
    let sub = client.get_subscription(&subscriber, &merchant);
    assert!(sub.last_payment_time > 0);

    // Should NOT be able to process immediately after
    assert!(!client.can_process_payment(&subscriber, &merchant));

    // Advance time past interval
    advance_time(&env, 31 * 24 * 60 * 60);

    // Should be able to process again
    assert!(client.can_process_payment(&subscriber, &merchant));
}

// ============================================================================
// CREDIT SCORE TESTS
// ============================================================================

#[test]
fn test_credit_score_increment() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token and mint to subscriber
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;
    stellar_client.mint(&subscriber, &(amount * 20)); // Enough for many payments

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 5000;
    token_client.approve(&subscriber, &contract_id, &(amount * 20), &expiration_ledger);

    // Create subscription
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Verify initial credit score is 0
    assert_eq!(client.get_credit_score(&subscriber, &merchant), 0);

    // Make 6 payments, each should increase credit score by 10
    for i in 1..=6 {
        client.collect_payment(&subscriber, &merchant);
        assert_eq!(client.get_credit_score(&subscriber, &merchant), i * 10);

        // Advance time for next payment
        advance_time(&env, 31 * 24 * 60 * 60);
    }

    // After 6 payments, credit score should be 60
    assert_eq!(client.get_credit_score(&subscriber, &merchant), 60);
}

// ============================================================================
// BNPL (BUY NOW PAY LATER) TESTS
// ============================================================================

#[test]
fn test_bnpl_trigger() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;

    // Mint enough for initial payments to build credit
    stellar_client.mint(&subscriber, &(amount * 10));
    // Mint to liquidity pool for BNPL
    stellar_client.mint(&liquidity_pool, &(amount * 100));

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract for subscriber
    let expiration_ledger = env.ledger().sequence() + 5000;
    token_client.approve(&subscriber, &contract_id, &(amount * 20), &expiration_ledger);
    // Approve contract for liquidity pool (needed for BNPL transfers)
    token_client.approve(&liquidity_pool, &contract_id, &(amount * 100), &expiration_ledger);

    // Create subscription
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Make 6 payments to build credit score to 60 (> 50 threshold)
    for _ in 0..6 {
        client.collect_payment(&subscriber, &merchant);
        advance_time(&env, 31 * 24 * 60 * 60);
    }

    // Verify credit score is now 60
    assert_eq!(client.get_credit_score(&subscriber, &merchant), 60);

    // Now drain subscriber's balance so they can't afford next payment
    let remaining_balance = token_client.balance(&subscriber);
    if remaining_balance > 0 {
        token_client.transfer(&subscriber, &admin, &remaining_balance);
    }
    assert_eq!(token_client.balance(&subscriber), 0);

    // Record merchant balance before BNPL
    let merchant_balance_before = token_client.balance(&merchant);

    // Next payment should trigger BNPL (subscriber has 0 balance but credit_score = 60)
    let paid = client.collect_payment(&subscriber, &merchant);
    assert_eq!(paid, amount);

    // Merchant should have received payment from liquidity pool
    assert_eq!(token_client.balance(&merchant), merchant_balance_before + amount);

    // Subscriber should now have debt
    let debt = client.get_user_debt(&subscriber).expect("Debt should exist");
    assert_eq!(debt.amount, amount);
}

#[test]
#[should_panic(expected = "Insufficient balance and credit score too low for BNPL")]
fn test_bnpl_fails_low_credit() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;

    // Mint minimal amount to subscriber (just enough for 2 payments)
    stellar_client.mint(&subscriber, &(amount * 2));

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 5000;
    token_client.approve(&subscriber, &contract_id, &(amount * 10), &expiration_ledger);

    // Create subscription
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Make only 2 payments (credit score = 20, not enough for BNPL)
    for _ in 0..2 {
        client.collect_payment(&subscriber, &merchant);
        advance_time(&env, 31 * 24 * 60 * 60);
    }

    // Verify credit score is only 20
    assert_eq!(client.get_credit_score(&subscriber, &merchant), 20);

    // Subscriber has no balance left
    assert_eq!(token_client.balance(&subscriber), 0);

    // This should panic - insufficient balance AND low credit score
    client.collect_payment(&subscriber, &merchant);
}

#[test]
fn test_repay_debt() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    // Setup addresses
    let subscriber = Address::generate(&env);
    let merchant = Address::generate(&env);
    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Create token
    let (token_client, stellar_client) = create_token(&env, &admin);
    let token_address = token_client.address.clone();

    let amount: i128 = 100_0000000;

    // Mint enough for initial payments
    stellar_client.mint(&subscriber, &(amount * 10));
    // Mint to liquidity pool for BNPL
    stellar_client.mint(&liquidity_pool, &(amount * 100));

    // Register and initialize contract
    let (contract_id, client) = setup_contract(&env, &liquidity_pool);

    // Approve contract
    let expiration_ledger = env.ledger().sequence() + 5000;
    token_client.approve(&subscriber, &contract_id, &(amount * 20), &expiration_ledger);
    token_client.approve(&liquidity_pool, &contract_id, &(amount * 100), &expiration_ledger);

    // Create subscription and build credit score
    let interval: u64 = 30 * 24 * 60 * 60;
    client.create_subscription(
        &subscriber,
        &merchant,
        &token_address,
        &amount,
        &interval,
    );

    // Make 6 payments to reach credit score 60
    for _ in 0..6 {
        client.collect_payment(&subscriber, &merchant);
        advance_time(&env, 31 * 24 * 60 * 60);
    }

    // Drain subscriber balance
    let remaining = token_client.balance(&subscriber);
    if remaining > 0 {
        token_client.transfer(&subscriber, &admin, &remaining);
    }

    // Trigger BNPL
    client.collect_payment(&subscriber, &merchant);

    // Verify debt was created
    let debt = client.get_user_debt(&subscriber).expect("Debt should exist");
    assert_eq!(debt.amount, amount);

    // Now give subscriber funds to repay
    stellar_client.mint(&subscriber, &amount);

    // Repay half the debt
    let remaining_debt = client.repay_debt(&subscriber, &(amount / 2));
    assert_eq!(remaining_debt, amount / 2);

    // Verify partial repayment
    let debt_after = client.get_user_debt(&subscriber).expect("Debt should exist");
    assert_eq!(debt_after.amount, amount / 2);

    // Repay rest of debt
    let final_debt = client.repay_debt(&subscriber, &(amount / 2));
    assert_eq!(final_debt, 0);

    // Debt should be cleared (returns None when debt is 0 and removed)
    assert!(client.get_user_debt(&subscriber).is_none());
}

// ============================================================================
// INITIALIZATION TESTS
// ============================================================================

#[test]
fn test_initialization() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    // Register contract
    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // Should not be initialized yet
    assert!(!client.is_initialized());

    // Initialize
    client.initialize(&admin, &liquidity_pool);

    // Should be initialized now
    assert!(client.is_initialized());

    // Verify liquidity pool is set
    assert_eq!(client.get_liquidity_pool(), liquidity_pool);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_double_initialization() {
    let env = Env::default();
    env.mock_all_auths();
    setup_ledger(&env);

    let admin = Address::generate(&env);
    let liquidity_pool = Address::generate(&env);

    let contract_id = env.register(SoroSubContract, ());
    let client = SoroSubContractClient::new(&env, &contract_id);

    // First initialization
    client.initialize(&admin, &liquidity_pool);

    // Second initialization should fail
    client.initialize(&admin, &liquidity_pool);
}
