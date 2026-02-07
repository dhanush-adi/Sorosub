"use client";

import { useState, useEffect, useCallback } from "react";
import { useStellarWallet } from "./useStellarWallet";
import {
  getUserSubscriptions,
  getCreditScore,
  getUserDebt,
  getTokenBalance,
  SubscriptionInfo,
} from "@/lib/sorosub-client";
import { CONTRACTS, fromStroops } from "@/lib/stellar";

interface WalletData {
  subscriptions: SubscriptionInfo[];
  creditScore: number;
  usdcBalance: number;
  debt: { amount: bigint; token: string } | null;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

// Known provider addresses to check for subscriptions
const KNOWN_PROVIDERS = [
  'GDEMO1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'GDEMO2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  'GDEMO3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  'GDEMO4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  'GDEMO5EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
  'GDEMO6FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  'GDEMO7GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GDEMO8HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH',
];

export function useWalletData(): WalletData {
  const { isConnected, publicKey } = useStellarWallet();
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [creditScore, setCreditScore] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [debt, setDebt] = useState<{ amount: bigint; token: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!isConnected || !publicKey) {
      // Clear data when disconnected
      console.log('[useWalletData] Not connected or no publicKey:', { isConnected, publicKey });
      setSubscriptions([]);
      setCreditScore(0);
      setUsdcBalance(0);
      setDebt(null);
      return;
    }

    console.log('[useWalletData] Fetching wallet data for:', publicKey);
    setIsLoading(true);

    try {
      // Fetch all data in parallel for better performance
      console.log('[useWalletData] Starting parallel fetch...');
      const [subs, balance, userDebt] = await Promise.all([
        getUserSubscriptions(publicKey, KNOWN_PROVIDERS),
        getTokenBalance(publicKey, CONTRACTS.USDC),
        getUserDebt(publicKey),
      ]);

      console.log('[useWalletData] Fetched data:', { 
        subscriptions: subs.length, 
        balance: balance.toString(), 
        debt: userDebt 
      });

      setSubscriptions(subs);
      setUsdcBalance(fromStroops(balance));
      setDebt(userDebt);

      // Fetch credit score for first provider if exists, otherwise use default merchant
      const merchantAddress = subs.length > 0 
        ? subs[0].providerAddress 
        : KNOWN_PROVIDERS[0];
      
      const score = await getCreditScore(publicKey, merchantAddress);
      console.log('[useWalletData] Credit score:', score);
      setCreditScore(score ?? 0);

    } catch (error) {
      console.error("[useWalletData] Error fetching wallet data:", error);
      // Set default values on error
      setSubscriptions([]);
      setCreditScore(0);
      setUsdcBalance(0);
      setDebt(null);
    } finally {
      setIsLoading(false);
      console.log('[useWalletData] Fetch complete');
    }
  }, [isConnected, publicKey]);

  // Fetch data when wallet connects or public key changes
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    subscriptions,
    creditScore,
    usdcBalance,
    debt,
    isLoading,
    refreshData: fetchAllData,
  };
}
