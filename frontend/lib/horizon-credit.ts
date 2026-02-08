// Horizon-based Credit Score Calculation
// Uses real on-chain data from Stellar Horizon API

import { getHorizonServer } from './stellar';

export interface HorizonCreditData {
    accountAgeBonus: number;      // 0-15 points based on account age
    paymentActivityBonus: number; // 0-20 points based on payment count
    transactionBonus: number;     // 0-15 points based on total transactions
    balanceBonus: number;         // 0-10 points based on XLM balance
    totalHorizonScore: number;    // Sum of all bonuses
    rawData: {
        accountSequence: string;
        paymentCount: number;
        transactionCount: number;
        xlmBalance: number;
    };
}

/**
 * Fetches real wallet activity data from Horizon API and calculates credit score components
 * This provides anti-bot verification by using real on-chain activity
 */
export async function getHorizonCreditData(publicKey: string): Promise<HorizonCreditData | null> {
    try {
        const horizon = getHorizonServer();

        // 1. Fetch account data
        let account;
        try {
            account = await horizon.accounts().accountId(publicKey).call();
        } catch (accountError: unknown) {
            // Account doesn't exist on testnet (404) - not funded yet
            const error = accountError as { response?: { status?: number } };
            if (error?.response?.status === 404) {
                console.log('[Horizon Credit] Account not found on testnet - using default score');
                return {
                    accountAgeBonus: 0,
                    paymentActivityBonus: 0,
                    transactionBonus: 0,
                    balanceBonus: 0,
                    totalHorizonScore: 0,
                    rawData: {
                        accountSequence: '0',
                        paymentCount: 0,
                        transactionCount: 0,
                        xlmBalance: 0
                    }
                };
            }
            throw accountError; // Re-throw if it's a different error
        }

        // 2. Calculate account "age" based on sequence number
        // Higher sequence = more transactions over time = older/more active account
        const sequence = parseInt(account.sequence);
        let accountAgeBonus = 0;
        if (sequence > 100) accountAgeBonus = 15;       // Very active account
        else if (sequence > 50) accountAgeBonus = 10;   // Active account
        else if (sequence > 10) accountAgeBonus = 5;    // Some activity
        // else 0 for new accounts

        // 3. Get XLM balance
        const xlmBalanceEntry = account.balances.find(
            (b: { asset_type: string }) => b.asset_type === 'native'
        );
        const xlmBalance = xlmBalanceEntry ? parseFloat(xlmBalanceEntry.balance) : 0;

        // Balance bonus (max 10 points)
        let balanceBonus = 0;
        if (xlmBalance >= 1000) balanceBonus = 10;
        else if (xlmBalance >= 100) balanceBonus = 7;
        else if (xlmBalance >= 10) balanceBonus = 4;
        else if (xlmBalance >= 1) balanceBonus = 2;

        // 4. Fetch payment history
        let paymentCount = 0;
        try {
            const payments = await horizon.payments()
                .forAccount(publicKey)
                .limit(100)
                .order('desc')
                .call();

            // Count actual payments (not account creation, etc.)
            paymentCount = payments.records.filter(
                (p: { type: string }) =>
                    p.type === 'payment' ||
                    p.type === 'path_payment_strict_receive' ||
                    p.type === 'path_payment_strict_send'
            ).length;
        } catch (e) {
            console.log('Could not fetch payments:', e);
        }

        // Payment activity bonus (max 20 points)
        const paymentActivityBonus = Math.min(paymentCount, 20);

        // 5. Fetch transaction count
        let transactionCount = 0;
        try {
            const transactions = await horizon.transactions()
                .forAccount(publicKey)
                .limit(100)
                .order('desc')
                .call();
            transactionCount = transactions.records.length;
        } catch (e) {
            console.log('Could not fetch transactions:', e);
        }

        // Transaction bonus (max 15 points)
        let transactionBonus = 0;
        if (transactionCount >= 50) transactionBonus = 15;
        else if (transactionCount >= 20) transactionBonus = 10;
        else if (transactionCount >= 5) transactionBonus = 5;

        const totalHorizonScore = accountAgeBonus + paymentActivityBonus + transactionBonus + balanceBonus;

        console.log(`[Horizon Credit] Account: ${publicKey.slice(0, 8)}...`);
        console.log(`[Horizon Credit] Sequence: ${sequence}, Payments: ${paymentCount}, Txns: ${transactionCount}, XLM: ${xlmBalance.toFixed(2)}`);
        console.log(`[Horizon Credit] Score breakdown: Age=${accountAgeBonus} + Payments=${paymentActivityBonus} + Txns=${transactionBonus} + Balance=${balanceBonus} = ${totalHorizonScore}`);

        return {
            accountAgeBonus,
            paymentActivityBonus,
            transactionBonus,
            balanceBonus,
            totalHorizonScore,
            rawData: {
                accountSequence: account.sequence,
                paymentCount,
                transactionCount,
                xlmBalance
            }
        };
    } catch (error) {
        console.error('[Horizon Credit] Error fetching account data:', error);
        return null;
    }
}
