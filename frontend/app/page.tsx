'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import StatCards from '@/components/StatCards'
import ActiveSubscriptions from '@/components/ActiveSubscriptions'
import NewSubscriptionForm from '@/components/NewSubscriptionForm'
import Marketplace from '@/components/Marketplace'
import MyWallet from '@/components/MyWallet'
import Settings from '@/components/Settings'

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState('Dashboard')

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="animate-in fade-in duration-500">
            {activeNav === 'Dashboard' && (
              <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
                <div className="animate-in slide-in-from-down duration-700">
                  <div className="space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold text-balance gradient-text from-foreground via-primary to-accent">Dashboard</h1>
                    <p className="text-muted-foreground text-sm md:text-base">Manage your active subscriptions and payments across the Stellar Network</p>
                  </div>
                </div>

                <StatCards />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="lg:col-span-2 animate-in slide-in-from-left duration-700">
                    <ActiveSubscriptions />
                  </div>
                  <div className="animate-in slide-in-from-right duration-700">
                    <NewSubscriptionForm />
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'Marketplace' && <Marketplace />}
            {activeNav === 'My Wallet' && <MyWallet />}
            {activeNav === 'Settings' && <Settings />}
          </div>
        </main>
      </div>
    </div>
  )
}
