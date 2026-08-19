'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { auth } from '@/lib/firebaseClient';
import { fetchBalance, onBalanceChanged, type Balance } from '@/lib/balance';

/**
 * Reports remaining, in the header, on every page.
 *
 * Two jobs. The obvious one is answering "how many do I have left" without
 * making someone dig for it. The less obvious one is that a number you own and
 * can see is worth more than one you have to go and check — so when it goes up
 * it flashes, and the increase is called out rather than quietly replaced.
 *
 * Renders nothing when signed out or still loading. A pill that briefly says
 * "0 left" before auth resolves reads as a paywall to someone who has not
 * spent anything yet.
 */

export default function CreditPill({ className = '' }: { className?: string }) {
    const [balance, setBalance] = useState<Balance | null>(null);
    const [bumped, setBumped] = useState(false);
    const previous = useRef<number | null>(null);

    const refresh = useCallback(async () => {
        const next = await fetchBalance();
        setBalance(next);

        // Flash only on an increase. Spending a report is a normal thing that
        // happens constantly; being given one is the moment worth marking.
        if (next && next.total !== null && previous.current !== null && next.total > previous.current) {
            setBumped(true);
            setTimeout(() => setBumped(false), 2200);
        }
        previous.current = next?.total ?? null;
    }, []);

    useEffect(() => {
        const stopAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setBalance(null);
                previous.current = null;
                return;
            }
            void refresh();
        });
        const stopBalance = onBalanceChanged(() => { void refresh(); });

        // Someone may pay on a phone and come back to a desktop tab that has
        // been sitting open. Re-checking on focus is cheap and keeps the two
        // from disagreeing.
        const onFocus = () => { if (auth.currentUser) void refresh(); };
        window.addEventListener('focus', onFocus);

        return () => { stopAuth(); stopBalance(); window.removeEventListener('focus', onFocus); };
    }, [refresh]);

    if (!balance) return null;

    if (balance.pro) {
        return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-xs font-bold text-primary-700 dark:text-primary-300 ${className}`}>
                <InfinityIcon className="h-3.5 w-3.5" />
                Unlimited
            </span>
        );
    }

    const total = balance.total ?? 0;
    const empty = total === 0;

    return (
        <Link
            href={empty ? '/subscribe' : '/upload'}
            className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                empty
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
                    : 'border-primary-500/30 bg-primary-500/10 text-primary-700 hover:bg-primary-500/20 dark:text-primary-300'
            } ${className}`}
        >
            <motion.span
                key={total}
                initial={{ scale: 1 }}
                animate={bumped ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-1.5"
            >
                <Sparkles className={`h-3.5 w-3.5 ${bumped ? 'text-amber-500' : ''}`} />
                {empty ? 'Get reports' : `${total} report${total === 1 ? '' : 's'}`}
            </motion.span>

            <AnimatePresence>
                {bumped && (
                    <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: -18 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-extrabold text-primary-600 dark:text-primary-400"
                    >
                        added
                    </motion.span>
                )}
            </AnimatePresence>
        </Link>
    );
}
