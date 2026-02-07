'use client'

import React, { useState } from 'react'
import { Trash2, Zap, TrendingUp, Music, PieChart, Loader2 } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { buildCancelSubscriptionTx, submitTransaction } from '@/lib/sorosub-client'

interface Subscription {
  id: string
  name: string
  icon: React.ReactNode
  providerAddress: string
  cost: string
  renewalDate: string
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
      cost: '10 USDC/mo',
      renewalDate: 'Feb 15, 2026',
    },
    {
      id: '2',
      name: 'DeFi Bot Pro',
      icon: <TrendingUp className="w-5 h-5" />,
      providerAddress: 'GDEMO2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      cost: '25 USDC/mo',
      renewalDate: 'Feb 8, 2026',
    },
    {
      id: '3',
      name: 'Music Streaming',
      icon: <Music className="w-5 h-5" />,
      providerAddress: 'GDEMO3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      cost: '7.50 USDC/mo',
      renewalDate: 'Feb 20, 2026',
    },
    {
      id: '4',
      name: 'Analytics Dashboard',
      icon: <PieChart className="w-5 h-5" />,
      providerAddress: 'GDEMO4DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      cost: '15 USDC/mo',
      renewalDate: 'Feb 12, 2026',
    },
  ])

  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const handleCancel = async (sub: Subscription) => {
    if (!isConnected || !publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setCancelingId(sub.id)

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
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="border-b border-border/40 px-6 py-5 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Active Subscriptions</h2>
            <p className="text-sm text-muted-foreground mt-1">{subscriptions.length} services active</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
            <p className="text-xs font-semibold text-accent">${subscriptions.reduce((sum, sub) => sum + parseFloat(sub.cost), 0).toFixed(2)}/mo</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
        {subscriptions.length === 0 ? (
          <div className="px-6 py-16 text-center space-y-3 animate-in fade-in duration-500">
            <p className="text-muted-foreground text-sm">No active subscriptions</p>
            <p className="text-xs text-muted-foreground/60">Get started by subscribing to a service from the marketplace</p>
          </div>
        ) : (
          subscriptions.map((sub, index) => (
            <div
              key={sub.id}
              className={`px-4 md:px-6 py-4 flex items-center justify-between hover:bg-card/60 smooth-transition group border-b border-border/20 hover:border-accent/20 animate-in fade-in slide-in-from-left ${cancelingId === sub.id ? 'opacity-50' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
              role="article"
            >
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-accent group-hover:from-primary/50 group-hover:to-accent/50 group-hover:scale-110 smooth-transition shadow-lg shadow-primary/10 flex-shrink-0">
                  {sub.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{sub.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Renewal: {sub.renewalDate}</p>
                  <p className="text-xs text-muted-foreground mt-1 sm:hidden">{sub.renewalDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4 ml-3 md:ml-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="font-semibold text-sm text-accent">{sub.cost}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">per month</p>
                </div>
                <div className="sm:hidden text-right">
                  <p className="font-semibold text-xs text-accent">{sub.cost}</p>
                </div>
                <button
                  onClick={() => handleCancel(sub)}
                  disabled={cancelingId === sub.id || !isConnected}
                  className="p-2 md:p-2.5 text-destructive hover:bg-destructive/10 rounded-lg smooth-transition opacity-0 group-hover:opacity-100 hover:scale-110 group-hover:shadow-lg group-hover:shadow-destructive/20 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                  title={isConnected ? 'Cancel subscription' : 'Connect wallet to cancel'}
                  aria-label={`Cancel ${sub.name} subscription`}
                >
                  {cancelingId === sub.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
