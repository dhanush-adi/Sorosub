// Subscription storage for tracking created subscriptions
// Uses localStorage to persist across page refreshes

export interface StoredSubscription {
    id: string;
    name: string;
    providerAddress: string;
    amount: number;
    intervalSeconds: number;
    createdAt: number;
    tokenAddress: string;
}

const STORAGE_KEY = 'sorosub_subscriptions';

export function getStoredSubscriptions(): StoredSubscription[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

export function addSubscription(subscription: StoredSubscription): void {
    if (typeof window === 'undefined') return;
    const subscriptions = getStoredSubscriptions();
    // Avoid duplicates
    const existing = subscriptions.find(
        s => s.providerAddress === subscription.providerAddress && s.name === subscription.name
    );
    if (!existing) {
        subscriptions.push(subscription);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    }
}

export function removeSubscription(id: string): void {
    if (typeof window === 'undefined') return;
    const subscriptions = getStoredSubscriptions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

export function clearSubscriptions(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

// Calculate next renewal date from creation date and interval
export function getNextRenewalDate(createdAt: number, intervalSeconds: number): string {
    const now = Date.now();
    const intervalMs = intervalSeconds * 1000;
    const elapsed = now - createdAt;
    const periodsElapsed = Math.floor(elapsed / intervalMs);
    const nextRenewal = createdAt + (periodsElapsed + 1) * intervalMs;

    return new Date(nextRenewal).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
