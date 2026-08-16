// components/Pricing.tsx
"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import BuyReports from "@/components/BuyReports";
import { FREE_REPORTS, PACKS, rupees } from "@/lib/packs";

/**
 * Pricing, in one place.
 *
 * This replaced a monthly subscription page priced in dollars. Two problems
 * with that: it charged for time rather than for the thing that costs money
 * (a report is one expensive API call, whether you read it in January or June),
 * and a rupee price is what an Indian user can actually judge. Nobody wants a
 * subscription to a blood test.
 *
 * Rendered on the homepage and at /subscribe, so the two can never disagree.
 * Numbers come from lib/packs.ts — the same file the server charges from.
 */

const INCLUDED = [
    "Every marker explained in plain English",
    "What is high, what is low, what it means",
    "Diet and lifestyle suggestions for your results",
    "Saved to your history so you can compare later",
    "Ask follow-up questions about your report",
];

export default function Pricing() {
    return (
        <section id="pricing" className="px-6 py-24">
            <div className="mx-auto max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                        Pay per report. No subscription.
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-gray-600 dark:text-gray-400">
                        Your first report is free. After that it&apos;s {rupees(PACKS.single.amountPaise)} each —
                        about what you pay for a cup of chai, for something you actually
                        need to understand.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="mt-12 grid gap-8 md:grid-cols-2"
                >
                    {/* What you get — identical whether you paid or not, which is
                        the point worth making. There is no crippled free tier. */}
                    <div className="rounded-3xl border border-gray-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Every report includes
                        </h3>
                        <ul className="mt-5 space-y-3">
                            {INCLUDED.map((item) => (
                                <li key={item} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-7 rounded-2xl bg-primary-500/10 p-4">
                            <p className="text-sm font-bold text-primary-700 dark:text-primary-300">
                                {FREE_REPORTS === 1 ? "First report free" : `First ${FREE_REPORTS} reports free`}
                            </p>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                Sign in and upload — no card needed to try it.
                            </p>
                        </div>
                    </div>

                    {/* Buying. Same component as the paywall on the upload page,
                        so the price a person sees here is the price they pay. */}
                    <div className="rounded-3xl border border-gray-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Need more?
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Buy reports when you need them. They never expire.
                        </p>

                        <div className="mt-5">
                            <BuyReports compact />
                        </div>
                    </div>
                </motion.div>

                <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Not sure yet?{" "}
                    <Link href="/upload" className="font-semibold text-primary-600 underline dark:text-primary-400">
                        Try your first report free
                    </Link>
                    .
                </p>
            </div>
        </section>
    );
}
