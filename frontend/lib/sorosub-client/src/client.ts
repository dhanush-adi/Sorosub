import {UserDebt, Subscription} from './types.js';
import {Spec, AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions} from '@stellar/stellar-sdk/contract';
import {Address} from '@stellar/stellar-sdk';

export interface Client {
  /**
   * Initialize the contract with admin and liquidity pool
   *
   * # Arguments
   * * `env` - The contract environment
   * * `admin` - The admin address
   * * `liquidity_pool` - The liquidity pool address for BNPL funding
   */
  initialize({ admin, liquidity_pool }: { admin: string | Address; liquidity_pool: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<void>>;
  /**
   * Repay BNPL debt
   *
   * # Arguments
   * * `env` - The contract environment
   * * `user` - The user repaying debt (must sign)
   * * `amount` - Amount to repay
   *
   * # Returns
   * * Remaining debt amount
   */
  repay_debt({ user, amount }: { user: string | Address; amount: bigint }, options?: MethodOptions): Promise<AssembledTransaction<bigint>>;
  /**
   * Get user's outstanding BNPL debt
   *
   * # Arguments
   * * `env` - The contract environment
   * * `user` - The user's address
   *
   * # Returns
   * * Some(UserDebt) if debt exists, None otherwise
   */
  get_user_debt({ user }: { user: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<UserDebt | null>>;
  /**
   * Check if contract is initialized
   */
  is_initialized(options?: MethodOptions): Promise<AssembledTransaction<boolean>>;
  /**
   * Collect a subscription payment (pull funds from subscriber)
   *
   * This is the main payment collection function that:
   * 1. Checks if the payment interval has passed
   * 2. Checks subscriber balance
   * 3. If balance is sufficient: normal payment + credit score increment
   * 4. If balance is insufficient but credit_score > 50: BNPL trigger
   *
   * # Arguments
   * * `env` - The contract environment
   * * `subscriber` - The subscriber's address
   * * `merchant` - The merchant's address (may authorize to receive payment)
   *
   * # Returns
   * * The amount transferred
   */
  collect_payment({ subscriber, merchant }: { subscriber: string | Address; merchant: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<bigint>>;
  /**
   * Get the user's credit score from their subscription
   *
   * # Arguments
   * * `env` - The contract environment
   * * `subscriber` - The subscriber's address
   * * `merchant` - The merchant's address
   *
   * # Returns
   * * The credit score (u32)
   */
  get_credit_score({ subscriber, merchant }: { subscriber: string | Address; merchant: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<number>>;
  /**
   * Get subscription details
   *
   * # Arguments
   * * `env` - The contract environment
   * * `subscriber` - The subscriber's address
   * * `merchant` - The merchant's address
   *
   * # Returns
   * * The Subscription struct if it exists
   */
  get_subscription({ subscriber, merchant }: { subscriber: string | Address; merchant: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<Subscription>>;
  /**
   * Get the liquidity pool address
   */
  get_liquidity_pool(options?: MethodOptions): Promise<AssembledTransaction<string>>;
  /**
   * Check if a payment can be processed now
   *
   * # Arguments
   * * `env` - The contract environment
   * * `subscriber` - The subscriber's address
   * * `merchant` - The merchant's address
   *
   * # Returns
   * * true if payment can be processed, false otherwise
   */
  can_process_payment({ subscriber, merchant }: { subscriber: string | Address; merchant: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<boolean>>;
  /**
   * Cancel a subscription
   *
   * # Arguments
   * * `env` - The contract environment
   * * `subscriber` - The subscriber's address (must sign)
   * * `merchant` - The merchant's address
   */
  cancel_subscription({ subscriber, merchant }: { subscriber: string | Address; merchant: string | Address }, options?: MethodOptions): Promise<AssembledTransaction<void>>;
  /**
   * Create a new subscription
   *
   * # Arguments
   * * `env` - The contract environment
   * * `subscriber` - The address authorizing payments (must sign)
   * * `merchant` - The address that will receive payments
   * * `token` - The token contract address to use for payments
   * * `amount` - Amount to transfer per payment period
   * * `interval` - Time in seconds between allowed payments
   *
   * # Returns
   * * The created Subscription struct
   */
  create_subscription({ subscriber, merchant, token, amount, interval }: { subscriber: string | Address; merchant: string | Address; token: string | Address; amount: bigint; interval: bigint }, options?: MethodOptions): Promise<AssembledTransaction<Subscription>>;
}

export class Client extends ContractClient {
  constructor(public readonly options: ContractClientOptions) {
    super(
      new Spec(["AAAAAgAAAB1TdG9yYWdlIGtleXMgZm9yIHRoZSBjb250cmFjdAAAAAAAAAAAAAAHRGF0YUtleQAAAAAFAAAAAQAAAAAAAAAMU3Vic2NyaXB0aW9uAAAAAQAAB9AAAAAPU3Vic2NyaXB0aW9uS2V5AAAAAAEAAAAAAAAACFVzZXJEZWJ0AAAAAQAAABMAAAAAAAAAAAAAAA1MaXF1aWRpdHlQb29sAAAAAAAAAAAAAAAAAAAFQWRtaW4AAAAAAAAAAAAAAAAAAAtJbml0aWFsaXplZAA=", "AAAAAQAAAC5UcmFja3MgdXNlciBkZWJ0IGZyb20gQk5QTCAoQnV5IE5vdyBQYXkgTGF0ZXIpAAAAAAAAAAAACFVzZXJEZWJ0AAAAAgAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAV0b2tlbgAAAAAAABM=", "AAAAAQAAACVUaGUgc3Vic2NyaXB0aW9uIGRhdGEgc3RvcmVkIG9uLWNoYWluAAAAAAAAAAAAAAxTdWJzY3JpcHRpb24AAAAIAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADGNyZWRpdF9zY29yZQAAAAQAAAAAAAAACGludGVydmFsAAAABgAAAAAAAAAJaXNfYWN0aXZlAAAAAAAAAQAAAAAAAAARbGFzdF9wYXltZW50X3RpbWUAAAAAAAAGAAAAAAAAAAhtZXJjaGFudAAAABMAAAAAAAAACnN1YnNjcmliZXIAAAAAABMAAAAAAAAABXRva2VuAAAAAAAAEw==", "AAAAAQAAAD1VbmlxdWUga2V5IGZvciBlYWNoIHN1YnNjcmlwdGlvbiAoc3Vic2NyaWJlciArIG1lcmNoYW50IHBhaXIpAAAAAAAAAAAAAA9TdWJzY3JpcHRpb25LZXkAAAAAAgAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAAAAAApzdWJzY3JpYmVyAAAAAAAT", "AAAAAAAAAMRJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIGFkbWluIGFuZCBsaXF1aWRpdHkgcG9vbAoKIyBBcmd1bWVudHMKKiBgZW52YCAtIFRoZSBjb250cmFjdCBlbnZpcm9ubWVudAoqIGBhZG1pbmAgLSBUaGUgYWRtaW4gYWRkcmVzcwoqIGBsaXF1aWRpdHlfcG9vbGAgLSBUaGUgbGlxdWlkaXR5IHBvb2wgYWRkcmVzcyBmb3IgQk5QTCBmdW5kaW5nAAAACmluaXRpYWxpemUAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAObGlxdWlkaXR5X3Bvb2wAAAAAABMAAAAA", "AAAAAAAAAK1SZXBheSBCTlBMIGRlYnQKCiMgQXJndW1lbnRzCiogYGVudmAgLSBUaGUgY29udHJhY3QgZW52aXJvbm1lbnQKKiBgdXNlcmAgLSBUaGUgdXNlciByZXBheWluZyBkZWJ0IChtdXN0IHNpZ24pCiogYGFtb3VudGAgLSBBbW91bnQgdG8gcmVwYXkKCiMgUmV0dXJucwoqIFJlbWFpbmluZyBkZWJ0IGFtb3VudAAAAAAAAApyZXBheV9kZWJ0AAAAAAACAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAAAs=", "AAAAAAAAAKlHZXQgdXNlcidzIG91dHN0YW5kaW5nIEJOUEwgZGVidAoKIyBBcmd1bWVudHMKKiBgZW52YCAtIFRoZSBjb250cmFjdCBlbnZpcm9ubWVudAoqIGB1c2VyYCAtIFRoZSB1c2VyJ3MgYWRkcmVzcwoKIyBSZXR1cm5zCiogU29tZShVc2VyRGVidCkgaWYgZGVidCBleGlzdHMsIE5vbmUgb3RoZXJ3aXNlAAAAAAAADWdldF91c2VyX2RlYnQAAAAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPoAAAH0AAAAAhVc2VyRGVidA==", "AAAAAAAAACBDaGVjayBpZiBjb250cmFjdCBpcyBpbml0aWFsaXplZAAAAA5pc19pbml0aWFsaXplZAAAAAAAAAAAAAEAAAAB", "AAAAAAAAAgdDb2xsZWN0IGEgc3Vic2NyaXB0aW9uIHBheW1lbnQgKHB1bGwgZnVuZHMgZnJvbSBzdWJzY3JpYmVyKQoKVGhpcyBpcyB0aGUgbWFpbiBwYXltZW50IGNvbGxlY3Rpb24gZnVuY3Rpb24gdGhhdDoKMS4gQ2hlY2tzIGlmIHRoZSBwYXltZW50IGludGVydmFsIGhhcyBwYXNzZWQKMi4gQ2hlY2tzIHN1YnNjcmliZXIgYmFsYW5jZQozLiBJZiBiYWxhbmNlIGlzIHN1ZmZpY2llbnQ6IG5vcm1hbCBwYXltZW50ICsgY3JlZGl0IHNjb3JlIGluY3JlbWVudAo0LiBJZiBiYWxhbmNlIGlzIGluc3VmZmljaWVudCBidXQgY3JlZGl0X3Njb3JlID4gNTA6IEJOUEwgdHJpZ2dlcgoKIyBBcmd1bWVudHMKKiBgZW52YCAtIFRoZSBjb250cmFjdCBlbnZpcm9ubWVudAoqIGBzdWJzY3JpYmVyYCAtIFRoZSBzdWJzY3JpYmVyJ3MgYWRkcmVzcwoqIGBtZXJjaGFudGAgLSBUaGUgbWVyY2hhbnQncyBhZGRyZXNzIChtYXkgYXV0aG9yaXplIHRvIHJlY2VpdmUgcGF5bWVudCkKCiMgUmV0dXJucwoqIFRoZSBhbW91bnQgdHJhbnNmZXJyZWQAAAAAD2NvbGxlY3RfcGF5bWVudAAAAAACAAAAAAAAAApzdWJzY3JpYmVyAAAAAAATAAAAAAAAAAhtZXJjaGFudAAAABMAAAABAAAACw==", "AAAAAAAAANdHZXQgdGhlIHVzZXIncyBjcmVkaXQgc2NvcmUgZnJvbSB0aGVpciBzdWJzY3JpcHRpb24KCiMgQXJndW1lbnRzCiogYGVudmAgLSBUaGUgY29udHJhY3QgZW52aXJvbm1lbnQKKiBgc3Vic2NyaWJlcmAgLSBUaGUgc3Vic2NyaWJlcidzIGFkZHJlc3MKKiBgbWVyY2hhbnRgIC0gVGhlIG1lcmNoYW50J3MgYWRkcmVzcwoKIyBSZXR1cm5zCiogVGhlIGNyZWRpdCBzY29yZSAodTMyKQAAAAAQZ2V0X2NyZWRpdF9zY29yZQAAAAIAAAAAAAAACnN1YnNjcmliZXIAAAAAABMAAAAAAAAACG1lcmNoYW50AAAAEwAAAAEAAAAE", "AAAAAAAAAMpHZXQgc3Vic2NyaXB0aW9uIGRldGFpbHMKCiMgQXJndW1lbnRzCiogYGVudmAgLSBUaGUgY29udHJhY3QgZW52aXJvbm1lbnQKKiBgc3Vic2NyaWJlcmAgLSBUaGUgc3Vic2NyaWJlcidzIGFkZHJlc3MKKiBgbWVyY2hhbnRgIC0gVGhlIG1lcmNoYW50J3MgYWRkcmVzcwoKIyBSZXR1cm5zCiogVGhlIFN1YnNjcmlwdGlvbiBzdHJ1Y3QgaWYgaXQgZXhpc3RzAAAAAAAQZ2V0X3N1YnNjcmlwdGlvbgAAAAIAAAAAAAAACnN1YnNjcmliZXIAAAAAABMAAAAAAAAACG1lcmNoYW50AAAAEwAAAAEAAAfQAAAADFN1YnNjcmlwdGlvbg==", "AAAAAAAAAB5HZXQgdGhlIGxpcXVpZGl0eSBwb29sIGFkZHJlc3MAAAAAABJnZXRfbGlxdWlkaXR5X3Bvb2wAAAAAAAAAAAABAAAAEw==", "AAAAAAAAAOZDaGVjayBpZiBhIHBheW1lbnQgY2FuIGJlIHByb2Nlc3NlZCBub3cKCiMgQXJndW1lbnRzCiogYGVudmAgLSBUaGUgY29udHJhY3QgZW52aXJvbm1lbnQKKiBgc3Vic2NyaWJlcmAgLSBUaGUgc3Vic2NyaWJlcidzIGFkZHJlc3MKKiBgbWVyY2hhbnRgIC0gVGhlIG1lcmNoYW50J3MgYWRkcmVzcwoKIyBSZXR1cm5zCiogdHJ1ZSBpZiBwYXltZW50IGNhbiBiZSBwcm9jZXNzZWQsIGZhbHNlIG90aGVyd2lzZQAAAAAAE2Nhbl9wcm9jZXNzX3BheW1lbnQAAAAAAgAAAAAAAAAKc3Vic2NyaWJlcgAAAAAAEwAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAQAAAAE=", "AAAAAAAAAKFDYW5jZWwgYSBzdWJzY3JpcHRpb24KCiMgQXJndW1lbnRzCiogYGVudmAgLSBUaGUgY29udHJhY3QgZW52aXJvbm1lbnQKKiBgc3Vic2NyaWJlcmAgLSBUaGUgc3Vic2NyaWJlcidzIGFkZHJlc3MgKG11c3Qgc2lnbikKKiBgbWVyY2hhbnRgIC0gVGhlIG1lcmNoYW50J3MgYWRkcmVzcwAAAAAAABNjYW5jZWxfc3Vic2NyaXB0aW9uAAAAAAIAAAAAAAAACnN1YnNjcmliZXIAAAAAABMAAAAAAAAACG1lcmNoYW50AAAAEwAAAAA=", "AAAAAAAAAZBDcmVhdGUgYSBuZXcgc3Vic2NyaXB0aW9uCgojIEFyZ3VtZW50cwoqIGBlbnZgIC0gVGhlIGNvbnRyYWN0IGVudmlyb25tZW50CiogYHN1YnNjcmliZXJgIC0gVGhlIGFkZHJlc3MgYXV0aG9yaXppbmcgcGF5bWVudHMgKG11c3Qgc2lnbikKKiBgbWVyY2hhbnRgIC0gVGhlIGFkZHJlc3MgdGhhdCB3aWxsIHJlY2VpdmUgcGF5bWVudHMKKiBgdG9rZW5gIC0gVGhlIHRva2VuIGNvbnRyYWN0IGFkZHJlc3MgdG8gdXNlIGZvciBwYXltZW50cwoqIGBhbW91bnRgIC0gQW1vdW50IHRvIHRyYW5zZmVyIHBlciBwYXltZW50IHBlcmlvZAoqIGBpbnRlcnZhbGAgLSBUaW1lIGluIHNlY29uZHMgYmV0d2VlbiBhbGxvd2VkIHBheW1lbnRzCgojIFJldHVybnMKKiBUaGUgY3JlYXRlZCBTdWJzY3JpcHRpb24gc3RydWN0AAAAE2NyZWF0ZV9zdWJzY3JpcHRpb24AAAAABQAAAAAAAAAKc3Vic2NyaWJlcgAAAAAAEwAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIaW50ZXJ2YWwAAAAGAAAAAQAAB9AAAAAMU3Vic2NyaXB0aW9u"]),
      options
    );
  }

   static deploy<T = Client>(options: MethodOptions & Omit<ContractClientOptions, 'contractId'> & { wasmHash: Buffer | string; salt?: Buffer | Uint8Array; format?: "hex" | "base64"; address?: string; }): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options);
  }
  public readonly fromJSON = {
    initialize : this.txFromJSON<void>,  repay_debt : this.txFromJSON<bigint>,  get_user_debt : this.txFromJSON<UserDebt | null>,  is_initialized : this.txFromJSON<boolean>,  collect_payment : this.txFromJSON<bigint>,  get_credit_score : this.txFromJSON<number>,  get_subscription : this.txFromJSON<Subscription>,  get_liquidity_pool : this.txFromJSON<string>,  can_process_payment : this.txFromJSON<boolean>,  cancel_subscription : this.txFromJSON<void>,  create_subscription : this.txFromJSON<Subscription>
  };
}