'use client'

import React from 'react'

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export default function PrimaryButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: PrimaryButtonProps) {
  const baseClasses = 'font-semibold transition-all duration-300 rounded-lg flex items-center justify-center gap-2'

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:shadow-lg hover:shadow-primary/50 active:scale-95 disabled:opacity-50',
    secondary:
      'bg-gradient-to-r from-accent to-cyan-400 text-background hover:shadow-lg hover:shadow-accent/50 active:scale-95 disabled:opacity-50',
    accent:
      'bg-accent text-background hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/50 active:scale-95 disabled:opacity-50',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/30 active:scale-95 disabled:opacity-50',
    ghost: 'text-foreground hover:bg-muted/50 active:scale-95 disabled:opacity-50',
  }

  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
}
