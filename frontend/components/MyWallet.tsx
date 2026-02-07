'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Send, Plus, TrendingUp, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, Wallet, Zap, Music, PieChart, Loader2 } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { useWalletData } from '@/hooks/useWalletData'
import { formatAddress } from '@/lib/stellar'
import SubscriptionCard from '@/components/SubscriptionCard'
import { buildCancelSubscriptionTx, submitTransaction } from '@/lib/sorosub-client'
import { getStoredSubscriptions, removeSubscription, StoredSubscription } from '@/lib/subscription-storage'

interface Asset {
  id: string
  name: string
  symbol: string
  balance: string
  value: string
  change: string
  trend: 'up' | 'down'
}

interface Transaction {
  id: string
  type: 'in' | 'out'
  description: string
  amount: string
  symbol: string
  date: string
  status: 'completed' | 'pending'
}

interface Subscription {
  id: string
  name: string
  icon: React.ReactNode
  providerAddress: string
  cost: string
  renewalDate: string
  status: 'active' | 'pending' | 'expiring'
}

export default function MyWallet() {
  const { isConnected, isLoading, publicKey, connect, sign } = useStellarWallet()
  const { balance, subscriptions: walletSubscriptions, loading: walletLoading, refetch } = useWalletData()
  const [showBalance, setShowBalance] = useState(true)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [localSubscriptions, setLocalSubscriptions] = useState<StoredSubscription[]>([])

  // Ensure we're on client side before checking wallet
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load subscriptions from localStorage and keep them updated
  useEffect(() => {
    const loadSubscriptions = () => {
      const stored = getStoredSubscriptions()
      setLocalSubscriptions(stored)
    }

    loadSubscriptions()

    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(loadSubscriptions, 30000)
    window.addEventListener('storage', loadSubscriptions)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', loadSubscriptions)
    }
  }, [])

  // Refetch wallet data when connected
  useEffect(() => {
    if (isConnected && publicKey) {
      refetch()
    }
  }, [isConnected, publicKey, refetch])

  // Map service names to icons
  const getServiceIcon = (name: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      'DeFi Analytics Pro': <PieChart className="w-5 h-5" />,
      'AI Trading Bot': <TrendingUp className="w-5 h-5" />,
      'Security Guardian': <Zap className="w-5 h-5" />,
      'Stellar News Feed': <Music className="w-5 h-5" />,
      'Performance Gauge': <Zap className="w-5 h-5" />,
      'Database Access': <PieChart className="w-5 h-5" />,
      'Smart Contract Dev': <Music className="w-5 h-5" />,
      'Lightning Network': <Zap className="w-5 h-5" />,
    }
    return icons[name] || <Zap className="w-5 h-5" />
  }

  // Convert stored subscriptions to display format
  const subscriptions = localSubscriptions.map((sub) => ({
    id: sub.id,
    name: sub.name,
    icon: getServiceIcon(sub.name),
    providerAddress: sub.providerAddress,
    cost: `${sub.amount.toFixed(2)} XLM`,
    renewalDate: new Date(sub.createdAt + sub.intervalSeconds * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    status: 'active' as const,
  }))

  const assets: Asset[] = [
    {
      id: '1',
      name: 'USDC Coin',
      symbol: 'USDC',
      balance: '2,847.50',
      value: '$2,847.50',
      change: '+12.5%',
      trend: 'up',
    },
    {
      id: '2',
      name: 'Stellar Lumens',
      symbol: 'XLM',
      balance: '15,432.00',
      value: '$3,086.40',
      change: '+8.3%',
      trend: 'up',
    },
    {
      id: '3',
      name: 'Wrapped Bitcoin',
      symbol: 'WBTC',
      balance: '0.125',
      value: '$5,643.75',
      change: '-2.1%',
      trend: 'down',
    },
    {
      id: '4',
      name: 'Ethereum',
      symbol: 'ETH',
      balance: '2.50',
      value: '$4,875.00',
      change: '+5.2%',
      trend: 'up',
    },
  ]

  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'out',
      description: 'Premium News Subscription',
      amount: '10.00',
      symbol: 'USDC',
      date: 'Feb 1, 2026',
      status: 'completed',
    },
    {
      id: '2',
      type: 'in',
      description: 'Reward Payment',
      amount: '25.50',
      symbol: 'USDC',
      date: 'Jan 31, 2026',
      status: 'completed',
    },
    {
      id: '3',
      type: 'out',
      description: 'DeFi Bot Pro Subscription',
      amount: '25.00',
      symbol: 'USDC',
      date: 'Jan 28, 2026',
      status: 'completed',
    },
    {
      id: '4',
      type: 'out',
      description: 'Pending Subscription Payment',
      amount: '7.50',
      symbol: 'USDC',
      date: 'Jan 25, 2026',
      status: 'pending',
    },
  ]

  const handleCopyAddress = () => {
    if (!publicKey) return
    navigator.clipboard.writeText(publicKey)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const handleCancelSubscription = async (subscription: typeof subscriptions[0]) => {
    if (!isConnected || !publicKey) return

    try {
      const cancelTx = await buildCancelSubscriptionTx(publicKey, subscription.providerAddress)
      const signedTx = await sign(cancelTx.toXDR())

      if (!signedTx) throw new Error('Failed to sign')

      await submitTransaction(signedTx)
      
      // Remove from localStorage
      removeSubscription(subscription.id)
      
      // Refetch wallet data
      refetch()
      
      alert(`✅ Successfully cancelled ${subscription.name}`)
    } catch (error) {
      console.error('Cancel error:', error)
      alert(`❌ Failed to cancel ${subscription.name}. Please try again.`)
    }
  }

  // Calculate total balance across assets
  const totalBalance = balance.toFixed(2)

  // Show loading state while mounting or checking wallet connection
  if (!mounted || isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="animate-in slide-in-from-down duration-700">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-balance gradient-text from-foreground via-primary to-accent">
              My Wallet
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Manage your assets and transactions</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-8 space-y-6 animate-in fade-in duration-500">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-muted-foreground text-sm">Checking wallet connection...</p>
        </div>
      </div>
    )
  }

  // If not connected, show connect prompt
  if (!isConnected || !publicKey) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="animate-in slide-in-from-down duration-700">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-balance gradient-text from-foreground via-primary to-accent">
              My Wallet
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Manage your assets and transactions</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-8 space-y-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-accent" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Connect Your Wallet</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Connect your Freighter wallet to view your assets, subscriptions, and transaction history.
            </p>
          </div>
          <button
            onClick={connect}
            className="px-6 py-3 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="animate-in slide-in-from-down duration-700">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-balance gradient-text from-foreground via-primary to-accent">
            My Wallet
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage your assets and transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8 animate-in slide-in-from-left duration-700">
          <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl overflow-hidden p-6 md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 hover:opacity-100 smooth-transition"></div>

            <div className="relative z-10 space-y-6 md:space-y-8">
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs md:text-sm uppercase tracking-wider font-semibold">Total Balance</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl md:text-5xl font-bold">
                    {showBalance ? `${totalBalance} XLM` : '••••••'}
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-2 hover:bg-card rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
                  >
                    {showBalance ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {walletLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Updating...
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button className="px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border border-primary/40 text-primary font-semibold text-xs md:text-sm smooth-transition flex items-center justify-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-primary/20" aria-label="Send tokens">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                  <span className="sm:hidden">Send</span>
                </button>
                <button className="px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-gradient-to-r from-accent/20 to-accent/10 hover:from-accent/30 hover:to-accent/20 border border-accent/40 text-accent font-semibold text-xs md:text-sm smooth-transition flex items-center justify-center gap-2 hover:scale-105 hover:shadow-lg hover:shadow-accent/20" aria-label="Receive tokens">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Receive</span>
                  <span className="sm:hidden">Receive</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl md:text-2xl font-bold">Your Assets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {assets.map((asset, index) => (
                <div
                  key={asset.id}
                  className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-4 md:p-5 hover:border-primary/60 smooth-transition hover:shadow-lg hover:shadow-primary/10 animate-in fade-in slide-in-from-bottom-3"
                  style={{ animationDelay: `${index * 100}ms` }}
                  role="article"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{asset.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{asset.symbol}</p>
                    </div>
                    <div className={`text-xs font-bold flex items-center gap-1 ${asset.trend === 'up' ? 'text-accent' : 'text-destructive'}`}>
                      {asset.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3 transform rotate-180" />
                      )}
                      {asset.change}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold">{asset.balance}</p>
                    </div>
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-sm font-semibold text-accent">{asset.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="space-y-8 animate-in slide-in-from-right duration-700">
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Wallet Address</p>
              <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/40 hover:border-primary/30 transition-colors duration-200">
                <span className="text-xs font-mono text-foreground/70 truncate flex-1">{formatAddress(publicKey)}</span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-card rounded transition-all duration-200 flex-shrink-0"
                  title="Copy full address"
                >
                  {copiedAddress ? (
                    <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl overflow-hidden">
            <div className="border-b border-border/40 px-6 py-4 bg-gradient-to-r from-primary/5 to-accent/5">
              <h3 className="font-bold">Recent Transactions</h3>
            </div>
            <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="px-6 py-4 hover:bg-card/60 transition-colors duration-200 animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.type === 'out' ? 'bg-destructive/10' : 'bg-accent/10'}`}>
                        {tx.type === 'out' ? (
                          <ArrowUpRight className={`w-4 h-4 ${tx.type === 'out' ? 'text-destructive' : 'text-accent'}`} />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === 'out' ? 'text-destructive' : 'text-accent'}`}>
                        {tx.type === 'out' ? '-' : '+'}
                        {tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.symbol}</p>
                    </div>
                  </div>
                  {tx.status === 'pending' && (
                    <div className="text-xs text-yellow-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                      Pending
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* My Subscriptions - Full Width */}
      <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">My Subscriptions</h2>
          <span className="text-xs text-muted-foreground">{subscriptions.length} active</span>
        </div>
        {subscriptions.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-8 text-center">
            <p className="text-muted-foreground">No active subscriptions</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Visit the Marketplace to subscribe to services</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subscriptions.map((sub, index) => (
              <div
                key={sub.id}
                className="animate-in fade-in slide-in-from-bottom"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <SubscriptionCard
                  id={sub.id}
                  name={sub.name}
                  icon={sub.icon}
                  providerAddress={sub.providerAddress}
                  cost={sub.cost}
                  renewalDate={sub.renewalDate}
                  status={sub.status}
                  onCancel={() => handleCancelSubscription(sub)}
                  disabled={!isConnected}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
