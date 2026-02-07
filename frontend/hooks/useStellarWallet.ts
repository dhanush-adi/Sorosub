"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isConnected as freighterIsConnected,
  getAddress,
  requestAccess,
  signTransaction,
  isAllowed,
  setAllowed,
} from "@stellar/freighter-api";
import { NETWORK } from "@/lib/stellar";

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
    if (typeof window === "undefined") {
      return false;
    }

    // Check for window.freighter object first (most reliable)
    if (typeof (window as any).freighter !== "undefined") {
      return true;
    }

    // Wait a bit for extension to inject, then retry
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (typeof (window as any).freighter !== "undefined") {
      return true;
    }

    // Fallback to API check
    try {
      const result = await freighterIsConnected();
      return result?.isConnected ?? false;
    } catch {
      return false;
    }
  }, []);

  // Check connection status on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      setState({
        isConnected: false,
        isLoading: false,
        publicKey: null,
        error: null,
      });
      return;
    }

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
          if (addressResult?.error) {
            setState({
              isConnected: false,
              isLoading: false,
              publicKey: null,
              error: null,
            });
          } else {
            const publicKey = addressResult?.address ?? null;
            setState({
              isConnected: !!publicKey,
              isLoading: false,
              publicKey,
              error: null,
            });
          }
        } else {
          setState({
            isConnected: false,
            isLoading: false,
            publicKey: null,
            error: null,
          });
        }
      } catch (error) {
        console.error("Wallet check error:", error);
        setState({
          isConnected: false,
          isLoading: false,
          publicKey: null,
          error: "Failed to check wallet connection",
        });
      }
    };

    checkConnection();
  }, [isFreighterInstalled]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (typeof window === "undefined") {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Wallet connection is only available in browser",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const installed = await isFreighterInstalled();

      if (!installed) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            "Freighter wallet not installed. Please install it from freighter.app",
        }));
        return false;
      }

      // Request access - this will prompt user to connect
      const accessResult = await requestAccess();

      if (accessResult?.error) {
        setState({
          isConnected: false,
          isLoading: false,
          publicKey: null,
          error: accessResult.error.message || "Failed to connect wallet",
        });
        return false;
      }

      const publicKey = accessResult?.address ?? null;

      if (!publicKey) {
        throw new Error("Failed to get wallet address");
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
        error:
          error instanceof Error ? error.message : "Failed to connect wallet",
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
        setState((prev) => ({ ...prev, error: "Wallet not connected" }));
        return null;
      }

      try {
        const result = await signTransaction(transactionXdr, {
          address: state.publicKey,
          networkPassphrase: NETWORK.networkPassphrase,
        });

        if (result?.error) {
          setState((prev) => ({
            ...prev,
            error: result.error?.message || "Failed to sign transaction",
          }));
          return null;
        }

        return result?.signedTxXdr ?? null;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to sign transaction",
        }));
        return null;
      }
    },
    [state.isConnected, state.publicKey],
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
