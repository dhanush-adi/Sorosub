'use client'

import { LayoutDashboard, Store, Wallet, Settings, Zap } from 'lucide-react'

interface SidebarProps {
  activeNav: string
  setActiveNav: (nav: string) => void
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Marketplace', icon: Store },
  { label: 'My Wallet', icon: Wallet },
  { label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeNav, setActiveNav, isOpen = false, onClose }: SidebarProps) {
  const handleNavClick = (label: string) => {
    setActiveNav(label)
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`w-64 border-r border-border/60 bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-xl flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="p-6 border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          Navigation
        </h3>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = activeNav === item.label

          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl smooth-transition text-sm font-medium group relative overflow-hidden animate-in slide-in-from-left ${
                isActive
                  ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40'
                  : 'text-foreground/70 hover:text-foreground hover:bg-card/60 border border-border/30 hover:border-primary/40'
              }`}
              style={{ animationDelay: `${index * 75}ms` }}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-accent/0 to-primary/10 opacity-0 ${isActive ? 'opacity-100' : 'group-hover:opacity-50'} smooth-transition`}></div>
              <Icon className={`w-4 h-4 relative z-10 smooth-transition ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="relative z-10 font-semibold">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full bg-primary-foreground animate-pulse"></div>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border/40 space-y-4">
        <div className="rounded-lg border border-border/60 bg-gradient-to-br from-accent/10 to-primary/5 p-4 text-center space-y-2 hover:border-primary/40 transition-all duration-300">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Connected</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-accent">Soroban Testnet</p>
            <p className="text-xs text-muted-foreground">Wallet Ready</p>
          </div>
        </div>

        <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent flex-shrink-0" />
          <p className="text-xs text-foreground/70">
            <span className="font-semibold text-foreground">v1.2.4</span> Latest
          </p>
        </div>
      </div>
    </aside>
    </>
  )
}
