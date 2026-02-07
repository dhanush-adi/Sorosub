#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, log, symbol_short, token, Address, Env, Symbol,
};

// ============================================================================
// STORAGE TYPES
// ============================================================================

/// Unique key for each subscription (subscriber + merchant pair)
#[derive(Clone)]
#[contracttype]
pub struct SubscriptionKey {
    pub subscriber: Address,
    pub merchant: Address,
}

/// The subscription data stored on-chain
#[derive(Clone)]
#[contracttype]
pub struct Subscription {
    pub subscriber: Address,      // The subscriber's address
    pub merchant: Address,        // The merchant receiving payments
    pub token: Address,           // Token contract address (e.g., USDC)
    pub amount: i128,             // Amount per payment (in token's smallest unit)
    pub interval: u64,            // Seconds between payments
    pub last_payment_time: u64,   // Timestamp of last payment
    pub is_active: bool,          // Whether subscription is active
    pub credit_score: u32,        // Credit score (starts at 0, +10 per successful payment)
}

/// Tracks user debt from BNPL (Buy Now Pay Later)
#[derive(Clone)]
#[contracttype]
pub struct UserDebt {
    pub amount: i128,    // Total outstanding BNPL debt
    pub token: Address,  // Token owed
}

/// Storage keys for the contract
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Subscription(SubscriptionKey),
    UserDebt(Address),      // Track user debts for BNPL
    LiquidityPool,          // Simulated liquidity pool address
    Admin,                  // Admin address for initialization
    Initialized,            // Whether contract is initialized
}

// ============================================================================
// EVENTS
// ============================================================================

// Event symbols (max 9 chars for symbol_short!)
const SUB_CREATED: Symbol = symbol_short!("sub_new");
const SUB_CANCELLED: Symbol = symbol_short!("sub_end");
const PAYMENT: Symbol = symbol_short!("payment");
const BNPL_TRIGGER: Symbol = symbol_short!("bnpl");
const DEBT_REPAID: Symbol = symbol_short!("repaid");

// ============================================================================
// CONSTANTS
// ============================================================================

/// Credit score increment per successful payment
const CREDIT_SCORE_INCREMENT: u32 = 10;

/// Minimum credit score required for BNPL
const BNPL_MIN_CREDIT_SCORE: u32 = 50;

/// TTL: 30 days in ledgers (assuming ~5 second ledgers)
const THIRTY_DAYS_LEDGERS: u32 = 30 * 24 * 60 * 60 / 5;

// ============================================================================
// CONTRACT
// ============================================================================

#[contract]
pub struct SoroSubContract;

#[contractimpl]
impl SoroSubContract {
    /// Initialize the contract with admin and liquidity pool
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - The admin address
    /// * `liquidity_pool` - The liquidity pool address for BNPL funding
    pub fn initialize(env: Env, admin: Address, liquidity_pool: Address) {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("Contract already initialized");
        }

        // Store admin and liquidity pool
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::LiquidityPool, &liquidity_pool);
        env.storage().instance().set(&DataKey::Initialized, &true);

        // Extend instance TTL
        env.storage()
            .instance()
            .extend_ttl(THIRTY_DAYS_LEDGERS, THIRTY_DAYS_LEDGERS);
    }

    /// Create a new subscription
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The address authorizing payments (must sign)
    /// * `merchant` - The address that will receive payments
    /// * `token` - The token contract address to use for payments
    /// * `amount` - Amount to transfer per payment period
    /// * `interval` - Time in seconds between allowed payments
    ///
    /// # Returns
    /// * The created Subscription struct
    pub fn create_subscription(
        env: Env,
        subscriber: Address,
        merchant: Address,
        token: Address,
        amount: i128,
        interval: u64,
    ) -> Subscription {
        // Subscriber must authorize this action
        subscriber.require_auth();

        // Validate inputs
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        if interval == 0 {
            panic!("Interval must be greater than 0");
        }

        // Create subscription key
        let key = SubscriptionKey {
            subscriber: subscriber.clone(),
            merchant: merchant.clone(),
        };

        // Check if subscription already exists
        let storage_key = DataKey::Subscription(key.clone());
        if env.storage().persistent().has(&storage_key) {
            let existing: Subscription = env.storage().persistent().get(&storage_key).unwrap();
            if existing.is_active {
                panic!("Active subscription already exists");
            }
        }

        // Create the subscription (last_payment_time = 0 allows immediate first payment)
        let subscription = Subscription {
            subscriber: subscriber.clone(),
            merchant: merchant.clone(),
            token: token.clone(),
            amount,
            interval,
            last_payment_time: 0,
            is_active: true,
            credit_score: 0, // Start with 0 credit score
        };

        // Store the subscription
        env.storage().persistent().set(&storage_key, &subscription);

        // Extend TTL for 30 days
        env.storage()
            .persistent()
            .extend_ttl(&storage_key, THIRTY_DAYS_LEDGERS, THIRTY_DAYS_LEDGERS);

        // Log subscription creation
        log!(
            &env,
            "Subscription Created for {} to {}",
            subscriber,
            merchant
        );

        // Emit event
        env.events().publish(
            (SUB_CREATED, subscriber, merchant),
            (token, amount, interval),
        );

        subscription
    }

    /// Collect a subscription payment (pull funds from subscriber)
    ///
    /// This is the main payment collection function that:
    /// 1. Checks if the payment interval has passed
    /// 2. Checks subscriber balance
    /// 3. If balance is sufficient: normal payment + credit score increment
    /// 4. If balance is insufficient but credit_score > 50: BNPL trigger
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address
    /// * `merchant` - The merchant's address (may authorize to receive payment)
    ///
    /// # Returns
    /// * The amount transferred
    pub fn collect_payment(env: Env, subscriber: Address, merchant: Address) -> i128 {
        // Get the subscription
        let key = SubscriptionKey {
            subscriber: subscriber.clone(),
            merchant: merchant.clone(),
        };
        let storage_key = DataKey::Subscription(key);

        let mut subscription: Subscription = env
            .storage()
            .persistent()
            .get(&storage_key)
            .expect("Subscription not found");

        // Check if subscription is active
        if !subscription.is_active {
            panic!("Subscription is not active");
        }

        // CRITICAL SECURITY: Check if enough time has passed
        let current_time = env.ledger().timestamp();
        let is_first_payment = subscription.last_payment_time == 0;

        if !is_first_payment {
            let next_payment_time = subscription.last_payment_time + subscription.interval;
            if current_time < next_payment_time {
                panic!("Payment interval has not passed yet");
            }
        }

        // Get token client and check subscriber balance
        let token_client = token::Client::new(&env, &subscription.token);
        let subscriber_balance = token_client.balance(&subscriber);
        let contract_address = env.current_contract_address();

        let payment_amount = subscription.amount;

        if subscriber_balance >= payment_amount {
            // Normal payment flow: sufficient balance
            // Transfer tokens from subscriber to merchant using allowance
            token_client.transfer_from(&contract_address, &subscriber, &merchant, &payment_amount);

            // Increment credit score
            subscription.credit_score += CREDIT_SCORE_INCREMENT;

            // Update last payment time
            subscription.last_payment_time = current_time;
            env.storage().persistent().set(&storage_key, &subscription);

            // Extend TTL
            env.storage()
                .persistent()
                .extend_ttl(&storage_key, THIRTY_DAYS_LEDGERS, THIRTY_DAYS_LEDGERS);

            // Log successful payment
            log!(
                &env,
                "Payment processed: {} tokens from {} to {}",
                payment_amount,
                subscriber,
                merchant
            );

            // Emit payment event
            env.events().publish(
                (PAYMENT, subscriber.clone(), merchant.clone()),
                (subscription.token.clone(), payment_amount, subscription.credit_score),
            );
        } else if subscription.credit_score > BNPL_MIN_CREDIT_SCORE {
            // BNPL: User has good credit but insufficient balance
            // Transfer from liquidity pool to merchant instead
            let liquidity_pool: Address = env
                .storage()
                .instance()
                .get(&DataKey::LiquidityPool)
                .expect("Liquidity pool not initialized");

            // Transfer from liquidity pool to merchant
            token_client.transfer_from(&contract_address, &liquidity_pool, &merchant, &payment_amount);

            // Record debt against user
            let debt_key = DataKey::UserDebt(subscriber.clone());
            let mut user_debt: UserDebt = env
                .storage()
                .persistent()
                .get(&debt_key)
                .unwrap_or(UserDebt {
                    amount: 0,
                    token: subscription.token.clone(),
                });

            user_debt.amount += payment_amount;
            user_debt.token = subscription.token.clone();
            env.storage().persistent().set(&debt_key, &user_debt);

            // Extend debt TTL
            env.storage()
                .persistent()
                .extend_ttl(&debt_key, THIRTY_DAYS_LEDGERS, THIRTY_DAYS_LEDGERS);

            // Update last payment time (BNPL still counts as a payment)
            subscription.last_payment_time = current_time;
            env.storage().persistent().set(&storage_key, &subscription);

            // Log BNPL trigger
            log!(
                &env,
                "BNPL Triggered: {} tokens for {} (credit score: {})",
                payment_amount,
                subscriber,
                subscription.credit_score
            );

            // Emit BNPL event
            env.events().publish(
                (BNPL_TRIGGER, subscriber.clone(), merchant.clone()),
                (subscription.token.clone(), payment_amount, user_debt.amount),
            );
        } else {
            // Insufficient balance AND insufficient credit score
            panic!("Insufficient balance and credit score too low for BNPL");
        }

        payment_amount
    }

    /// Cancel a subscription
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address (must sign)
    /// * `merchant` - The merchant's address
    pub fn cancel_subscription(env: Env, subscriber: Address, merchant: Address) {
        // Subscriber must authorize cancellation
        subscriber.require_auth();

        // Get the subscription
        let key = SubscriptionKey {
            subscriber: subscriber.clone(),
            merchant: merchant.clone(),
        };
        let storage_key = DataKey::Subscription(key);

        let mut subscription: Subscription = env
            .storage()
            .persistent()
            .get(&storage_key)
            .expect("Subscription not found");

        // Deactivate the subscription
        subscription.is_active = false;
        env.storage().persistent().set(&storage_key, &subscription);

        // Emit event
        env.events()
            .publish((SUB_CANCELLED, subscriber, merchant), ());
    }

    /// Get subscription details
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address
    /// * `merchant` - The merchant's address
    ///
    /// # Returns
    /// * The Subscription struct if it exists
    pub fn get_subscription(env: Env, subscriber: Address, merchant: Address) -> Subscription {
        let key = SubscriptionKey {
            subscriber,
            merchant,
        };
        let storage_key = DataKey::Subscription(key);

        env.storage()
            .persistent()
            .get(&storage_key)
            .expect("Subscription not found")
    }

    /// Check if a payment can be processed now
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address
    /// * `merchant` - The merchant's address
    ///
    /// # Returns
    /// * true if payment can be processed, false otherwise
    pub fn can_process_payment(env: Env, subscriber: Address, merchant: Address) -> bool {
        let key = SubscriptionKey {
            subscriber,
            merchant,
        };
        let storage_key = DataKey::Subscription(key);

        if let Some(subscription) = env.storage().persistent().get::<_, Subscription>(&storage_key)
        {
            if !subscription.is_active {
                return false;
            }

            // First payment is always allowed (last_payment_time == 0)
            if subscription.last_payment_time == 0 {
                return true;
            }

            let current_time = env.ledger().timestamp();
            let next_payment_time = subscription.last_payment_time + subscription.interval;
            current_time >= next_payment_time
        } else {
            false
        }
    }

    /// Get user's outstanding BNPL debt
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `user` - The user's address
    ///
    /// # Returns
    /// * Some(UserDebt) if debt exists, None otherwise
    pub fn get_user_debt(env: Env, user: Address) -> Option<UserDebt> {
        let debt_key = DataKey::UserDebt(user);
        env.storage()
            .persistent()
            .get(&debt_key)
    }

    /// Repay BNPL debt
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `user` - The user repaying debt (must sign)
    /// * `amount` - Amount to repay
    ///
    /// # Returns
    /// * Remaining debt amount
    pub fn repay_debt(env: Env, user: Address, amount: i128) -> i128 {
        // User must authorize repayment
        user.require_auth();

        if amount <= 0 {
            panic!("Repayment amount must be positive");
        }

        let debt_key = DataKey::UserDebt(user.clone());
        let mut user_debt: UserDebt = env
            .storage()
            .persistent()
            .get(&debt_key)
            .expect("No debt found for user");

        if amount > user_debt.amount {
            panic!("Repayment amount exceeds debt");
        }

        // Get liquidity pool to receive repayment
        let liquidity_pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::LiquidityPool)
            .expect("Liquidity pool not initialized");

        // Transfer repayment from user to liquidity pool
        let token_client = token::Client::new(&env, &user_debt.token);
        token_client.transfer(&user, &liquidity_pool, &amount);

        // Update debt
        user_debt.amount -= amount;

        if user_debt.amount == 0 {
            // Remove debt record if fully repaid
            env.storage().persistent().remove(&debt_key);
        } else {
            env.storage().persistent().set(&debt_key, &user_debt);
            env.storage()
                .persistent()
                .extend_ttl(&debt_key, THIRTY_DAYS_LEDGERS, THIRTY_DAYS_LEDGERS);
        }

        // Log repayment
        log!(
            &env,
            "Debt repaid: {} tokens by {}, remaining: {}",
            amount,
            user,
            user_debt.amount
        );

        // Emit repayment event
        env.events().publish(
            (DEBT_REPAID, user.clone()),
            (amount, user_debt.amount),
        );

        user_debt.amount
    }

    /// Get the user's credit score from their subscription
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address
    /// * `merchant` - The merchant's address
    ///
    /// # Returns
    /// * The credit score (u32)
    pub fn get_credit_score(env: Env, subscriber: Address, merchant: Address) -> u32 {
        let key = SubscriptionKey {
            subscriber,
            merchant,
        };
        let storage_key = DataKey::Subscription(key);

        let subscription: Subscription = env
            .storage()
            .persistent()
            .get(&storage_key)
            .expect("Subscription not found");

        subscription.credit_score
    }

    /// Get the liquidity pool address
    pub fn get_liquidity_pool(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::LiquidityPool)
            .expect("Liquidity pool not initialized")
    }

    /// Check if contract is initialized
    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Initialized)
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod test;
