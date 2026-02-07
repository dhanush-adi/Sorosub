'use client'

import { Wallet, Bell, ExternalLink } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PrimaryButton from '@/components/common/PrimaryButton'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { formatAddress } from '@/lib/stellar'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps = {}) {
  const { isConnected, isLoading, publicKey, error, connect, disconnect } = useStellarWallet()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [showDisconnect, setShowDisconnect] = useState(false)
  
  const notificationRef = useRef<HTMLDivElement>(null)
  const disconnectRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
      if (disconnectRef.current && !disconnectRef.current.contains(event.target as Node)) {
        setShowDisconnect(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleWalletClick = async () => {
    if (isConnected) {
      setShowDisconnect(!showDisconnect)
    } else {
      await connect()
    }
  }

  return (
    <header className="border-b border-border/40 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-xl sticky top-0 z-40 smooth-transition">
      <div className="px-6 md:px-8 py-5 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2.5 text-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-lg smooth-transition group"
            aria-label="Toggle Menu"
            suppressHydrationWarning
          >
            <div className="flex flex-col gap-1.5 w-5 h-5 items-center justify-center">
              <span className="w-5 h-0.5 bg-current rounded-full group-hover:scale-110 smooth-transition"></span>
              <span className="w-5 h-0.5 bg-current rounded-full group-hover:scale-110 smooth-transition"></span>
              <span className="w-5 h-0.5 bg-current rounded-full group-hover:scale-110 smooth-transition"></span>
            </div>
          </button>

          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary via-purple-500 to-accent flex items-center justify-center shadow-lg shadow-primary/50 hover:scale-110 smooth-transition group">
            <span className="text-lg font-bold text-white group-hover:animate-float">◆</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold tracking-tight gradient-text from-foreground via-primary to-accent">SoroSub</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Web3 Subscriptions</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Error Toast */}
          {error && (
            <div className="hidden md:block px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2.5 text-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-lg smooth-transition group"
              aria-label="Notifications"
              suppressHydrationWarning
            >
              <Bell className="w-5 h-5 group-hover:scale-110 smooth-transition" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full animate-pulse"></span>
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-card border border-border/60 rounded-lg backdrop-blur-xl shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  <p className="text-sm font-semibold text-foreground">Recent Activity</p>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-muted/30 border border-primary/10">
                      <p className="text-xs text-foreground/80">Payment processed for Premium News</p>
                      <p className="text-xs text-muted-foreground mt-1">5 minutes ago</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-primary/10">
                      <p className="text-xs text-foreground/80">Wallet connected successfully</p>
                      <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Button */}
          <div className="relative" ref={disconnectRef}>
            <PrimaryButton
              variant={isConnected ? 'secondary' : 'primary'}
              size="md"
              onClick={handleWalletClick}
              disabled={isLoading}
              icon={<Wallet className="w-4 h-4" />}
              className="hidden sm:flex"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : isConnected && publicKey ? (
                <>
                  <span>{formatAddress(publicKey, 4)}</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                </>
              ) : (
                'Connect Wallet'
              )}
            </PrimaryButton>

            {/* Disconnect Dropdown */}
            {showDisconnect && isConnected && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border/60 rounded-lg backdrop-blur-xl shadow-lg shadow-primary/20 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="p-2 space-y-1">
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/30 rounded-lg smooth-transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </a>
                  <button
                    onClick={() => {
                      disconnect()
                      setShowDisconnect(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg smooth-transition"
                  >
                    <Wallet className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Wallet Icon */}
          <button
            onClick={handleWalletClick}
            className="sm:hidden p-2.5 text-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-lg smooth-transition"
          >
            <Wallet className="w-5 h-5" />
            {isConnected && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
