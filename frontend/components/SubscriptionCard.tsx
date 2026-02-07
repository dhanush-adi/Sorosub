'use client'

import React, { useState } from 'react'
import { Trash2, Calendar, Clock, CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface SubscriptionCardProps {
    id: string
    name: string
    icon: React.ReactNode
    providerAddress: string
    cost: string
    renewalDate: string
    status?: 'active' | 'pending' | 'expiring'
    onCancel?: () => Promise<void>
    disabled?: boolean
}

const getStatusConfig = (status: SubscriptionCardProps['status']) => {
    switch (status) {
        case 'pending':
            return {
                bg: 'bg-yellow-500/10',
                border: 'border-yellow-500/30',
                text: 'text-yellow-400',
                label: 'Pending',
                icon: Clock
            }
        case 'expiring':
            return {
                bg: 'bg-orange-500/10',
                border: 'border-orange-500/30',
                text: 'text-orange-400',
                label: 'Expiring Soon',
                icon: AlertCircle
            }
        case 'active':
        default:
            return {
                bg: 'bg-green-500/10',
                border: 'border-green-500/30',
                text: 'text-green-400',
                label: 'Active',
                icon: CheckCircle
            }
    }
}

export default function SubscriptionCard({
    id,
    name,
    icon,
    providerAddress,
    cost,
    renewalDate,
    status = 'active',
    onCancel,
    disabled = false
}: SubscriptionCardProps) {
    const [isCanceling, setIsCanceling] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    
    const statusConfig = getStatusConfig(status)
    const StatusIcon = statusConfig.icon

    const handleCancel = async () => {
        if (!onCancel || isCanceling || disabled) return
        
        setIsCanceling(true)
        try {
            await onCancel()
        } catch (error) {
            console.error('Cancel error:', error)
        } finally {
            setIsCanceling(false)
        }
    }

    // Format provider address for display
    const shortAddress = providerAddress 
        ? `${providerAddress.slice(0, 6)}...${providerAddress.slice(-4)}`
        : 'Unknown'

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                relative rounded-xl border overflow-hidden
                bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl
                transition-all duration-300 ease-out
                hover:shadow-xl hover:shadow-primary/5
                ${isHovered ? 'border-primary/40 scale-[1.02]' : 'border-border/50'}
                ${isCanceling ? 'opacity-60' : ''}
            `}
        >
            {/* Gradient Overlay on Hover */}
            <div className={`
                absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5
                transition-opacity duration-300
                ${isHovered ? 'opacity-100' : 'opacity-0'}
            `} />
            
            {/* Glow Effect */}
            <div className={`
                absolute -inset-px bg-gradient-to-r from-primary/50 to-accent/50 rounded-xl blur-sm
                transition-opacity duration-300
                ${isHovered ? 'opacity-20' : 'opacity-0'}
            `} />

            <div className="relative z-10 p-5">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        {/* Icon Container */}
                        <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center
                            bg-gradient-to-br from-primary/20 to-accent/20
                            border border-primary/20
                            transition-all duration-300
                            ${isHovered ? 'scale-110 shadow-lg shadow-primary/20' : ''}
                        `}>
                            <div className="text-accent">
                                {icon}
                            </div>
                        </div>
                        
                        {/* Title & Provider */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{shortAddress}</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`
                        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}
                    `}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-4" />

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Cost */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="text-xs">Monthly Cost</span>
                        </div>
                        <p className="text-lg font-bold text-accent">{cost}</p>
                    </div>
                    
                    {/* Renewal */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-xs">Next Renewal</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{renewalDate}</p>
                    </div>
                </div>

                {/* Cancel Button */}
                {onCancel && (
                    <button
                        onClick={handleCancel}
                        disabled={isCanceling || disabled}
                        className={`
                            w-full py-2.5 px-4 rounded-lg
                            flex items-center justify-center gap-2
                            text-sm font-medium
                            transition-all duration-200
                            ${isCanceling || disabled
                                ? 'bg-muted/20 text-muted-foreground cursor-not-allowed'
                                : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 hover:border-destructive/40'
                            }
                        `}
                    >
                        {isCanceling ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Canceling...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>Cancel Subscription</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
