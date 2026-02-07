'use client'

import React, { useState } from 'react'
import { Plus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useStellarWallet } from '@/hooks/useStellarWallet'
import { CONTRACTS, INTERVALS, IntervalType, toStroops } from '@/lib/stellar'
import { buildCreateSubscriptionTx, buildApproveTokenTx, submitTransaction } from '@/lib/sorosub-client'

type SubmitStatus = 'idle' | 'approving' | 'creating' | 'success' | 'error'

export default function NewSubscriptionForm() {
  const { isConnected, publicKey, sign } = useStellarWallet()

  const [formData, setFormData] = useState({
    providerAddress: '',
    amount: '',
    interval: 'MONTHLY' as IntervalType,
  })
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (status !== 'idle') {
      setStatus('idle')
      setErrorMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !publicKey) {
      setErrorMessage('Please connect your wallet first')
      setStatus('error')
      return
    }

    if (!formData.providerAddress || !formData.amount) {
      setErrorMessage('Please fill in all fields')
      setStatus('error')
      return
    }

    try {
      const amount = parseFloat(formData.amount)
      const intervalSeconds = INTERVALS[formData.interval]

      // Step 1: Approve token allowance for the SoroSub contract
      setStatus('approving')

      // Approve 12x the amount (1 year of payments)
      const approvalAmount = amount * 12
      const currentLedger = Math.floor(Date.now() / 5000) // Rough estimate
      const expirationLedger = currentLedger + (365 * 24 * 60 * 60 / 5) // ~1 year

      const approveTx = await buildApproveTokenTx(
        publicKey,
        CONTRACTS.USDC,
        CONTRACTS.SOROSUB,
        approvalAmount,
        expirationLedger
      )

      const signedApproveTx = await sign(approveTx.toXDR())
      if (!signedApproveTx) {
        throw new Error('Failed to sign approval transaction')
      }

      await submitTransaction(signedApproveTx)

      // Step 2: Create the subscription
      setStatus('creating')

      const createTx = await buildCreateSubscriptionTx(
        publicKey,
        formData.providerAddress,
        CONTRACTS.USDC,
        amount,
        intervalSeconds
      )

      const signedCreateTx = await sign(createTx.toXDR())
      if (!signedCreateTx) {
        throw new Error('Failed to sign subscription transaction')
      }

      await submitTransaction(signedCreateTx)

      // Success!
      setStatus('success')
      setFormData({ providerAddress: '', amount: '', interval: 'MONTHLY' })

      // Reset after 3 seconds
      setTimeout(() => setStatus('idle'), 3000)

    } catch (error) {
      console.error('Subscription error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create subscription')
      setStatus('error')
    }
  }

  const isFormValid = formData.providerAddress && formData.amount && parseFloat(formData.amount) > 0
  const isProcessing = status === 'approving' || status === 'creating'

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700">
      <div className="border-b border-border/40 px-6 py-5 bg-gradient-to-r from-accent/5 to-primary/5">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/20">
            <Plus className="w-5 h-5 text-accent" />
          </div>
          New Subscription
        </h2>
        <p className="text-sm text-muted-foreground mt-2">Create a new recurring payment</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 md:space-y-5">
        {/* Provider Address */}
        <div className="space-y-2">
          <label htmlFor="providerAddress" className="block text-sm font-semibold text-foreground">
            Provider Address
            <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="providerAddress"
            name="providerAddress"
            value={formData.providerAddress}
            onChange={handleChange}
            placeholder="G7HXF5H..."
            disabled={isProcessing}
            className="w-full px-4 py-2.5 md:py-3 bg-background/50 border border-border/60 rounded-lg text-sm smooth-transition focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 text-foreground placeholder-muted-foreground/50 hover:border-border/80 disabled:opacity-50"
            aria-label="Provider Address"
            required
          />
          <p className="text-xs text-muted-foreground">Service provider&apos;s Stellar address</p>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label htmlFor="amount" className="block text-sm font-semibold text-foreground">
            Amount (USDC)
            <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="15.50"
              step="0.01"
              min="0"
              disabled={isProcessing}
              className="w-full px-4 py-2.5 md:py-3 bg-background/50 border border-border/60 rounded-lg text-sm smooth-transition focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 text-foreground placeholder-muted-foreground/50 hover:border-border/80 disabled:opacity-50"
              aria-label="Amount in USDC"
              required
            />
            {formData.amount && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-accent">
                USDC
              </span>
            )}
          </div>
        </div>

        {/* Interval Selector */}
        <div className="space-y-2">
          <label htmlFor="interval" className="block text-sm font-semibold text-foreground">
            Payment Interval
          </label>
          <select
            id="interval"
            name="interval"
            value={formData.interval}
            onChange={handleChange}
            disabled={isProcessing}
            className="w-full px-4 py-2.5 md:py-3 bg-background/50 border border-border/60 rounded-lg text-sm smooth-transition focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 text-foreground hover:border-border/80 disabled:opacity-50"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>

        {/* Error Message */}
        {status === 'error' && errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{errorMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isProcessing || status === 'success' || !isConnected}
          className={`w-full mt-6 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${status === 'success'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50'
              : isFormValid && isConnected
                ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105'
                : 'opacity-40 cursor-not-allowed bg-gradient-to-r from-primary to-accent text-primary-foreground'
            }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{status === 'approving' ? 'Approving Token...' : 'Creating Subscription...'}</span>
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Subscribed!</span>
            </>
          ) : !isConnected ? (
            <span>Connect Wallet First</span>
          ) : (
            <>
              <span>Subscribe Now</span>
              <Plus className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Network Info */}
        <div className="pt-4 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/5 border border-accent/10">
            <p className="text-xs text-muted-foreground">Network</p>
            <p className="text-xs font-semibold text-accent">Soroban Testnet</p>
          </div>
          <p className="text-xs text-muted-foreground text-center">Gas fees apply to transactions</p>
        </div>
      </form>
    </div>
  )
}
