'use client'

import { TrendingUp, DollarSign, Clock, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'

export default function StatCards() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const stats = [
    {
      title: 'Total Active Subs',
      value: '7',
      icon: TrendingUp,
      color: 'from-primary',
      subtext: '+2 this month',
      trend: '+28.6%',
    },
    {
      title: 'Monthly Spend (USDC)',
      value: '187.50',
      icon: DollarSign,
      color: 'from-accent',
      subtext: 'Next billing cycle',
      trend: '+12.5%',
    },
    {
      title: 'Next Payment Due',
      value: '5 days',
      icon: Clock,
      color: 'from-secondary',
      subtext: 'Feb 10, 2026 @ 14:00 UTC',
      trend: 'On Track',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isHovered = hoveredIndex === index

        return (
          <div
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="relative rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-5 md:p-6 overflow-hidden group hover:border-primary/60 smooth-transition cursor-default animate-in fade-in slide-in-from-top-4"
            style={{ animationDelay: `${index * 100}ms` }}
            role="article"
            aria-label={stat.title}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} to-transparent opacity-0 ${isHovered ? 'opacity-15' : 'opacity-8'} smooth-transition`} />

            {/* Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 smooth-transition"></div>

            {/* Content */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{stat.title}</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-3xl md:text-4xl font-bold text-balance">{stat.value}</p>
                    {stat.title !== 'Next Payment Due' && (
                      <span className="text-xs text-accent font-semibold flex items-center gap-0.5 whitespace-nowrap">
                        <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br ${stat.color} to-transparent p-3 flex items-center justify-center shadow-lg shadow-primary/20 transform smooth-transition flex-shrink-0 ${isHovered ? 'scale-110 shadow-lg shadow-accent/40' : ''}`}>
                  <Icon className="w-6 h-6 md:w-7 md:h-7 text-accent" />
                </div>
              </div>

              <div className="pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground leading-relaxed">{stat.subtext}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
