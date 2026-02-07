// SoroSub Contract Client
// Provides functions to interact with the SoroSub smart contract

import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACTS, NETWORK, getSorobanServer, toStroops } from './stellar';

const { Contract, TransactionBuilder, Address, nativeToScVal } = StellarSdk;

// Subscription data returned from contract
export interface Subscription {
    token: string;
    amount: bigint;
    interval: bigint;
    lastPayment: bigint;
    isActive: boolean;
}

// Build a transaction for creating a subscription
export async function buildCreateSubscriptionTx(
    subscriberPublicKey: string,
    providerAddress: string,
    tokenAddress: string,
    amount: number,
    intervalSeconds: number
): Promise<StellarSdk.Transaction> {
    const server = getSorobanServer();
    const contract = new Contract(CONTRACTS.SOROSUB);

    const subscriber = new Address(subscriberPublicKey);
    const provider = new Address(providerAddress);
    const token = new Address(tokenAddress);
    const amountScVal = nativeToScVal(toStroops(amount), { type: 'i128' });
    const intervalScVal = nativeToScVal(BigInt(intervalSeconds), { type: 'u64' });

    const operation = contract.call(
        'create_subscription',
        subscriber.toScVal(),
        provider.toScVal(),
        token.toScVal(),
        amountScVal,
        intervalScVal
    );

    const account = await server.getAccount(subscriberPublicKey);

    const transaction = new TransactionBuilder(account, {
        fee: '100000', // 0.01 XLM
        networkPassphrase: NETWORK.networkPassphrase,
    })
        .addOperation(operation)
        .setTimeout(300)
        .build();

    // Prepare the transaction (simulate and get footprint)
    const preparedTx = await server.prepareTransaction(transaction);

    return preparedTx as StellarSdk.Transaction;
}

// Build a transaction for canceling a subscription
export async function buildCancelSubscriptionTx(
    subscriberPublicKey: string,
    providerAddress: string
): Promise<StellarSdk.Transaction> {
    const server = getSorobanServer();
    const contract = new Contract(CONTRACTS.SOROSUB);

    const subscriber = new Address(subscriberPublicKey);
    const provider = new Address(providerAddress);

    const operation = contract.call(
        'cancel_subscription',
        subscriber.toScVal(),
        provider.toScVal()
    );

    const account = await server.getAccount(subscriberPublicKey);

    const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: NETWORK.networkPassphrase,
    })
        .addOperation(operation)
        .setTimeout(300)
        .build();

    const preparedTx = await server.prepareTransaction(transaction);

    return preparedTx as StellarSdk.Transaction;
}

// Build a transaction for approving token allowance
export async function buildApproveTokenTx(
    ownerPublicKey: string,
    tokenAddress: string,
    spenderAddress: string,
    amount: number,
    expirationLedger: number
): Promise<StellarSdk.Transaction> {
    const server = getSorobanServer();
    const tokenContract = new Contract(tokenAddress);

    const from = new Address(ownerPublicKey);
    const spender = new Address(spenderAddress);
    const amountScVal = nativeToScVal(toStroops(amount), { type: 'i128' });
    const expirationScVal = nativeToScVal(expirationLedger, { type: 'u32' });

    const operation = tokenContract.call(
        'approve',
        from.toScVal(),
        spender.toScVal(),
        amountScVal,
        expirationScVal
    );

    const account = await server.getAccount(ownerPublicKey);

    const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: NETWORK.networkPassphrase,
    })
        .addOperation(operation)
        .setTimeout(300)
        .build();

    const preparedTx = await server.prepareTransaction(transaction);

    return preparedTx as StellarSdk.Transaction;
}

// Submit a signed transaction
export async function submitTransaction(
    signedTxXdr: string
): Promise<StellarSdk.rpc.Api.GetTransactionResponse> {
    const server = getSorobanServer();
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        NETWORK.networkPassphrase
    );

    const response = await server.sendTransaction(transaction);

    if (response.status === 'PENDING') {
        // Wait for transaction to complete
        let getResponse = await server.getTransaction(response.hash);

        while (getResponse.status === 'NOT_FOUND') {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            getResponse = await server.getTransaction(response.hash);
        }

        return getResponse;
    }

    throw new Error(`Transaction failed: ${response.status}`);
}

// Get subscription details (read-only, no signing needed)
export async function getSubscription(
    subscriberAddress: string,
    providerAddress: string
): Promise<Subscription | null> {
    try {
        const server = getSorobanServer();
        const contract = new Contract(CONTRACTS.SOROSUB);

        const subscriber = new Address(subscriberAddress);
        const provider = new Address(providerAddress);

        // For read-only calls, we need a source account but won't sign
        const account = await server.getAccount(subscriberAddress);

        const transaction = new TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK.networkPassphrase,
        })
            .addOperation(
                contract.call(
                    'get_subscription',
                    subscriber.toScVal(),
                    provider.toScVal()
                )
            )
            .setTimeout(30)
            .build();

        const response = await server.simulateTransaction(transaction);

        if ('result' in response && response.result) {
            // Parse the subscription struct from the response
            // This is a simplified version - actual parsing depends on the response format
            return parseSubscription(response.result.retval);
        }

        return null;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
    }
}

// Parse subscription ScVal to Subscription interface
function parseSubscription(scVal: StellarSdk.xdr.ScVal): Subscription {
    const map = scVal.map();
    if (!map) throw new Error('Invalid subscription data');

    const result: Partial<Subscription> = {};

    for (const entry of map) {
        const key = entry.key().sym().toString();
        const val = entry.val();

        switch (key) {
            case 'token':
                result.token = Address.fromScVal(val).toString();
                break;
            case 'amount':
                result.amount = val.i128().lo().toBigInt();
                break;
            case 'interval':
                result.interval = val.u64().toBigInt();
                break;
            case 'last_payment':
                result.lastPayment = val.u64().toBigInt();
                break;
            case 'is_active':
                result.isActive = val.b();
                break;
        }
    }

    return result as Subscription;
}

// Get user's credit score from a subscription
export async function getCreditScore(
    subscriberAddress: string,
    merchantAddress: string
): Promise<number | null> {
    try {
        const server = getSorobanServer();
        const contract = new Contract(CONTRACTS.SOROSUB);

        const subscriber = new Address(subscriberAddress);
        const merchant = new Address(merchantAddress);

        const account = await server.getAccount(subscriberAddress);

        const transaction = new TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK.networkPassphrase,
        })
            .addOperation(
                contract.call(
                    'get_credit_score',
                    subscriber.toScVal(),
                    merchant.toScVal()
                )
            )
            .setTimeout(30)
            .build();

        const response = await server.simulateTransaction(transaction);

        if ('result' in response && response.result) {
            // Parse u32 from response
            return response.result.retval.u32();
        }

        return null;
    } catch (error) {
        // Account not found is expected for new/unfunded wallets - don't log as error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Account not found')) {
            console.error('Error fetching credit score:', error);
        }
        return null;
    }
}

// Get user's outstanding BNPL debt
export async function getUserDebt(
    userAddress: string
): Promise<{ amount: bigint; token: string } | null> {
    try {
        const server = getSorobanServer();
        const contract = new Contract(CONTRACTS.SOROSUB);

        const user = new Address(userAddress);
        const account = await server.getAccount(userAddress);

        const transaction = new TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK.networkPassphrase,
        })
            .addOperation(
                contract.call('get_user_debt', user.toScVal())
            )
            .setTimeout(30)
            .build();

        const response = await server.simulateTransaction(transaction);

        if ('result' in response && response.result) {
            const retval = response.result.retval;

            // Check if it's None (no debt)
            if (!retval || retval.switch().name === 'scvVoid') {
                return null;
            }

            // Parse UserDebt struct from Option
            const debtVal = retval.value() as StellarSdk.xdr.ScVal | undefined;
            if (!debtVal) return null;

            const map = debtVal.map();
            if (!map) return null;

            let amount: bigint = BigInt(0);
            let token: string = '';

            for (const entry of map) {
                const key = entry.key().sym().toString();
                const val = entry.val();

                if (key === 'amount') {
                    amount = val.i128().lo().toBigInt();
                } else if (key === 'token') {
                    token = Address.fromScVal(val).toString();
                }
            }

            return { amount, token };
        }

        return null;
    } catch (error) {
        // Account not found is expected for new/unfunded wallets - don't log as error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Account not found')) {
            console.error('Error fetching user debt:', error);
        }
        return null;
    }
}

// Build a transaction for repaying BNPL debt
export async function buildRepayDebtTx(
    userPublicKey: string,
    amount: number
): Promise<StellarSdk.Transaction> {
    const server = getSorobanServer();
    const contract = new Contract(CONTRACTS.SOROSUB);

    const user = new Address(userPublicKey);
    const amountScVal = nativeToScVal(toStroops(amount), { type: 'i128' });

    const operation = contract.call(
        'repay_debt',
        user.toScVal(),
        amountScVal
    );

    const account = await server.getAccount(userPublicKey);

    const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: NETWORK.networkPassphrase,
    })
        .addOperation(operation)
        .setTimeout(300)
        .build();

    const preparedTx = await server.prepareTransaction(transaction);

    return preparedTx as StellarSdk.Transaction;
}

// Build a transaction for collecting a subscription payment (merchant triggers)
export async function buildCollectPaymentTx(
    callerPublicKey: string,
    subscriberAddress: string,
    merchantAddress: string
): Promise<StellarSdk.Transaction> {
    const server = getSorobanServer();
    const contract = new Contract(CONTRACTS.SOROSUB);

    const subscriber = new Address(subscriberAddress);
    const merchant = new Address(merchantAddress);

    const operation = contract.call(
        'collect_payment',
        subscriber.toScVal(),
        merchant.toScVal()
    );

    const account = await server.getAccount(callerPublicKey);

    const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: NETWORK.networkPassphrase,
    })
        .addOperation(operation)
        .setTimeout(300)
        .build();

    const preparedTx = await server.prepareTransaction(transaction);

    return preparedTx as StellarSdk.Transaction;
}

// Check if a payment can be processed
export async function canProcessPayment(
    subscriberAddress: string,
    merchantAddress: string
): Promise<boolean> {
    try {
        const server = getSorobanServer();
        const contract = new Contract(CONTRACTS.SOROSUB);

        const subscriber = new Address(subscriberAddress);
        const merchant = new Address(merchantAddress);

        const account = await server.getAccount(subscriberAddress);

        const transaction = new TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK.networkPassphrase,
        })
            .addOperation(
                contract.call(
                    'can_process_payment',
                    subscriber.toScVal(),
                    merchant.toScVal()
                )
            )
            .setTimeout(30)
            .build();

        const response = await server.simulateTransaction(transaction);

        if ('result' in response && response.result) {
            return response.result.retval.b() ?? false;
        }

        return false;
    } catch (error) {
        console.error('Error checking payment status:', error);
        return false;
    }
}
