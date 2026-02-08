'use client'

import { TrendingUp, DollarSign, Clock, ArrowUpRight } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { getStoredSubscriptions } from '@/lib/subscription-storage'

export default function StatCards() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { isConnected, publicKey } = useStellarWallet()
  const [subscriptions, setSubscriptions] = useState<ReturnType<typeof getStoredSubscriptions>>([])

  // Load subscriptions from storage
  useEffect(() => {
    if (isConnected && publicKey) {
      const subs = getStoredSubscriptions()
      setSubscriptions(subs)
    } else {
      setSubscriptions([])
    }
  }, [isConnected, publicKey])

  // Refresh every 30 seconds
  useEffect(() => {
    if (!isConnected || !publicKey) return

    const interval = setInterval(() => {
      const subs = getStoredSubscriptions()
      setSubscriptions(subs)
    }, 30000)

    return () => clearInterval(interval)
  }, [isConnected, publicKey])

  // Helper to calculate next renewal date
  const getNextRenewal = (createdAt: number, intervalSeconds: number): Date => {
    const now = Date.now()
    const intervalMs = intervalSeconds * 1000
    const elapsed = now - createdAt
    const periodsElapsed = Math.floor(elapsed / intervalMs)
    const nextRenewal = createdAt + (periodsElapsed + 1) * intervalMs
    return new Date(nextRenewal)
  }

  // Calculate real stats
  const stats = useMemo(() => {
    const totalSubs = subscriptions.length

    // Calculate monthly spend (sum of all subscription amounts - already in XLM)
    const monthlySpend = subscriptions.reduce((total, sub) => {
      return total + sub.amount
    }, 0)

    // Find next payment date (earliest upcoming renewal)
    let nextPaymentDays = '--'
    let nextPaymentDate = 'No upcoming payments'

    if (subscriptions.length > 0) {
      const now = new Date()
      const upcomingPayments = subscriptions
        .map(sub => getNextRenewal(sub.createdAt, sub.intervalSeconds))
        .filter(date => date > now)
        .sort((a, b) => a.getTime() - b.getTime())

      if (upcomingPayments.length > 0) {
        const nextDate = upcomingPayments[0]
        const diffTime = nextDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        nextPaymentDays = `${diffDays} day${diffDays !== 1 ? 's' : ''}`
        nextPaymentDate = nextDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      }
    }

    return [
      {
        title: 'Total Active Subs',
        value: isConnected ? totalSubs.toString() : '0',
        icon: TrendingUp,
        color: 'from-primary',
        subtext: isConnected ? `${totalSubs === 0 ? 'No' : totalSubs} active subscription${totalSubs !== 1 ? 's' : ''}` : 'Connect wallet to view',
        trend: isConnected && totalSubs > 0 ? 'Active' : '',
      },
      {
        title: 'Monthly Spend (XLM)',
        value: isConnected ? monthlySpend.toFixed(2) : '0.00',
        icon: DollarSign,
        color: 'from-accent',
        subtext: isConnected ? 'Per billing cycle' : 'Connect wallet to view',
        trend: isConnected && monthlySpend > 0 ? 'Recurring' : '',
      },
      {
        title: 'Next Payment Due',
        value: isConnected ? nextPaymentDays : '--',
        icon: Clock,
        color: 'from-secondary',
        subtext: isConnected ? nextPaymentDate : 'Connect wallet to view',
        trend: isConnected && subscriptions.length > 0 ? 'On Track' : '',
      },
    ]
  }, [subscriptions, isConnected])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isHovered = hoveredIndex === index

        return (
          <div
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-5 md:p-6 overflow-hidden group hover:border-primary/60 smooth-transition cursor-default animate-in fade-in slide-in-from-top-4"
            style={{ animationDelay: `${index * 100}ms` }}
            role="article"
            aria-label={stat.title}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} to-transparent opacity-0 ${isHovered ? 'opacity-15' : 'opacity-8'} smooth-transition`} />

            {/* Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 smooth-transition"></div>

            {/* Content */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{stat.title}</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-3xl md:text-4xl font-bold text-balance">{stat.value}</p>
                    {stat.trend && (
                      <span className="text-xs text-accent font-semibold flex items-center gap-0.5 whitespace-nowrap">
                        <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br ${stat.color} to-transparent p-3 flex items-center justify-center shadow-lg shadow-primary/20 transform smooth-transition flex-shrink-0 ${isHovered ? 'scale-110 shadow-lg shadow-accent/40' : ''}`}>
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-accent" />
                </div>
              </div>

              <div className="pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground leading-relaxed">{stat.subtext}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
