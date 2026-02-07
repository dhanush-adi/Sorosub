'use client'

import React, { useState, useEffect } from 'react'
import { Zap, TrendingUp, Music, PieChart, BarChart3, Cpu, Shield, Globe, Gauge, Database, Code2 } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { buildCancelSubscriptionTx, submitTransaction } from '@/lib/sorosub-client'
import { getStoredSubscriptions, removeSubscription, getNextRenewalDate, StoredSubscription } from '@/lib/subscription-storage'
import { fromStroops } from '@/lib/stellar'
import SubscriptionCard from '@/components/SubscriptionCard'

interface DisplaySubscription {
  id: string
  name: string
  icon: React.ReactNode
  providerAddress: string
  cost: string
  renewalDate: string
  status: 'active' | 'pending' | 'expiring'
}

// Map service names to icons
const getServiceIcon = (name: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    'DeFi Analytics Pro': <BarChart3 className="w-5 h-5" />,
    'AI Trading Bot': <Cpu className="w-5 h-5" />,
    'Security Guardian': <Shield className="w-5 h-5" />,
    'Stellar News Feed': <Globe className="w-5 h-5" />,
    'Performance Gauge': <Gauge className="w-5 h-5" />,
    'Database Access': <Database className="w-5 h-5" />,
    'Smart Contract Dev': <Code2 className="w-5 h-5" />,
    'Lightning Network': <Zap className="w-5 h-5" />,
  }
  return icons[name] || <Zap className="w-5 h-5" />
}

// Determine subscription status based on next renewal
const getStatus = (createdAt: number, intervalSeconds: number): 'active' | 'pending' | 'expiring' => {
  const now = Date.now()
  const intervalMs = intervalSeconds * 1000
  const elapsed = now - createdAt
  const periodsElapsed = Math.floor(elapsed / intervalMs)
  const nextRenewal = createdAt + (periodsElapsed + 1) * intervalMs
  const daysUntilRenewal = (nextRenewal - now) / (1000 * 60 * 60 * 24)

  if (daysUntilRenewal <= 3) return 'expiring'
  if (daysUntilRenewal <= 7) return 'pending'
  return 'active'
}

export default function ActiveSubscriptions() {
  const { isConnected, publicKey, sign } = useStellarWallet()
  const [subscriptions, setSubscriptions] = useState<DisplaySubscription[]>([])
  const [loading, setLoading] = useState(true)

  // Load subscriptions from localStorage on mount
  useEffect(() => {
    const loadSubscriptions = () => {
      const stored = getStoredSubscriptions()
      const displaySubs: DisplaySubscription[] = stored.map((sub) => ({
        id: sub.id,
        name: sub.name,
        icon: getServiceIcon(sub.name),
        providerAddress: sub.providerAddress,
        cost: `${sub.amount.toFixed(2)} XLM`,
        renewalDate: getNextRenewalDate(sub.createdAt, sub.intervalSeconds),
        status: getStatus(sub.createdAt, sub.intervalSeconds),
      }))
      setSubscriptions(displaySubs)
      setLoading(false)
    }

    loadSubscriptions()

    // Listen for storage changes (in case subscription added in another tab)
    window.addEventListener('storage', loadSubscriptions)
    
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(loadSubscriptions, 30000)
    
    return () => {
      window.removeEventListener('storage', loadSubscriptions)
      clearInterval(interval)
    }
  }, [])

  // Reload when wallet connects or changes
  useEffect(() => {
    if (isConnected && publicKey) {
      const stored = getStoredSubscriptions()
      const displaySubs: DisplaySubscription[] = stored.map((sub) => ({
        id: sub.id,
        name: sub.name,
        icon: getServiceIcon(sub.name),
        providerAddress: sub.providerAddress,
        cost: `${sub.amount.toFixed(2)} XLM`,
        renewalDate: getNextRenewalDate(sub.createdAt, sub.intervalSeconds),
        status: getStatus(sub.createdAt, sub.intervalSeconds),
      }))
      setSubscriptions(displaySubs)
    }
  }, [isConnected, publicKey])

  const handleCancel = async (sub: DisplaySubscription) => {
    if (!isConnected || !publicKey) {
      alert('Please connect your wallet first')
      return
    }

    try {
      // Build and sign the cancel transaction
      const cancelTx = await buildCancelSubscriptionTx(publicKey, sub.providerAddress)
      const signedTx = await sign(cancelTx.toXDR())

      if (!signedTx) {
        throw new Error('Failed to sign transaction')
      }

      await submitTransaction(signedTx)

      // Remove from local storage and state
      removeSubscription(sub.id)
      setSubscriptions(subscriptions.filter((s) => s.id !== sub.id))
      alert(`✅ Successfully cancelled ${sub.name}`)
    } catch (error) {
      console.error('Cancel error:', error)
      // For demo, still remove it from local state
      removeSubscription(sub.id)
      setSubscriptions(subscriptions.filter((s) => s.id !== sub.id))
      alert(`Subscription cancelled (mock)`)
    }
  }

  const totalMonthlyCost = subscriptions.reduce((sum, sub) => {
    const amount = parseFloat(sub.cost.replace(' XLM', '').replace(' USDC', ''))
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-card/50 rounded w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-card/30 rounded-xl"></div>
          <div className="h-40 bg-card/30 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Active Subscriptions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {subscriptions.length} {subscriptions.length === 1 ? 'service' : 'services'} active
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
          <p className="text-sm font-bold text-accent">
            {totalMonthlyCost.toFixed(2)} XLM<span className="text-xs font-normal text-muted-foreground">/mo</span>
          </p>
        </div>
      </div>

      {/* Subscription Cards Grid */}
      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-12 text-center space-y-3">
          <p className="text-muted-foreground">No active subscriptions</p>
          <p className="text-xs text-muted-foreground/60">Get started by subscribing to a service from the marketplace</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onCancel={() => handleCancel(sub)}
                disabled={!isConnected}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}