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
export function fromStroops(stroops: bigint | string | { lo: bigint; hi: bigint } | unknown): number {
    try {
        let value: bigint;

        if (typeof stroops === 'bigint') {
            value = stroops;
        } else if (typeof stroops === 'string') {
            // Guard against "[object Object]" strings
            if (stroops === '[object Object]') {
                console.warn('fromStroops received "[object Object]" string');
                return 0;
            }
            value = BigInt(stroops);
        } else if (typeof stroops === 'number') {
            value = BigInt(Math.floor(stroops));
        } else if (stroops && typeof stroops === 'object') {
            // Handle i128 object from Soroban
            const obj = stroops as Record<string, unknown>;

            // Try to get value from common patterns
            // Pattern 1: _value property (bigint)
            if ('_value' in obj && typeof obj._value === 'bigint') {
                value = obj._value;
            }
            // Pattern 2: lo/hi as methods (Stellar SDK i128)
            else if ('lo' in obj && 'hi' in obj) {
                const loVal = typeof obj.lo === 'function' ? (obj.lo as () => bigint)() : obj.lo;
                const hiVal = typeof obj.hi === 'function' ? (obj.hi as () => bigint)() : obj.hi;

                // Convert to bigint if not already
                const lo = typeof loVal === 'bigint' ? loVal : BigInt(String(loVal));
                const hi = typeof hiVal === 'bigint' ? hiVal : BigInt(String(hiVal));

                value = (hi << BigInt(64)) + lo;
            }
            // Pattern 3: toString method that returns numeric string
            else if ('toString' in obj && typeof obj.toString === 'function') {
                const str = obj.toString();
                if (str && str !== '[object Object]' && /^-?\d+$/.test(str)) {
                    value = BigInt(str);
                } else {
                    console.warn('fromStroops: toString() did not return numeric string:', str);
                    return 0;
                }
            }
            // Pattern 4: value() method
            else if ('value' in obj && typeof obj.value === 'function') {
                const val = (obj.value as () => unknown)();
                if (typeof val === 'bigint') {
                    value = val;
                } else if (typeof val === 'string' || typeof val === 'number') {
                    value = BigInt(val);
                } else {
                    console.warn('Unknown value() result in fromStroops:', val);
                    return 0;
                }
            }
            else {
                console.warn('Unknown object format in fromStroops:', Object.keys(obj), stroops);
                return 0;
            }
        } else {
            console.warn('Invalid type for fromStroops:', typeof stroops, stroops);
            return 0;
        }

        return Number(value) / 10_000_000;
    } catch (error) {
        console.error('Error in fromStroops:', error, 'Input:', stroops);
        return 0;
    }
}

// Interval presets in seconds
export const INTERVALS = {
    WEEKLY: 7 * 24 * 60 * 60,
    MONTHLY: 30 * 24 * 60 * 60,
    YEARLY: 365 * 24 * 60 * 60,
} as const;

export type IntervalType = keyof typeof INTERVALS;
