'use client'

import { useState, useEffect } from 'react'
import { CreditCard, AlertTriangle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { getUserDebt, buildRepayDebtTx, submitTransaction } from '@/lib/sorosub-client'
import { fromStroops } from '@/lib/stellar'

interface UserDebt {
    amount: bigint
    token: string
}

export default function DebtCard() {
    const { isConnected, publicKey, sign } = useStellarWallet()
    const [debt, setDebt] = useState<UserDebt | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isRepaying, setIsRepaying] = useState(false)
    const [repayAmount, setRepayAmount] = useState('')
    const [showRepayForm, setShowRepayForm] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        const fetchDebt = async () => {
            if (!isConnected || !publicKey) return

            setIsLoading(true)
            try {
                const userDebt = await getUserDebt(publicKey)
                setDebt(userDebt)
            } catch (error) {
                // Silently handle errors - no debt by default
                setDebt(null)
            } finally {
                setIsLoading(false)
            }
        }

        fetchDebt()
    }, [isConnected, publicKey])

    const handleRepay = async () => {
        if (!isConnected || !publicKey || !debt) return

        const amount = parseFloat(repayAmount)
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount')
            return
        }

        setIsRepaying(true)
        try {
            const repayTx = await buildRepayDebtTx(publicKey, amount)
            const signedTx = await sign(repayTx.toXDR())

            if (!signedTx) {
                throw new Error('Failed to sign transaction')
            }

            await submitTransaction(signedTx)

            // Refresh debt
            const newDebt = await getUserDebt(publicKey)
            setDebt(newDebt)
            setRepayAmount('')
            setShowRepayForm(false)
        } catch (error) {
            console.error('Repay error:', error)
            alert('Failed to repay debt. Please try again.')
        } finally {
            setIsRepaying(false)
        }
    }

    const debtAmount = debt ? fromStroops(debt.amount) : 0
    const hasDebt = debt && debt.amount > 0

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-5 md:p-6 overflow-hidden group hover:border-primary/60 smooth-transition cursor-default animate-in fade-in slide-in-from-top-4"
            style={{ animationDelay: '100ms' }}
            role="article"
            aria-label="BNPL Debt"
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${hasDebt ? 'from-orange-500' : 'from-green-500'} to-transparent opacity-0 ${isHovered ? 'opacity-15' : 'opacity-8'} smooth-transition`} />

            {/* Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 smooth-transition" />

            {/* Content */}
            <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">BNPL Balance</p>
                        <div className="flex items-baseline gap-3 flex-wrap">
                            {isLoading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <p className="text-3xl md:text-4xl font-bold">
                                        {hasDebt ? debtAmount.toFixed(2) : '0.00'}
                                    </p>
                                    <span className="text-sm font-semibold text-muted-foreground">USDC</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br ${hasDebt ? 'from-orange-500 to-red-500' : 'from-green-500 to-emerald-500'} p-3 flex items-center justify-center shadow-lg shadow-primary/20 transform smooth-transition flex-shrink-0 ${isHovered ? 'scale-110 shadow-lg shadow-accent/40' : ''}`}>
                        {hasDebt ? (
                            <AlertTriangle className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        ) : (
                            <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        )}
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="pt-3 border-t border-border/40">
                    {!isConnected ? (
                        <p className="text-xs text-muted-foreground">Connect wallet to view BNPL status</p>
                    ) : hasDebt ? (
                        <div className="space-y-3">
                            {!showRepayForm ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-orange-400" />
                                        <p className="text-xs text-orange-400 font-medium">Outstanding balance due</p>
                                    </div>
                                    <button
                                        onClick={() => setShowRepayForm(true)}
                                        className="px-3 py-1.5 text-xs font-semibold bg-accent/10 hover:bg-accent/20 text-accent rounded-lg smooth-transition flex items-center gap-1"
                                    >
                                        Repay Now
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={repayAmount}
                                            onChange={(e) => setRepayAmount(e.target.value)}
                                            placeholder={`Max: ${debtAmount.toFixed(2)}`}
                                            className="flex-1 px-3 py-2 text-sm bg-background/50 border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                                            disabled={isRepaying}
                                        />
                                        <button
                                            onClick={handleRepay}
                                            disabled={isRepaying || !repayAmount}
                                            className="px-4 py-2 text-sm font-semibold bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg smooth-transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isRepaying ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Pay'
                                            )}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowRepayForm(false)}
                                        className="text-xs text-muted-foreground hover:text-foreground smooth-transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <p className="text-xs text-green-400 font-medium">No outstanding BNPL balance</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
