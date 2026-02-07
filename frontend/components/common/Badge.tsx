'use client'

import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'destructive'
  size?: 'sm' | 'md'
  className?: string
}

export default function Badge({ children, variant = 'primary', size = 'sm', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-200'

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  const variants = {
    primary: 'bg-primary/20 text-primary border border-primary/30',
    secondary: 'bg-secondary/20 text-secondary border border-secondary/30',
    accent: 'bg-accent/20 text-accent border border-accent/30',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    destructive: 'bg-destructive/20 text-destructive border border-destructive/30',
  }

  return (
    <span className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
