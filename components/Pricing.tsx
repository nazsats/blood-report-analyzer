// components/Pricing.tsx
"use client";

import { useState } from "react";
import { Check, Zap, Crown, Users } from "lucide-react";
import { motion } from "framer-motion";

const tiers = [
    {
        id: "free",
        name: "Starter",
        icon: Zap,
        monthly: 0,
        annual: 0,
        description: "Try AI-powered analysis risk-free.",
        features: [
            "1 Report Analysis / month",
            "Basic Health Summary",
            "Standard Processing Speed",
            "7 Days History Retention",
        ],
        cta: "Get Started Free",
        popular: false,
        iconColor: "text-secondary-400",
        gradientFrom: "from-gray-800",
        gradientTo: "to-gray-900",
        borderColor: "border-white/10",
        ctaStyle: "bg-white/8 hover:bg-white/14 text-white border border-white/12",
    },
    {
        id: "pro",
        name: "Pro Health",
        icon: Crown,
        monthly: 9.99,
        annual: 7.99,
        description: "Deep insights for serious health optimisers.",
        features: [
            "Unlimited Report Analysis",
            "Full Wellness Protocol (Diet, Supplements, Lifestyle)",
            "Trend Charts & History",
            "AI Chat with Dr. Assistant",
            "Priority Processing",
            "Export to PDF",
        ],
        cta: "Start 7-Day Free Trial",
        popular: true,
        iconColor: "text-primary-300",
        gradientFrom: "from-primary-900/80",
        gradientTo: "to-secondary-900/50",
        borderColor: "border-primary-500/50",
        ctaStyle: "bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-lg shadow-primary-600/30 hover:shadow-primary-500/50",
    },
    {
        id: "family",
        name: "Family",
        icon: Users,
        monthly: 19.99,
        annual: 15.99,
        description: "Complete health tracking for the whole family.",
        features: [
            "Everything in Pro",
            "Up to 5 Family Members",
            "Combined Family Health Reports",
            "Genetic Risk Assessment",
            "24/7 Priority Support",
        ],
        cta: "Contact Sales",
        popular: false,
        iconColor: "text-accent-400",
        gradientFrom: "from-gray-800",
        gradientTo: "to-gray-900",
        borderColor: "border-white/10",
        ctaStyle: "bg-white/8 hover:bg-white/14 text-white border border-white/12",
    },
];

export default function Pricing() {
    const [isAnnual, setIsAnnual] = useState(false);

    return (
        <div className="py-24 sm:py-32 relative z-10 px-4 sm:px-6" id="pricing">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-300 text-sm font-medium mb-5"
                    >
                        Simple pricing
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4"
                    >
                        Invest in your
                        <span className="gradient-text"> long-term health</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg mb-10"
                    >
                        Choose a plan. Cancel anytime.
                    </motion.p>

                    {/* Annual/Monthly Toggle */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="inline-flex items-center gap-4 p-1 rounded-2xl bg-white/5 border border-white/10"
                    >
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${!isAnnual ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-white"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isAnnual ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-white"}`}
                        >
                            Annual
                            <span className="px-1.5 py-0.5 rounded-md bg-accent-500/20 text-accent-400 text-xs font-bold">-20%</span>
                        </button>
                    </motion.div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {tiers.map((tier, i) => (
                        <motion.div
                            key={tier.id}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.12 }}
                            whileHover={{ y: tier.popular ? 0 : -6 }}
                            className={`relative flex flex-col rounded-3xl border p-8 transition-all duration-300 bg-gradient-to-br ${tier.gradientFrom} ${tier.gradientTo} ${tier.borderColor} ${tier.popular ? "scale-105 shadow-2xl shadow-primary-500/20" : ""}`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-600 to-secondary-500 text-white text-xs font-bold shadow-lg shadow-primary-500/40 tracking-wider uppercase">
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            {/* Tier header */}
                            <div className="mb-8">
                                <div className={`w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center mb-4`}>
                                    <tier.icon className={`w-6 h-6 ${tier.iconColor}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                                <p className="text-gray-500 text-sm">{tier.description}</p>
                            </div>

                            {/* Price */}
                            <div className="mb-8">
                                <div className="flex items-end gap-1">
                                    <span className="text-5xl font-black text-white">
                                        {tier.monthly === 0 ? "Free" : `$${isAnnual ? tier.annual : tier.monthly}`}
                                    </span>
                                    {tier.monthly > 0 && (
                                        <span className="text-gray-500 text-sm mb-2 ml-1">/mo</span>
                                    )}
                                </div>
                                {tier.monthly > 0 && isAnnual && (
                                    <p className="text-xs text-accent-400 mt-1 font-medium">
                                        Billed annually (save ${((tier.monthly - tier.annual) * 12).toFixed(0)}/yr)
                                    </p>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-10 flex-1">
                                {tier.features.map((f) => (
                                    <li key={f} className="flex items-start gap-3 text-sm">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tier.popular ? "bg-primary-500/25" : "bg-white/8"}`}>
                                            <Check className={`w-3 h-3 ${tier.popular ? "text-primary-300" : "text-accent-400"}`} />
                                        </div>
                                        <span className="text-gray-300">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <button
                                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${tier.ctaStyle}`}
                            >
                                {tier.cta}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
