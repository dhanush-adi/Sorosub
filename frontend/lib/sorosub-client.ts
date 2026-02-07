// SoroSub Contract Client
// Provides functions to interact with the SoroSub smart contract

import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACTS, NETWORK, getSorobanServer, toStroops } from './stellar';

const { Contract, TransactionBuilder, xdr, Address, nativeToScVal } = StellarSdk;

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
): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
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
function parseSubscription(scVal: xdr.ScVal): Subscription {
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
