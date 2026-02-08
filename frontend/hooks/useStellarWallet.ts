"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isConnected as freighterIsConnected,
  getAddress,
  requestAccess,
  signTransaction,
  signMessage,
} from "@stellar/freighter-api";
import { NETWORK } from "@/lib/stellar";

interface WalletState {
  isConnected: boolean;
  isLoading: boolean;
  publicKey: string | null;
  error: string | null;
}

// Global state to share across all hook instances
let globalState: WalletState = {
  isConnected: false,
  isLoading: false,
  publicKey: null,
  error: null,
};
let listeners: ((state: WalletState) => void)[] = [];

function setGlobalState(newState: WalletState) {
  globalState = newState;
  listeners.forEach((listener) => listener(newState));
}

export function useStellarWallet() {
  const [state, setState] = useState<WalletState>(globalState);

  // Subscribe to global state changes
  useEffect(() => {
    setState(globalState); // Sync on mount
    const listener = (newState: WalletState) => setState(newState);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  // Auto-check connection on mount (restore session)
  useEffect(() => {
    const checkExistingConnection = async () => {
      // Skip if already connected or loading
      if (globalState.isConnected || globalState.isLoading) return;

      // Skip on server
      if (typeof window === "undefined") return;

      try {
        // Check if Freighter is connected
        const connResult = await freighterIsConnected();
        if (!connResult) return;

        // Try to get address without popup (if already authorized)
        const addressResult = await getAddress();
        if (addressResult?.address) {
          // Wallet is already authorized, restore connection
          setGlobalState({
            isConnected: true,
            isLoading: false,
            publicKey: addressResult.address,
            error: null,
          });
          console.log('[Wallet] Auto-restored connection:', addressResult.address.slice(0, 8) + '...');
        }
      } catch {
        // Silent fail - user will need to manually connect
      }
    };

    checkExistingConnection();
  }, []);

  // Check if Freighter is installed
  const isFreighterInstalled = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    return typeof (window as any).freighter !== "undefined";
  }, []);

  // Connect wallet - ALWAYS triggers popup via signMessage
  const connect = useCallback(async () => {
    if (typeof window === "undefined") {
      setGlobalState({
        ...globalState,
        isLoading: false,
        error: "Wallet connection is only available in browser",
      });
      return false;
    }

    setGlobalState({ ...globalState, isLoading: true, error: null });

    try {
      // Use official API to check if Freighter is available
      let installed = false;
      try {
        const connResult = await freighterIsConnected();
        // If we get any response, Freighter is installed
        installed = connResult !== undefined;
      } catch {
        // If API throws, extension might not be injected yet
        // Try direct window check as fallback
        await new Promise((resolve) => setTimeout(resolve, 500));
        installed = typeof (window as any).freighter !== "undefined";
      }

      if (!installed) {
        setGlobalState({
          isConnected: false,
          isLoading: false,
          publicKey: null,
          error: "Freighter wallet not installed. Please install it from freighter.app",
        });
        return false;
      }

      // Request access first
      const accessResult = await requestAccess();
      if (accessResult?.error) {
        setGlobalState({
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

      // FORCE POPUP: Sign a message to prove wallet ownership
      try {
        const signResult = await signMessage("Connect to SoroSub", {
          address: publicKey,
          networkPassphrase: NETWORK.networkPassphrase,
        });

        if (signResult?.error) {
          // User rejected - stay disconnected
          setGlobalState({
            isConnected: false,
            isLoading: false,
            publicKey: null,
            error: null,
          });
          return false;
        }
      } catch {
        // User rejected signing
        setGlobalState({
          isConnected: false,
          isLoading: false,
          publicKey: null,
          error: null,
        });
        return false;
      }

      // Successfully connected and signed
      setGlobalState({
        isConnected: true,
        isLoading: false,
        publicKey,
        error: null,
      });

      return true;
    } catch (error) {
      setGlobalState({
        isConnected: false,
        isLoading: false,
        publicKey: null,
        error: error instanceof Error ? error.message : "Failed to connect wallet",
      });
      return false;
    }
  }, []);

  // Disconnect wallet - clears all state
  const disconnect = useCallback(() => {
    setGlobalState({
      isConnected: false,
      isLoading: false,
      publicKey: null,
      error: null,
    });
  }, []);

  // Sign a transaction
  const sign = useCallback(
    async (transactionXdr: string): Promise<string | null> => {
      if (!globalState.isConnected || !globalState.publicKey) {
        setGlobalState({ ...globalState, error: "Wallet not connected" });
        return null;
      }

      try {
        const result = await signTransaction(transactionXdr, {
          address: globalState.publicKey,
          networkPassphrase: NETWORK.networkPassphrase,
        });

        if (result?.error) {
          setGlobalState({
            ...globalState,
            error: result.error?.message || "Failed to sign transaction",
          });
          return null;
        }

        return result?.signedTxXdr ?? null;
      } catch (error) {
        setGlobalState({
          ...globalState,
          error: error instanceof Error ? error.message : "Failed to sign transaction",
        });
        return null;
      }
    },
    [],
  );

  // Clear error
  const clearError = useCallback(() => {
    setGlobalState({ ...globalState, error: null });
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
