'use client';

import { useState, useEffect, useCallback } from 'react';
import freighter, {
    isConnected as freighterIsConnected,
    getAddress,
    signTransaction,
    isAllowed,
    setAllowed,
    requestAccess,
} from '@stellar/freighter-api';
import { NETWORK } from '@/lib/stellar';

interface WalletState {
    isConnected: boolean;
    isLoading: boolean;
    publicKey: string | null;
    error: string | null;
}

export function useStellarWallet() {
    const [state, setState] = useState<WalletState>({
        isConnected: false,
        isLoading: true,
        publicKey: null,
        error: null,
    });

    // Check if Freighter is installed
    const isFreighterInstalled = useCallback(async (): Promise<boolean> => {
        try {
            // Try both the named export and the default export
            const result = await freighterIsConnected();
            // v6 returns an object with isConnected property
            return result?.isConnected ?? false;
        } catch {
            return false;
        }
    }, []);

    // Check connection status on mount
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const installed = await isFreighterInstalled();

                if (!installed) {
                    setState({
                        isConnected: false,
                        isLoading: false,
                        publicKey: null,
                        error: null,
                    });
                    return;
                }

                // Check if we're allowed to access the wallet
                const allowedResult = await isAllowed();
                const allowed = allowedResult?.isAllowed ?? false;

                if (allowed) {
                    // getAddress replaces getPublicKey in v6
                    const addressResult = await getAddress();
                    const publicKey = addressResult?.address ?? null;

                    setState({
                        isConnected: !!publicKey,
                        isLoading: false,
                        publicKey,
                        error: null,
                    });
                } else {
                    setState({
                        isConnected: false,
                        isLoading: false,
                        publicKey: null,
                        error: null,
                    });
                }
            } catch (error) {
                console.error('Wallet check error:', error);
                setState({
                    isConnected: false,
                    isLoading: false,
                    publicKey: null,
                    error: 'Failed to check wallet connection',
                });
            }
        };

        checkConnection();
    }, [isFreighterInstalled]);

    // Connect wallet
    const connect = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            const installed = await isFreighterInstalled();

            if (!installed) {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: 'Freighter wallet not installed. Please install it from freighter.app',
                }));
                return false;
            }

            // Request permission using requestAccess or setAllowed
            try {
                await requestAccess();
            } catch {
                await setAllowed();
            }

            // Get public key using getAddress (v6 API)
            const addressResult = await getAddress();
            const publicKey = addressResult?.address ?? null;

            if (!publicKey) {
                throw new Error('Failed to get wallet address');
            }

            setState({
                isConnected: true,
                isLoading: false,
                publicKey,
                error: null,
            });

            return true;
        } catch (error) {
            setState({
                isConnected: false,
                isLoading: false,
                publicKey: null,
                error: error instanceof Error ? error.message : 'Failed to connect wallet',
            });
            return false;
        }
    }, [isFreighterInstalled]);

    // Disconnect wallet (just clear local state, Freighter handles actual connection)
    const disconnect = useCallback(() => {
        setState({
            isConnected: false,
            isLoading: false,
            publicKey: null,
            error: null,
        });
    }, []);

    // Sign a transaction
    const sign = useCallback(
        async (transactionXdr: string): Promise<string | null> => {
            if (!state.isConnected || !state.publicKey) {
                setState((prev) => ({ ...prev, error: 'Wallet not connected' }));
                return null;
            }

            try {
                const result = await signTransaction(transactionXdr, {
                    networkPassphrase: NETWORK.networkPassphrase,
                });
                // v6 returns an object with signedTxXdr property
                return result?.signedTxXdr ?? null;
            } catch (error) {
                setState((prev) => ({
                    ...prev,
                    error: error instanceof Error ? error.message : 'Failed to sign transaction',
                }));
                return null;
            }
        },
        [state.isConnected, state.publicKey]
    );

    // Clear error
    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    return {
        ...state,
        connect,
        disconnect,
        sign,
        clearError,
        isFreighterInstalled,
    };
}
