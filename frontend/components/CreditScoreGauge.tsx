'use client'

import { useState, useEffect } from 'react'
import { Star, TrendingUp, Loader2, Zap, Shield } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { getHorizonCreditData } from '@/lib/horizon-credit'

interface CreditScoreGaugeProps {
    merchantAddress?: string
}

// Get color based on credit score
const getScoreColor = (score: number) => {
    if (score >= 100) return {
        primary: '#a855f7',      // purple-500
        secondary: '#ec4899',    // pink-500
        gradient: 'from-purple-500 to-pink-500',
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        name: 'Excellent',
        tier: 'Platinum'
    }
    if (score >= 70) return {
        primary: '#eab308',      // yellow-500
        secondary: '#f97316',    // orange-500
        gradient: 'from-yellow-500 to-orange-500',
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        name: 'Great',
        tier: 'Gold'
    }
    if (score >= 50) return {
        primary: '#22c55e',      // green-500
        secondary: '#10b981',    // emerald-500
        gradient: 'from-green-500 to-emerald-500',
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        name: 'Good',
        tier: 'Silver'
    }
    if (score >= 30) return {
        primary: '#f59e0b',      // amber-500
        secondary: '#d97706',    // amber-600
        gradient: 'from-amber-500 to-amber-600',
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        name: 'Fair',
        tier: 'Bronze'
    }
    return {
        primary: '#ef4444',      // red-500
        secondary: '#dc2626',    // red-600
        gradient: 'from-red-500 to-red-600',
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        name: 'Poor',
        tier: 'Starter'
    }
}

export default function CreditScoreGauge({ merchantAddress }: CreditScoreGaugeProps) {
    const { isConnected, publicKey } = useStellarWallet()
    const [creditScore, setCreditScore] = useState<number>(0)
    const [isLoading, setIsLoading] = useState(false)
    const [animatedScore, setAnimatedScore] = useState(0)

    const colorConfig = getScoreColor(creditScore)
    const isBNPLEligible = creditScore > 50

    useEffect(() => {
        const fetchCreditScore = async () => {
            if (!isConnected || !publicKey) {
                setCreditScore(0)
                return
            }

            setIsLoading(true)
            try {
                // REAL-TIME CRED-FI SCORING using Horizon API
                // Fetches actual on-chain data: sequence, payments, transactions, balance
                const horizonCredit = await getHorizonCreditData(publicKey)

                if (horizonCredit) {
                    // Base score (10 points for having a valid account)
                    const baseScore = 10
                    const totalScore = baseScore + horizonCredit.totalHorizonScore
                    setCreditScore(totalScore)

                    console.log(`[CreditScoreGauge] Real score: ${totalScore} (base:10 + horizon:${horizonCredit.totalHorizonScore})`)
                    console.log(`[CreditScoreGauge] Raw data:`, horizonCredit.rawData)
                } else {
                    // Fallback: minimal score for connected wallet
                    setCreditScore(10)
                }
            } catch (error) {
                console.error('[CreditScoreGauge] Error:', error)
                setCreditScore(10)
            } finally {
                setIsLoading(false)
            }
        }

        fetchCreditScore()

        // Refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchCreditScore, 30000)
        return () => clearInterval(interval)
    }, [isConnected, publicKey])

    // Animate score on change
    useEffect(() => {
        const duration = 1500
        const startTime = Date.now()
        const startValue = animatedScore

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3)
            const current = Math.round(startValue + (creditScore - startValue) * easeOutCubic)

            setAnimatedScore(current)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        animate()
    }, [creditScore])

    // Calculate SVG arc
    const maxScore = 150
    const percentage = Math.min((animatedScore / maxScore) * 100, 100)
    const radius = 70
    const circumference = 2 * Math.PI * radius
    const halfCircumference = circumference * 0.75 // 270 degrees arc
    const strokeDashoffset = halfCircumference - (percentage / 100) * halfCircumference

    return (
        <div className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-6 overflow-hidden group hover:border-primary/60 transition-all duration-300 animate-in fade-in slide-in-from-top-4">
            {/* Background Effects */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorConfig.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-bl from-accent/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Shield className={`w-5 h-5 ${colorConfig.text}`} />
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cred-Fi Score</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colorConfig.bg} ${colorConfig.text} flex items-center gap-1`}>
                        <Star className="w-3 h-3" />
                        {colorConfig.tier}
                    </span>
                </div>

                {/* Gauge Container */}
                <div className="flex flex-col items-center justify-center py-4">
                    {isLoading ? (
                        <div className="w-44 h-44 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="relative w-44 h-44 flex items-center justify-center">
                            {/* SVG Gauge */}
                            <svg
                                className="absolute inset-0 w-full h-full transform -rotate-[135deg]"
                                viewBox="0 0 160 160"
                            >
                                {/* Background Arc */}
                                <circle
                                    cx="80"
                                    cy="80"
                                    r={radius}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${halfCircumference} ${circumference}`}
                                    className="text-muted/20"
                                />

                                {/* Gradient Definition */}
                                <defs>
                                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor={colorConfig.primary} />
                                        <stop offset="100%" stopColor={colorConfig.secondary} />
                                    </linearGradient>
                                </defs>

                                {/* Progress Arc */}
                                <circle
                                    cx="80"
                                    cy="80"
                                    r={radius}
                                    fill="none"
                                    stroke="url(#scoreGradient)"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={`${halfCircumference} ${circumference}`}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-1000 ease-out drop-shadow-lg"
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${colorConfig.primary}50)`
                                    }}
                                />
                            </svg>

                            {/* Score Display - centered in the gauge */}
                            <div className="relative z-10 flex flex-col items-center justify-center">
                                <span className={`text-5xl font-bold ${colorConfig.text}`}>
                                    {animatedScore}
                                </span>
                                <span className="text-xs text-muted-foreground mt-1">
                                    {colorConfig.name}
                                </span>
                            </div>

                            {/* Scale Labels */}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-between px-2">
                                <span className="text-[10px] text-muted-foreground">0</span>
                                <span className="text-[10px] text-muted-foreground">150</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Score Ranges */}
                <div className="grid grid-cols-5 gap-1 mb-4">
                    {[
                        { range: '0-29', color: 'bg-red-500' },
                        { range: '30-49', color: 'bg-amber-500' },
                        { range: '50-69', color: 'bg-green-500' },
                        { range: '70-99', color: 'bg-yellow-500' },
                        { range: '100+', color: 'bg-purple-500' },
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`h-1.5 w-full rounded-full ${item.color} opacity-60`} />
                            <span className="text-[9px] text-muted-foreground">{item.range}</span>
                        </div>
                    ))}
                </div>

                {/* BNPL Status */}
                <div className="pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${isBNPLEligible ? 'text-green-400' : 'text-muted-foreground'}`} />
                            <span className="text-xs text-muted-foreground">BNPL Access</span>
                        </div>
                        <span className={`text-xs font-semibold ${isBNPLEligible ? 'text-green-400' : 'text-muted-foreground'}`}>
                            {isBNPLEligible ? 'Unlocked ✓' : `${50 - creditScore} pts to unlock`}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-accent" />
                        <span className="text-[10px] text-muted-foreground/60">+10 points per successful payment</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
