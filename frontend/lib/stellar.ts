// Stellar Network Configuration and SoroSub Contract Client
import * as StellarSdk from '@stellar/stellar-sdk';

// Network Configuration
export const NETWORK = {
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
};

// Contract IDs (deployed to testnet)
export const CONTRACTS = {
    // SoroSub contract deployed on Stellar Testnet (newly deployed)
    SOROSUB: 'CDDVY4S7WECSHRUVTNFIA4372SDTHKCBX6FJGGULZ6BBLTY6WTKGQOSO',
    // Native XLM as SAC token (user has ~10k XLM!)
    USDC: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
};

// Create a Soroban RPC server client
export function getSorobanServer() {
    return new StellarSdk.rpc.Server(NETWORK.rpcUrl);
}

// Create a Horizon server client
export function getHorizonServer() {
    return new StellarSdk.Horizon.Server(NETWORK.horizonUrl);
}

// Format a Stellar address for display (truncate middle)
export function formatAddress(address: string, chars = 4): string {
    if (!address || address.length < chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Convert amount to stroops (1 XLM = 10^7 stroops, tokens use same precision)
export function toStroops(amount: number): bigint {
    return BigInt(Math.floor(amount * 10_000_000));
}

// Convert stroops to amount
export function fromStroops(stroops: bigint | string): number {
    const value = typeof stroops === 'string' ? BigInt(stroops) : stroops;
    return Number(value) / 10_000_000;
}

// Interval presets in seconds
export const INTERVALS = {
    WEEKLY: 7 * 24 * 60 * 60,
    MONTHLY: 30 * 24 * 60 * 60,
    YEARLY: 365 * 24 * 60 * 60,
} as const;

export type IntervalType = keyof typeof INTERVALS;
