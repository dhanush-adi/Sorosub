'use client';

import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'elevated' | 'interactive'
  animated?: boolean
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  variant = 'default',
  animated = true,
}: GlassCardProps) {
  const baseClasses = 'rounded-xl border backdrop-blur-xl'

  const variants = {
    default: 'bg-gradient-to-br from-card/70 to-card/40 border-border/60 hover:border-border/80',
    elevated: 'bg-gradient-to-br from-card/90 to-card/60 border-primary/20 shadow-lg shadow-primary/20 hover:shadow-lg hover:shadow-primary/40',
    interactive:
      'bg-gradient-to-br from-card/70 to-card/40 border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-accent/20 cursor-pointer',
  }

  const animationClass = animated ? 'smooth-transition' : ''

  return (
    <div
      className={`${baseClasses} ${variants[variant]} ${animationClass} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}
