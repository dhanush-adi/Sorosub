'use client'

import { useState, useEffect } from 'react'
import { Star, TrendingUp, Loader2, Zap } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { getHorizonCreditData, HorizonCreditData } from '@/lib/horizon-credit'

interface CreditScoreCardProps {
    merchantAddress?: string
}

export default function CreditScoreCard({ merchantAddress }: CreditScoreCardProps) {
    const { isConnected, publicKey } = useStellarWallet()
    const [creditScore, setCreditScore] = useState<number>(0)
    const [horizonData, setHorizonData] = useState<HorizonCreditData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    // Credit score tiers
    const getTier = (score: number) => {
        if (score >= 100) return { name: 'Platinum', color: 'from-purple-500 to-pink-500', textColor: 'text-purple-400' }
        if (score >= 70) return { name: 'Gold', color: 'from-yellow-500 to-orange-500', textColor: 'text-yellow-400' }
        if (score >= 50) return { name: 'Silver', color: 'from-gray-400 to-gray-500', textColor: 'text-gray-400' }
        if (score >= 30) return { name: 'Bronze', color: 'from-amber-600 to-amber-700', textColor: 'text-amber-400' }
        return { name: 'Starter', color: 'from-slate-500 to-slate-600', textColor: 'text-slate-400' }
    }

    const tier = getTier(creditScore)

    // BNPL eligibility (score > 50)
    const isBNPLEligible = creditScore > 50

    useEffect(() => {
        const fetchCreditScore = async () => {
            if (!isConnected || !publicKey) {
                setCreditScore(0)
                setHorizonData(null)
                return
            }

            setIsLoading(true)
            try {
                // REAL-TIME CRED-FI SCORING using Horizon API
                // Fetches actual on-chain data: sequence, payments, transactions, balance

                const horizonCredit = await getHorizonCreditData(publicKey)

                if (horizonCredit) {
                    setHorizonData(horizonCredit)

                    // Base score (10 points for having a valid account)
                    const baseScore = 10

                    // Total = Base + Horizon data
                    const totalScore = baseScore + horizonCredit.totalHorizonScore
                    setCreditScore(totalScore)

                    console.log(`[CreditScore] Final: ${baseScore} (base) + ${horizonCredit.totalHorizonScore} (horizon) = ${totalScore}`)
                } else {
                    // Fallback if Horizon fails
                    setCreditScore(10)
                }
            } catch (error) {
                console.error('Error fetching credit score:', error)
                setCreditScore(10) // Minimum score
            } finally {
                setIsLoading(false)
            }
        }

        fetchCreditScore()

        // Refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchCreditScore, 30000)
        return () => clearInterval(interval)
    }, [isConnected, publicKey])

    // Progress percentage for visual (cap at 100 for display)
    const progressPercent = Math.min((creditScore / 100) * 100, 100)

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-5 md:p-6 overflow-hidden group hover:border-primary/60 smooth-transition cursor-default animate-in fade-in slide-in-from-top-4"
            role="article"
            aria-label="Credit Score"
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} to-transparent opacity-0 ${isHovered ? 'opacity-15' : 'opacity-8'} smooth-transition`} />

            {/* Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 smooth-transition" />

            {/* Content */}
            <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Cred-Fi Score</p>
                        <div className="flex items-baseline gap-3 flex-wrap">
                            {isLoading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-3xl md:text-4xl font-bold">{creditScore}</p>
                                    <span className={`text-sm font-semibold ${tier.textColor} flex items-center gap-1`}>
                                        <Star className="w-4 h-4" />
                                        {tier.name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br ${tier.color} p-3 flex items-center justify-center shadow-lg shadow-primary/20 transform smooth-transition flex-shrink-0 ${isHovered ? 'scale-110 shadow-lg shadow-accent/40' : ''}`}>
                        <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${tier.color} rounded-full smooth-transition`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0</span>
                        <span>50 (BNPL)</span>
                        <span>100+</span>
                    </div>
                </div>

                {/* BNPL Status */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${isBNPLEligible ? 'text-accent' : 'text-muted-foreground'}`} />
                        <p className="text-xs text-muted-foreground">
                            BNPL Access: {' '}
                            <span className={isBNPLEligible ? 'text-accent font-semibold' : 'text-muted-foreground'}>
                                {isBNPLEligible ? 'Unlocked' : `${50 - creditScore} pts to unlock`}
                            </span>
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground/60">+10 pts per payment</p>
                </div>
            </div>
        </div>
    )
}
