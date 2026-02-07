import { useState, useEffect, useCallback } from 'react'
import { useStellarWallet } from './useStellarWallet'
import { getSubscription, getUserSubscriptions, getTokenBalance, getUserDebt, getCreditScore } from '@/lib/sorosub-client'
import { fromStroops } from '@/lib/stellar'

export interface SubscriptionInfo {
  providerAddress: string
  token: string
  amount: bigint
  interval: bigint
  lastPayment: bigint
  isActive: boolean
}

export interface WalletData {
  subscriptions: SubscriptionInfo[]
  balance: number
  debt: number
  creditScore: number
  loading: boolean
  error: string | null
}

export function useWalletData() {
  const { isConnected, publicKey } = useStellarWallet()
  const [data, setData] = useState<WalletData>({
    subscriptions: [],
    balance: 0,
    debt: 0,
    creditScore: 750, // Default
    loading: false,
    error: null,
  })

  const fetchData = useCallback(async () => {
    if (!isConnected || !publicKey) {
      setData({
        subscriptions: [],
        balance: 0,
        debt: 0,
        creditScore: 750,
        loading: false,
        error: null,
      })
      return
    }

    setData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Fetch all data in parallel
      const [subscriptions, balance, debt, creditScore] = await Promise.all([
        getUserSubscriptions(publicKey).catch(() => []),
        getTokenBalance(publicKey).catch(() => 0),
        getUserDebt(publicKey).catch(() => BigInt(0)),
        getCreditScore(publicKey).catch(() => 750),
      ])

      setData({
        subscriptions,
        balance,
        debt: fromStroops(debt),
        creditScore,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load wallet data',
      }))
    }
  }, [isConnected, publicKey])

  // Fetch data when wallet connects or changes
  useEffect(() => {
    fetchData()

    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { ...data, refetch: fetchData }
}
