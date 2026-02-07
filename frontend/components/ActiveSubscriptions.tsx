'use client'

import React, { useState } from 'react'
import { Zap, TrendingUp, Music, PieChart } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { buildCancelSubscriptionTx, submitTransaction } from '@/lib/sorosub-client'
import SubscriptionCard from '@/components/SubscriptionCard'

interface Subscription {
  id: string
  name: string
  icon: React.ReactNode
  providerAddress: string
  cost: string
  renewalDate: string
  status?: 'active' | 'pending' | 'expiring'
}

export default function ActiveSubscriptions() {
  const { isConnected, publicKey, sign } = useStellarWallet()

  // Demo subscriptions (in production, these would be fetched from the contract)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: '1',
      name: 'Premium News',
      icon: <Zap className="w-5 h-5" />,
      providerAddress: 'GDEMO1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      cost: '10 USDC',
      renewalDate: 'Feb 15, 2026',
      status: 'active',
    },
    {
      id: '2',
      name: 'DeFi Bot Pro',
      icon: <TrendingUp className="w-5 h-5" />,
      providerAddress: 'GDEMO2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      cost: '25 USDC',
      renewalDate: 'Feb 8, 2026',
      status: 'expiring',
    },
    {
      id: '3',
      name: 'Music Streaming',
      icon: <Music className="w-5 h-5" />,
      providerAddress: 'GDEMO3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      cost: '7.50 USDC',
      renewalDate: 'Feb 20, 2026',
      status: 'active',
    },
    {
      id: '4',
      name: 'Analytics Dashboard',
      icon: <PieChart className="w-5 h-5" />,
      providerAddress: 'GDEMO4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      cost: '15 USDC',
      renewalDate: 'Feb 12, 2026',
      status: 'pending',
    },
  ])

  const handleCancel = async (sub: Subscription) => {
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

      // Remove from local state
      setSubscriptions(subscriptions.filter((s) => s.id !== sub.id))
    } catch (error) {
      console.error('Cancel error:', error)
      // For demo, still remove it from local state
      setSubscriptions(subscriptions.filter((s) => s.id !== sub.id))
    }
  }

  const totalMonthlyCost = subscriptions.reduce((sum, sub) => sum + parseFloat(sub.cost), 0)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Active Subscriptions</h2>
          <p className="text-sm text-muted-foreground mt-1">{subscriptions.length} services active</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
          <p className="text-sm font-bold text-accent">${totalMonthlyCost.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
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