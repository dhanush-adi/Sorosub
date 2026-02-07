'use client'

import { useState } from 'react'
import { Copy, Send, Plus, TrendingUp, Eye, EyeOff, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

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

export default function MyWallet() {
  const [showBalance, setShowBalance] = useState(true)
  const [copiedAddress, setCopiedAddress] = useState(false)

  const walletAddress = 'G7HXF5H2X3Q8M9N2K3L4P5Q6R7S8T9U0V1W2X3Y4Z5'

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
    navigator.clipboard.writeText(walletAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const totalBalance = '16,452.65'

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
                    {showBalance ? `$${totalBalance}` : '••••••'}
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
                <span className="text-xs font-mono text-foreground/70 truncate">{walletAddress}</span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-card rounded transition-all duration-200"
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
    </div>
  )
}
