#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
};

// ============================================================================
// STORAGE TYPES
// ============================================================================

/// Unique key for each subscription (subscriber + provider pair)
#[derive(Clone)]
#[contracttype]
pub struct SubscriptionKey {
    pub subscriber: Address,
    pub provider: Address,
}

/// The subscription data stored on-chain
#[derive(Clone)]
#[contracttype]
pub struct Subscription {
    pub token: Address,       // Token contract address (e.g., USDC)
    pub amount: i128,         // Amount per payment (in token's smallest unit)
    pub interval: u64,        // Seconds between payments
    pub last_payment: u64,    // Timestamp of last payment
    pub is_active: bool,      // Whether subscription is active
}

/// Storage keys for the contract
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Subscription(SubscriptionKey),
}

// ============================================================================
// EVENTS
// ============================================================================

// Event symbols
const SUB_CREATED: Symbol = symbol_short!("sub_new");
const SUB_CANCELLED: Symbol = symbol_short!("sub_end");
const PAYMENT: Symbol = symbol_short!("payment");

// ============================================================================
// CONTRACT
// ============================================================================

#[contract]
pub struct SoroSubContract;

#[contractimpl]
impl SoroSubContract {
    /// Create a new subscription
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The address authorizing payments (must sign)
    /// * `provider` - The address that will receive payments
    /// * `token` - The token contract address to use for payments
    /// * `amount` - Amount to transfer per payment period
    /// * `interval` - Time in seconds between allowed payments
    ///
    /// # Returns
    /// * The created Subscription struct
    pub fn create_subscription(
        env: Env,
        subscriber: Address,
        provider: Address,
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
            provider: provider.clone(),
        };

        // Check if subscription already exists
        let storage_key = DataKey::Subscription(key.clone());
        if env.storage().persistent().has(&storage_key) {
            let existing: Subscription = env.storage().persistent().get(&storage_key).unwrap();
            if existing.is_active {
                panic!("Active subscription already exists");
            }
        }

        // Create the subscription (last_payment = 0 allows immediate first payment)
        let subscription = Subscription {
            token: token.clone(),
            amount,
            interval,
            last_payment: 0,
            is_active: true,
        };

        // Store the subscription
        env.storage().persistent().set(&storage_key, &subscription);

        // Extend TTL for 30 days (assuming ~5 second ledgers)
        let thirty_days_ledgers: u32 = 30 * 24 * 60 * 60 / 5;
        env.storage()
            .persistent()
            .extend_ttl(&storage_key, thirty_days_ledgers, thirty_days_ledgers);

        // Emit event
        env.events().publish(
            (SUB_CREATED, subscriber.clone(), provider.clone()),
            (token, amount, interval),
        );

        subscription
    }

    /// Process a subscription payment (pull funds from subscriber)
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address
    /// * `provider` - The provider's address (must sign to receive payment)
    ///
    /// # Returns
    /// * The amount transferred
    ///
    /// # Panics
    /// * If subscription doesn't exist or isn't active
    /// * If interval hasn't passed since last payment
    pub fn process_payment(env: Env, subscriber: Address, provider: Address) -> i128 {
        // Provider must authorize (they're the ones calling to receive payment)
        provider.require_auth();

        // Get the subscription
        let key = SubscriptionKey {
            subscriber: subscriber.clone(),
            provider: provider.clone(),
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

        // Check if enough time has passed (first payment always allowed when last_payment == 0)
        let current_time = env.ledger().timestamp();
        let is_first_payment = subscription.last_payment == 0;
        
        if !is_first_payment {
            let time_since_last = current_time - subscription.last_payment;
            if time_since_last < subscription.interval {
                panic!("Payment interval has not passed yet");
            }
        }

        // Transfer tokens from subscriber to provider using allowance
        // Subscriber must have pre-approved this contract via token.approve()
        let token_client = token::Client::new(&env, &subscription.token);
        let contract_address = env.current_contract_address();
        token_client.transfer_from(&contract_address, &subscriber, &provider, &subscription.amount);

        // Update last payment time
        subscription.last_payment = current_time;
        env.storage().persistent().set(&storage_key, &subscription);

        // Extend TTL
        let thirty_days_ledgers: u32 = 30 * 24 * 60 * 60 / 5;
        env.storage()
            .persistent()
            .extend_ttl(&storage_key, thirty_days_ledgers, thirty_days_ledgers);

        // Emit event
        env.events().publish(
            (PAYMENT, subscriber, provider),
            (subscription.token.clone(), subscription.amount),
        );

        subscription.amount
    }

    /// Cancel a subscription
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address (must sign)
    /// * `provider` - The provider's address
    ///
    /// # Panics
    /// * If subscription doesn't exist
    pub fn cancel_subscription(env: Env, subscriber: Address, provider: Address) {
        // Subscriber must authorize cancellation
        subscriber.require_auth();

        // Get the subscription
        let key = SubscriptionKey {
            subscriber: subscriber.clone(),
            provider: provider.clone(),
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
            .publish((SUB_CANCELLED, subscriber, provider), ());
    }

    /// Get subscription details
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `subscriber` - The subscriber's address
    /// * `provider` - The provider's address
    ///
    /// # Returns
    /// * The Subscription struct if it exists
    pub fn get_subscription(env: Env, subscriber: Address, provider: Address) -> Subscription {
        let key = SubscriptionKey {
            subscriber,
            provider,
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
    /// * `provider` - The provider's address
    ///
    /// # Returns
    /// * true if payment can be processed, false otherwise
    pub fn can_process_payment(env: Env, subscriber: Address, provider: Address) -> bool {
        let key = SubscriptionKey {
            subscriber,
            provider,
        };
        let storage_key = DataKey::Subscription(key);

        if let Some(subscription) = env.storage().persistent().get::<_, Subscription>(&storage_key)
        {
            if !subscription.is_active {
                return false;
            }

            // First payment is always allowed (last_payment == 0)
            if subscription.last_payment == 0 {
                return true;
            }
            
            let current_time = env.ledger().timestamp();
            let time_since_last = current_time - subscription.last_payment;
            time_since_last >= subscription.interval
        } else {
            false
        }
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod test;
