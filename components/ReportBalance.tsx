'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { auth } from '@/lib/firebaseClient';
import { db } from '@/lib/firebaseDb';
import { FREE_REPORTS } from '@/lib/packs';

/**
 * How many reports you have left.
 *
 * Live via onSnapshot rather than a one-off read: credits are granted by
 * /api/verify-payment on the server, so a page that fetched once would still
 * say "0 left" straight after a successful payment — the exact moment someone
 * is most likely to think their money vanished.
 *
 * Renders nothing while loading or signed out. A balance chip that flashes
 * "0 reports left" before auth resolves reads as a paywall to someone who has
 * not even used their free one.
 */

type Balance = { free: number; credits: number; pro: boolean };

export default function ReportBalance({ className = '' }: { className?: string }) {
    const [balance, setBalance] = useState<Balance | null>(null);

    useEffect(() => {
        let stopDoc: (() => void) | undefined;

        const stopAuth = onAuthStateChanged(auth, (user) => {
            stopDoc?.();
            stopDoc = undefined;

            if (!user) {
                setBalance(null);
                return;
            }

            stopDoc = onSnapshot(
                doc(db, 'users', user.uid),
                (snap) => {
                    const d = snap.data() ?? {};
                    setBalance({
                        free: Math.max(0, FREE_REPORTS - (d.freeUploadsUsed ?? 0)),
                        credits: d.credits ?? 0,
                        pro: d.pro === true,
                    });
                },
                // A permissions hiccup or dropped connection should not put an
                // error box on the upload page. Hide the chip and move on.
                () => setBalance(null),
            );
        });

        return () => {
            stopDoc?.();
            stopAuth();
        };
    }, []);

    if (!balance) return null;

    const total = balance.free + balance.credits;

    const label = balance.pro
        ? 'Unlimited reports'
        : total === 0
            ? 'No reports left'
            : total === 1
                ? `1 report left${balance.credits === 0 ? ' (free)' : ''}`
                : `${total} reports left`;

    const empty = !balance.pro && total === 0;

    return (
        <div
            className={[
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
                empty
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-primary-500/25 bg-primary-500/10 text-primary-700 dark:text-primary-300',
                className,
            ].join(' ')}
        >
            <span>{label}</span>
            {empty ? (
                <Link href="/subscribe" className="underline underline-offset-2">
                    Buy
                </Link>
            ) : null}
        </div>
    );
}
