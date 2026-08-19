'use client';

import { auth } from './firebaseClient';

/**
 * The credit balance, shared across the app without the Firestore SDK.
 *
 * Deliberately not a Firestore listener. A live listener is the obvious way to
 * do this and it would cost ~465 KB of database client on every page, to keep a
 * number fresh that changes maybe twice in a session. Instead the value is
 * fetched from /api/balance and re-fetched at the two moments it can actually
 * change: a purchase, and a report being analysed.
 *
 * Anything that changes the balance calls notifyBalanceChanged(). Anything
 * displaying it subscribes. No context provider, because the only consumer is
 * a pill in the header and wrapping the tree for that would be heavier than
 * the problem.
 */

export type Balance = {
    free: number;
    credits: number;
    pro: boolean;
    /** free + credits, or null for an unlimited subscription. */
    total: number | null;
};

const listeners = new Set<() => void>();

/** Call after anything that spends or grants a report. */
export function notifyBalanceChanged() {
    listeners.forEach((fn) => fn());
}

export function onBalanceChanged(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export async function fetchBalance(): Promise<Balance | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const res = await fetch('/api/balance', {
            headers: { Authorization: `Bearer ${await user.getIdToken()}` },
            cache: 'no-store',
        });
        if (!res.ok) return null;
        return (await res.json()) as Balance;
    } catch {
        // A failed balance read must never break the page it sits on. The
        // caller renders nothing rather than an error.
        return null;
    }
}
