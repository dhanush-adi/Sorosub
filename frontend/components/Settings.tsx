'use client'

import React from "react"

import { useState } from 'react'
import { Bell, Lock, Eye, Globe, Zap, AlertCircle, Check, ChevronRight, ToggleLeft as Toggle2 } from 'lucide-react'

interface SettingItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  enabled: boolean
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingItem[]>([
    {
      id: '1',
      title: 'Email Notifications',
      description: 'Get alerts about subscription renewals and payments',
      icon: <Bell className="w-5 h-5" />,
      enabled: true,
    },
    {
      id: '2',
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      icon: <Lock className="w-5 h-5" />,
      enabled: false,
    },
    {
      id: '3',
      title: 'Price Alerts',
      description: 'Notify me when subscription prices change',
      icon: <Zap className="w-5 h-5" />,
      enabled: true,
    },
    {
      id: '4',
      title: 'Public Profile',
      description: 'Make your profile visible to other users',
      icon: <Eye className="w-5 h-5" />,
      enabled: false,
    },
    {
      id: '5',
      title: 'Multi-language Support',
      description: 'Display content in your preferred language',
      icon: <Globe className="w-5 h-5" />,
      enabled: true,
    },
    {
      id: '6',
      title: 'Auto-renew Subscriptions',
      description: 'Automatically renew active subscriptions',
      icon: <Zap className="w-5 h-5" />,
      enabled: true,
    },
  ])

  const [activeTab, setActiveTab] = useState('preferences')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const toggleSetting = (id: string) => {
    setSettings(
      settings.map((setting) =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    )
  }

  const handleSave = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const tabs = [
    { id: 'preferences', label: 'Preferences', icon: Zap },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'about', label: 'About', icon: AlertCircle },
  ]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="animate-in slide-in-from-down duration-700">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-balance gradient-text from-foreground via-primary to-accent">
            Settings
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage your account and preferences</p>
        </div>
      </div>

      <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 animate-in slide-in-from-left duration-700 -mx-6 md:mx-0 px-6 md:px-0">
        {tabs.map((tab, index) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg whitespace-nowrap font-medium text-sm smooth-transition animate-in slide-in-from-left ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40'
                  : 'bg-card/50 text-foreground/70 hover:text-foreground border border-border/50 hover:border-primary/30'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              aria-selected={activeTab === tab.id}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.label.slice(0, 3)}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-6 md:space-y-8">
        {activeTab === 'preferences' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl overflow-hidden divide-y divide-border/40">
              {settings.map((setting, index) => (
                <div
                  key={setting.id}
                  className="p-4 md:p-6 hover:bg-card/60 smooth-transition animate-in slide-in-from-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                  role="article"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-accent mt-1">
                        {setting.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{setting.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{setting.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSetting(setting.id)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 flex-shrink-0 ml-4 ${
                        setting.enabled
                          ? 'bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/40'
                          : 'bg-muted/50'
                      }`}
                    >
                      <span
                        className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                          setting.enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button className="px-6 py-3 rounded-lg border border-border/60 text-foreground font-semibold text-sm hover:bg-card/50 transition-all duration-300">
                Reset to Default
              </button>
              <button
                onClick={handleSave}
                className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  saveSuccess
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/40'
                    : 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40 hover:scale-105'
                }`}
              >
                {saveSuccess && (
                  <Check className="w-4 h-4" />
                )}
                {saveSuccess ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Password
                </h3>
                <button className="px-4 py-2.5 rounded-lg border border-border/60 text-foreground font-medium text-sm hover:bg-card/50 transition-all duration-300 flex items-center gap-2">
                  Change Password
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="border-t border-border/40 pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Enhance your account security with 2FA</p>
                <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/40 text-primary font-semibold text-sm hover:from-primary/30 hover:to-accent/30 transition-all duration-300">
                  Enable 2FA
                </button>
              </div>

              <div className="border-t border-border/40 pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Active Sessions
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/40">
                    <div className="text-sm">
                      <p className="font-medium">Chrome on macOS</p>
                      <p className="text-xs text-muted-foreground">Last active: 2 min ago</p>
                    </div>
                    <span className="text-xs font-semibold text-accent">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/40">
                    <div className="text-sm">
                      <p className="font-medium">Safari on iPhone</p>
                      <p className="text-xs text-muted-foreground">Last active: 1 day ago</p>
                    </div>
                    <button className="text-xs font-semibold text-destructive hover:text-destructive/80">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Notification Channels</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Email', description: 'Subscription and payment updates' },
                    { label: 'In-App', description: 'Real-time notifications' },
                    { label: 'SMS', description: 'Critical alerts only', soon: true },
                  ].map((channel, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg bg-background/30 border border-border/40"
                    >
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          {channel.label}
                          {channel.soon && (
                            <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                              Soon
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{channel.description}</p>
                      </div>
                      <button
                        disabled={channel.soon}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${
                          channel.soon
                            ? 'opacity-50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/40'
                        }`}
                      >
                        <span className="inline-block h-7 w-7 transform rounded-full bg-white shadow-lg translate-x-6" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">App Version</h3>
                <p className="text-sm text-muted-foreground">SoroSub v1.2.4</p>
              </div>

              <div className="border-t border-border/40 pt-6">
                <h3 className="font-semibold mb-2">Network</h3>
                <p className="text-sm text-muted-foreground">Soroban Testnet</p>
              </div>

              <div className="border-t border-border/40 pt-6">
                <h3 className="font-semibold mb-3">Resources</h3>
                <div className="space-y-2">
                  {[
                    'Documentation',
                    'GitHub Repository',
                    'Report a Bug',
                    'Feature Requests',
                  ].map((link, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left px-4 py-2.5 rounded-lg border border-border/60 text-foreground hover:bg-card/50 transition-all duration-300 flex items-center justify-between group"
                    >
                      <span className="text-sm font-medium">{link}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
