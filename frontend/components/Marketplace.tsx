'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { Star, Download, TrendingUp, Zap, Music, Shield, Globe, Database, Code2, BarChart3, Cpu, Gauge, Loader2 } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { CONTRACTS, INTERVALS, toStroops } from '@/lib/stellar'
import { buildCreateSubscriptionTx, buildApproveTokenTx, submitTransaction, getCurrentLedger, getSubscription } from '@/lib/sorosub-client'
import { addSubscription } from '@/lib/subscription-storage'

interface Service {
  id: string
  name: string
  icon: React.ReactNode
  providerAddress: string
  description: string
  price: string
  rating: number
  reviews: number
  category: string
  isNew?: boolean
  isTrending?: boolean
}

export default function Marketplace() {
  const { isConnected, publicKey, sign, connect } = useStellarWallet()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [subscribingId, setSubscribingId] = useState<string | null>(null)
  const [existingSubscriptions, setExistingSubscriptions] = useState<Set<string>>(new Set())

  // Each service has a unique provider (using valid generated addresses)
  // In production, these would be real merchant addresses
  const services: Service[] = [
    {
      id: '1',
      name: 'DeFi Analytics Pro',
      icon: <BarChart3 className="w-6 h-6" />,
      providerAddress: 'GBXYP4ZWDRK2UPLKT55M7LXCJUJP26OORLIVIHTUL3DVXWMXQIIZMLNA', // Provider 1
      description: 'Real-time blockchain analytics and portfolio tracking',
      price: '9.99',
      rating: 4.8,
      reviews: 342,
      category: 'Analytics',
      isTrending: true,
    },
    {
      id: '2',
      name: 'AI Trading Bot',
      icon: <Cpu className="w-6 h-6" />,
      providerAddress: 'GCOWTNUOWC4SOJJYXZWRIV5JPP3FOZTW3UBSBX2TVS2M6F2P5NZHWTCV', // Provider 2
      description: 'Intelligent trading automation with ML predictions',
      price: '4.99',
      rating: 4.9,
      reviews: 521,
      category: 'Trading',
      isTrending: true,
    },
    {
      id: '3',
      name: 'Security Guardian',
      icon: <Shield className="w-6 h-6" />,
      providerAddress: 'GDG3ROUV2QYWK2G2DOQXZZYA57KHXFPFPYYIYJMRKKKPXKRS7G34G3HH', // Provider 3
      description: 'Advanced wallet protection and threat monitoring',
      price: '2.99',
      rating: 4.7,
      reviews: 189,
      category: 'Security',
    },
    {
      id: '4',
      name: 'Stellar News Feed',
      icon: <Globe className="w-6 h-6" />,
      providerAddress: 'GDLHPE23J43V6HTDDGABREZWHGVOOCN4Y4IHZ7XIY6LXPHTSPLCHAS4G', // Provider 4
      description: 'Curated crypto news and market updates',
      price: '1.99',
      rating: 4.6,
      reviews: 423,
      category: 'News',
      isNew: true,
    },
    {
      id: '5',
      name: 'Performance Gauge',
      icon: <Gauge className="w-6 h-6" />,
      providerAddress: 'GAUWTGM2Y2RGDSWMJN3Y33ASYWAZ5TUUERIVHUNC6HBJXCXOELMCYPU3', // Provider 5
      description: 'Detailed performance metrics and optimization tips',
      price: '3.99',
      rating: 4.5,
      reviews: 267,
      category: 'Tools',
    },
    {
      id: '6',
      name: 'Database Access',
      icon: <Database className="w-6 h-6" />,
      providerAddress: 'GDLGJZWN7SEIL3D6USU3UMUEH73XABIVMPE6K7WCXZGD7V667M6AFDCL', // Provider 6
      description: 'Historical blockchain data and archives',
      price: '5.99',
      rating: 4.8,
      reviews: 198,
      category: 'Data',
    },
    {
      id: '7',
      name: 'Smart Contract Dev',
      icon: <Code2 className="w-6 h-6" />,
      providerAddress: 'GBHZG44RPLZ2BE2HZNW5D76YHXJOZ5I5J7LUDZ25IV46MPFEAXWYW63D', // Provider 7
      description: 'Soroban contract templates and tools',
      price: '7.99',
      rating: 4.7,
      reviews: 156,
      category: 'Development',
      isNew: true,
    },
    {
      id: '8',
      name: 'Lightning Network',
      icon: <Zap className="w-6 h-6" />,
      providerAddress: 'GBMXDOP7B4OI4J6PFQDPGIIRP3NO7UE4FPJB4AO3MTAPAHMQSMAFCX7M', // Provider 8
      description: 'Fast transaction processing and routing',
      price: '6.99',
      rating: 4.6,
      reviews: 312,
      category: 'Network',
    },
  ]

  // Check for existing subscriptions when wallet connects
  useEffect(() => {
    const checkExistingSubscriptions = async () => {
      if (!isConnected || !publicKey) {
        setExistingSubscriptions(new Set())
        return
      }

      const existing = new Set<string>()
      
      // Check each service to see if user is already subscribed
      for (const service of services) {
        try {
          const sub = await getSubscription(publicKey, service.providerAddress)
          if (sub && sub.isActive) {
            existing.add(service.providerAddress)
          }
        } catch {
          // Ignore errors, means no subscription
        }
      }

      setExistingSubscriptions(existing)
    }

    checkExistingSubscriptions()
  }, [isConnected, publicKey])

  const handleSubscribe = async (service: Service) => {
    if (!isConnected) {
      await connect()
      return
    }

    if (!publicKey) return

    // Check if subscription already exists
    if (existingSubscriptions.has(service.providerAddress)) {
      alert(`❌ You already have an active subscription to ${service.name}.\nCancel it first from Active Subscriptions if you want to re-subscribe.`)
      return
    }

    setSubscribingId(service.id)

    try {
      const amount = parseFloat(service.price)
      const intervalSeconds = INTERVALS.MONTHLY

      // Inform user about the two-step process
      console.log('📋 Subscription requires 2 signatures: (1) Token approval, (2) Create subscription')

      // Step 1: Approve token allowance
      const approvalAmount = amount * 12
      // Get current ledger from network for proper TTL
      const expirationLedger = await getCurrentLedger()

      const approveTx = await buildApproveTokenTx(
        publicKey,
        CONTRACTS.USDC,
        CONTRACTS.SOROSUB,
        approvalAmount,
        expirationLedger
      )

      console.log('📝 Step 1/2: Please approve token allowance in Freighter...')
      const signedApproveTx = await sign(approveTx.toXDR())
      if (!signedApproveTx) {
        setSubscribingId(null)
        return
      }

      await submitTransaction(signedApproveTx)
      console.log('✅ Token approval confirmed')

      // Step 2: Create subscription
      const createTx = await buildCreateSubscriptionTx(
        publicKey,
        service.providerAddress,
        CONTRACTS.USDC,
        amount,
        intervalSeconds
      )

      console.log('📝 Step 2/2: Please confirm subscription creation in Freighter...')
      const signedCreateTx = await sign(createTx.toXDR())
      if (!signedCreateTx) {
        setSubscribingId(null)
        return
      }

      await submitTransaction(signedCreateTx)
      console.log('✅ Subscription created successfully')

      // Save subscription to local storage for dashboard
      addSubscription({
        id: `${service.id}-${Date.now()}`,
        name: service.name,
        providerAddress: service.providerAddress,
        amount: amount,
        intervalSeconds: intervalSeconds,
        createdAt: Date.now(),
        tokenAddress: CONTRACTS.USDC
      })

      // Add to existing subscriptions set
      setExistingSubscriptions(prev => new Set(prev).add(service.providerAddress))

      alert(`✅ Successfully subscribed to ${service.name}! Auto-payments are now active.`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Silently handle user rejections (Freighter shows its own error)
      if (errorMessage.toLowerCase().includes('rejected') || 
          errorMessage.toLowerCase().includes('declined') || 
          errorMessage.toLowerCase().includes('cancelled') ||
          errorMessage.toLowerCase().includes('user') && errorMessage.toLowerCase().includes('denied')) {
        console.log('Subscription cancelled by user')
        return
      }
      
      // Log other errors but don't show alert for common user actions
      console.error('Subscribe error:', error)
      
      // Only show alerts for actual system errors
      if (errorMessage.includes('insufficient')) {
        alert(`❌ Insufficient balance to subscribe to ${service.name}. Please add more XLM to your wallet.`)
      } else if (errorMessage.includes('UnreachableCodeReached')) {
        alert(`❌ Subscription already exists. Please check Active Subscriptions.`)
      } else if (!errorMessage.toLowerCase().includes('user')) {
        // Only show error if it's not a user action
        alert(`❌ Failed to subscribe to ${service.name}. Please try again.`)
      }
    } finally {
      setSubscribingId(null)
    }
  }

  const categories = ['All', 'Analytics', 'Trading', 'Security', 'News', 'Tools', 'Data', 'Development', 'Network']

  const filteredServices =
    selectedCategory === 'All'
      ? services
      : services.filter((service) => service.category === selectedCategory)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="animate-in slide-in-from-down duration-700">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-balance gradient-text from-foreground via-primary to-accent">
            Marketplace
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Discover and subscribe to premium Web3 services</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 md:gap-3 animate-in slide-in-from-left duration-700">
        {categories.map((cat, index) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 md:px-4 py-2 rounded-full font-medium text-sm smooth-transition animate-in slide-in-from-left ${selectedCategory === cat
              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40'
              : 'bg-card/50 text-foreground/70 hover:text-foreground border border-border/50 hover:border-primary/30 hover:bg-card'
              }`}
            style={{ animationDelay: `${index * 30}ms` }}
            aria-pressed={selectedCategory === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredServices.map((service, index) => (
          <div
            key={service.id}
            className="group relative rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-primary/60 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {(service.isNew || service.isTrending) && (
              <div className="absolute top-3 right-3 z-20">
                {service.isNew && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></span>
                    New
                  </span>
                )}
                {service.isTrending && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold ml-2">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </span>
                )}
              </div>
            )}

            <div className="relative z-10 p-6 flex flex-col h-full">
              <div className="mb-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-accent group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent/40 transition-all duration-300">
                  {service.icon}
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 group-hover:text-accent transition-colors duration-300">
                {service.name}
              </h3>

              <p className="text-sm text-muted-foreground mb-4 flex-grow leading-relaxed">
                {service.description}
              </p>

              <div className="space-y-4 border-t border-border/40 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(service.rating) ? 'fill-accent text-accent' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">
                      {service.rating}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {service.reviews} reviews
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-accent">
                    {service.price} XLM
                  </span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>

                <button
                  onClick={() => handleSubscribe(service)}
                  disabled={subscribingId === service.id || existingSubscriptions.has(service.providerAddress)}
                  className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:scale-100 ${
                    existingSubscriptions.has(service.providerAddress)
                      ? 'bg-green-500/20 border-2 border-green-500/40 text-green-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/40 group-hover:scale-105 disabled:opacity-50'
                  }`}
                >
                  {subscribingId === service.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : existingSubscriptions.has(service.providerAddress) ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Already Subscribed
                    </>
                  ) : !isConnected ? (
                    <>
                      <Download className="w-4 h-4" />
                      Connect & Subscribe
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Subscribe
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
