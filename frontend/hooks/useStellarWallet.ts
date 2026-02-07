'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    isConnected as freighterIsConnected,
    getPublicKey,
    signTransaction,
    isAllowed,
    setAllowed,
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
            const connected = await freighterIsConnected();
            return connected.isConnected;
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

                const allowed = await isAllowed();

                if (allowed.isAllowed) {
                    const { publicKey } = await getPublicKey();
                    setState({
                        isConnected: true,
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

            // Request permission
            await setAllowed();

            // Get public key
            const { publicKey } = await getPublicKey();

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
                const { signedTxXdr } = await signTransaction(transactionXdr, {
                    networkPassphrase: NETWORK.networkPassphrase,
                });
                return signedTxXdr;
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
