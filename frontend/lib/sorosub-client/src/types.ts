import {Address} from '@stellar/stellar-sdk';

    /**
 * Storage keys for the contract
 */
 export type DataKey =
  { tag: "Subscription"; values: readonly [SubscriptionKey] } |
  { tag: "UserDebt"; values: readonly [string] } |
  { tag: "LiquidityPool"; values: void } |
  { tag: "Admin"; values: void } |
  { tag: "Initialized"; values: void };

/**
 * Tracks user debt from BNPL (Buy Now Pay Later)
 */
export interface UserDebt {
  amount: bigint;
  token: string;
}

/**
 * The subscription data stored on-chain
 */
export interface Subscription {
  amount: bigint;
  credit_score: number;
  interval: bigint;
  is_active: boolean;
  last_payment_time: bigint;
  merchant: string;
  subscriber: string;
  token: string;
}

/**
 * Unique key for each subscription (subscriber + merchant pair)
 */
export interface SubscriptionKey {
  merchant: string;
  subscriber: string;
}
    