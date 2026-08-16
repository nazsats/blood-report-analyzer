'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { PACKS, rupees, type PackId } from '@/lib/packs';

/**
 * Buying reports.
 *
 * Razorpay Checkout is loaded on demand rather than in the root layout: most
 * visits never reach a paywall, and a payment SDK on every page is weight
 * everyone pays for a few people's benefit.
 *
 * The browser never sends an amount — only a pack id. What it costs is decided
 * in lib/packs.ts on the server, and verified again against the order record
 * before a single credit is granted.
 */

declare global {
    interface Window { Razorpay: any }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckout(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.Razorpay) return Promise.resolve();

    return new Promise((resolve, reject) => {
        // Reuse the tag if a previous attempt already added one, or a second
        // click appends a second script and both fire.
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('checkout_failed')));
            return;
        }
        const el = document.createElement('script');
        el.src = CHECKOUT_SRC;
        el.async = true;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error('checkout_failed'));
        document.body.appendChild(el);
    });
}

export default function BuyReports({
    onPurchased,
    compact = false,
}: {
    onPurchased?: (credits: number) => void;
    compact?: boolean;
}) {
    const [busy, setBusy] = useState<PackId | null>(null);
    const [error, setError] = useState<string | null>(null);

    const buy = async (packId: PackId) => {
        setError(null);
        setBusy(packId);

        try {
            const user = auth.currentUser;
            if (!user) {
                setError('Please sign in first — reports are saved to your account.');
                return;
            }
            const idToken = await user.getIdToken();

            await loadCheckout();

            const res = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ packId }),
            });
            const order = await res.json();
            if (!res.ok) throw new Error(order.error || 'Could not start the payment.');

            const rzp = new window.Razorpay({
                key: order.keyId,
                order_id: order.orderId,
                amount: order.amount,
                currency: order.currency,
                name: 'Blood Lab',
                description: order.pack.label,
                prefill: { email: user.email ?? '' },
                theme: { color: '#0F766E' },
                handler: async (response: any) => {
                    // Verification is the server's job. Checkout calling this
                    // handler means the payment widget is happy, not that money
                    // moved — only /api/verify-payment can establish that.
                    const v = await fetch('/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                        body: JSON.stringify(response),
                    });
                    const result = await v.json();
                    if (!v.ok) {
                        setError(result.error || 'We could not confirm that payment. Please contact us.');
                        setBusy(null);
                        return;
                    }
                    setBusy(null);
                    onPurchased?.(result.creditsAdded);
                },
                modal: {
                    // Without this the button stays spinning after someone
                    // closes the sheet, and the page looks broken.
                    ondismiss: () => setBusy(null),
                },
            });

            rzp.on('payment.failed', (r: any) => {
                setError(r?.error?.description || 'Payment failed. You have not been charged.');
                setBusy(null);
            });

            rzp.open();
        } catch (err: any) {
            setError(
                err?.message === 'checkout_failed'
                    ? 'Could not load the payment window. Check your connection and try again.'
                    : err?.message || 'Something went wrong.',
            );
            setBusy(null);
        }
    };

    const packs = [PACKS.single, PACKS.triple];

    return (
        <div className={compact ? '' : 'mx-auto max-w-lg'}>
            <div className="grid gap-3 sm:grid-cols-2">
                {packs.map((pack) => {
                    const best = pack.id === 'triple';
                    return (
                        <button
                            key={pack.id}
                            onClick={() => buy(pack.id)}
                            disabled={busy !== null}
                            className={[
                                'relative rounded-2xl border p-5 text-left transition',
                                'disabled:cursor-not-allowed disabled:opacity-60',
                                best
                                    ? 'border-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-500/10 dark:hover:bg-primary-500/20'
                                    : 'border-gray-200 bg-white hover:border-primary-400 dark:border-white/10 dark:bg-white/5',
                            ].join(' ')}
                        >
                            {best ? (
                                <span className="absolute -top-2 right-4 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                                    BEST VALUE
                                </span>
                            ) : null}

                            <div className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                {rupees(pack.amountPaise)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {pack.label}
                            </div>
                            <div className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                {pack.blurb}
                            </div>

                            <div className="mt-4 text-sm font-semibold text-primary-600 dark:text-primary-400">
                                {busy === pack.id ? 'Opening…' : 'Buy'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {error ? (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Pay by UPI, card or netbanking. Reports never expire.{' '}
                <a href="/refunds" className="underline">Refund policy</a>.
            </p>
        </div>
    );
}
