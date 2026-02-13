"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

const tiers = [
    {
        name: "Starter",
        price: "Free",
        description: "Perfect for trying out our AI analysis.",
        features: [
            "1 Report Analysis per month",
            "Basic Health Summary",
            "Standard Processing Speed",
            "7 Days History Retention"
        ],
        cta: "Get Started",
        popular: false,
        delay: 0
    },
    {
        name: "Pro Health",
        price: "$9.99",
        period: "/month",
        description: "Deep insights for health enthusiasts.",
        features: [
            "Unlimited Report Analysis",
            "Chat with Dr. AI Assistant",
            "Trend Analysis & History",
            "Diet & Exercise Recommendations",
            "Priority Processing",
            "Export to PDF"
        ],
        cta: "Start Free Trial",
        popular: true,
        delay: 0.1
    },
    {
        name: "Family",
        price: "$19.99",
        period: "/month",
        description: "Complete health tracking for the whole family.",
        features: [
            "Everything in Pro",
            "Up to 5 Family Members",
            "Combined Health Reports",
            "Genetic Risk Assessment",
            "24/7 Priority Support"
        ],
        cta: "Contact Sales",
        popular: false,
        delay: 0.2
    }
];

export default function Pricing() {
    return (
        <div className="py-24 sm:py-32" id="pricing">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-primary-600 dark:text-primary-400">Pricing</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                        Invest in your long-term health
                    </p>
                    <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                        Choose the plan that fits your needs. Cancel anytime.
                    </p>
                </div>
                <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
                    {tiers.map((tier) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: tier.delay, duration: 0.5 }}
                            whileHover={{ y: -5 }}
                            className={`relative flex flex-col justify-between rounded-3xl p-8 ring-1 xl:p-10 transition-all duration-300 ${tier.popular
                                    ? "bg-white dark:bg-gray-900 ring-primary-600 shadow-xl shadow-primary-500/20 scale-105 z-10"
                                    : "bg-white/60 dark:bg-gray-800/60 ring-gray-200 dark:ring-gray-700 hover:bg-white dark:hover:bg-gray-800 shadow-sm hover:shadow-lg"
                                }`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 px-3 py-1 text-center text-sm font-medium text-white shadow-lg">
                                    Most Popular
                                </div>
                            )}
                            <div>
                                <div className="flex items-center justify-between gap-x-4">
                                    <h3 className={`text-lg font-semibold leading-8 ${tier.popular ? "text-primary-600 dark:text-primary-400" : "text-gray-900 dark:text-white"}`}>
                                        {tier.name}
                                    </h3>
                                </div>
                                <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                    {tier.description}
                                </p>
                                <p className="mt-6 flex items-baseline gap-x-1">
                                    <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{tier.price}</span>
                                    {tier.period && <span className="text-sm font-semibold leading-6 text-gray-600 dark:text-gray-400">{tier.period}</span>}
                                </p>
                                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex gap-x-3">
                                            <Check className="h-6 w-5 flex-none text-primary-600 dark:text-primary-400" aria-hidden="true" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <a
                                href="#"
                                className={`mt-8 block rounded-xl px-3 py-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-200 ${tier.popular
                                        ? "bg-primary-600 text-white shadow-lg hover:bg-primary-500 hover:shadow-primary-500/30 focus-visible:outline-primary-600"
                                        : "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                                    }`}
                            >
                                {tier.cta}
                            </a>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
