import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared shell for the policy pages.
 *
 * Razorpay checks for these during activation and follows the links, so they
 * have to be real pages on the live domain rather than a modal or a PDF. One
 * component means the five of them cannot drift apart in tone or date.
 */

export const LEGAL_UPDATED = '16 August 2026';

/** Single source for the details that appear across several policies. */
export const BUSINESS = {
    name: 'Mohammad Nazrul Ansari',
    trading: 'Blood Lab',
    email: 'dudelynft@gmail.com',
    address: 'Santa Cruz',
    city: 'Mumbai, Maharashtra, India',
    // TODO — Razorpay verifies this during activation and a contact page
    // without a reachable number is a common rejection. Fill it before
    // submitting.
    phone: '[ADD YOUR PHONE NUMBER]',
} as const;

export default function LegalPage({
    title,
    intro,
    children,
}: {
    title: string;
    intro?: string;
    children: ReactNode;
}) {
    return (
        <main className="mx-auto max-w-3xl px-6 py-16">
            <Link href="/" className="text-sm text-primary-600 hover:underline">
                ← Back to Blood Lab
            </Link>

            <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: {LEGAL_UPDATED}</p>

            {intro ? <p className="mt-6 leading-relaxed text-gray-700">{intro}</p> : null}

            <div className="mt-8 space-y-8">{children}</div>

            <hr className="my-12 border-gray-200" />
            <p className="text-sm text-gray-500">
                {BUSINESS.trading} is operated by {BUSINESS.name}, {BUSINESS.city}. Questions
                about this page: <a className="underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            </p>
        </main>
    );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <div className="mt-3 leading-relaxed text-gray-700 space-y-3">{children}</div>
        </section>
    );
}
