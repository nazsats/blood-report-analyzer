// app/subscribe/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import confetti from "canvas-confetti";
import { Loader2, Crown, Users, CheckCircle2, Sparkles, ArrowRight, Shield } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    id: "plan_SFmGHeN34MjdIc",
    name: "Pro Health",
    icon: Crown,
    price: 3.99,
    period: "/month",
    description: "Deep insights for serious health optimisers.",
    features: [
      "Unlimited report uploads",
      "Full history & trend charts",
      "AI-powered plain English results",
      "Diet, exercise & supplement plans",
      "Priority processing",
      "Export to PDF",
    ],
    popular: true,
    gradient: "from-primary-600 to-secondary-500",
    iconColor: "text-primary-300",
    border: "border-primary-500/50",
    ctaStyle: "bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-lg shadow-primary-600/30 hover:shadow-primary-500/50",
  },
  {
    id: "plan_SFmGI5v0hq1BJ3",
    name: "Family",
    icon: Users,
    price: 9.99,
    period: "/month",
    description: "Complete health tracking for the whole family.",
    features: [
      "Everything in Pro",
      "Up to 5 family members",
      "Combined family health reports",
      "Genetic risk assessment",
      "24/7 priority support",
    ],
    popular: false,
    gradient: "from-accent-600 to-secondary-600",
    iconColor: "text-accent-400",
    border: "border-white/10",
    ctaStyle: "bg-white/8 hover:bg-white/14 text-white border border-white/12",
  },
];

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [checkingSub, setCheckingSub] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!auth.currentUser) { setCheckingSub(false); return; }
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/check-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ uid: auth.currentUser.uid }),
        });
        const data = await res.json();
        if (data.active) setIsSubscribed(true);
      } catch (err) {
        console.error("Error checking subscription:", err);
      } finally {
        setCheckingSub(false);
      }
    };
    checkSubscription();
  }, []);

  const handleSubscribe = async (planId: string, planName: string) => {
    if (!auth.currentUser) { router.push("/login"); return; }
    if (isSubscribed) { router.push("/upload"); return; }
    if (!window.Razorpay) { alert("Payment system loading. Try again in a few seconds."); return; }

    setLoading(planId);
    try {
      const token = await auth.currentUser.getIdToken();
      const uid = auth.currentUser.uid;

      const createRes = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, uid, planName }),
      });

      const createData = await createRes.json();
      if (!createData.subscriptionId) throw new Error(createData.error || "Failed to create subscription");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        subscription_id: createData.subscriptionId,
        name: "BloodAI",
        description: `${planName} Plan`,
        image: "/logo.png",
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/activate-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                subscriptionId: response.razorpay_subscription_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.ok) {
              confetti({
                particleCount: 200,
                spread: 80,
                origin: { y: 0.6 },
                colors: ["#7c3aed", "#06b6d4", "#4ade80", "#f59e0b"],
                ticks: 300,
              });
              router.push("/upload");
            } else {
              const err = await verifyRes.json();
              alert(`Verification failed: ${err.error || "Contact support."}`);
            }
          } catch {
            alert("Network error during verification. Please contact support.");
          }
        },
        prefill: {
          email: auth.currentUser?.email || "",
          contact: auth.currentUser?.phoneNumber || "",
        },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        alert(`Payment failed: ${response.error.description || "Unknown error"}`);
        setLoading(null);
      });
      rzp.open();
    } catch (err: any) {
      alert("Error: " + (err.message || "Something went wrong"));
      setLoading(null);
    }
  };

  if (checkingSub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0414]">
        <div className="w-12 h-12 rounded-full border-2 border-primary-700 border-t-primary-400 animate-spin" />
      </div>
    );
  }

  if (isSubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0414] px-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative text-center max-w-md glass-card border border-white/10 p-12 rounded-3xl z-10"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600/30 to-accent-500/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-accent-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">You're Already Pro!</h1>
          <p className="text-gray-400 mb-8">Enjoy unlimited reports, full history, and all premium features.</p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/upload")}
            className="w-full py-4 bg-gradient-to-r from-primary-600 to-secondary-500 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/30"
          >
            Analyze a Report →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0414] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-primary-600/15 rounded-full blur-[130px]" />
        <div className="absolute top-[20%] right-[5%] w-[400px] h-[400px] bg-secondary-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 dot-grid opacity-25" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto py-32 px-4 sm:px-6">
        {/* Hero */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-300 text-sm font-medium mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade to Pro
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-4"
          >
            Your health,
            <span className="gradient-text"> fully unlocked</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-xl mx-auto"
          >
            Unlimited reports, personalized wellness protocols, trend tracking and AI chat — all for less than your morning coffee.
          </motion.p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className={`relative flex flex-col rounded-3xl border p-8 bg-white/3 backdrop-blur-xl transition-all duration-300 ${plan.border} ${plan.popular ? "shadow-2xl shadow-primary-500/20" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-600 to-secondary-500 text-white text-xs font-bold shadow-lg tracking-wider uppercase">
                    Best Value
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/8 flex items-center justify-center">
                  <plan.icon className={`w-6 h-6 ${plan.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                  <p className="text-gray-500 text-sm">{plan.description}</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-white">${plan.price}</span>
                  <span className="text-gray-500 text-sm mb-2">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.popular ? "bg-primary-500/25" : "bg-white/8"}`}>
                      <CheckCircle2 className={`w-3 h-3 ${plan.popular ? "text-primary-300" : "text-accent-400"}`} />
                    </div>
                    <span className="text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSubscribe(plan.id, plan.name)}
                disabled={loading !== null}
                className={`w-full py-4 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed ${plan.ctaStyle}`}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Subscribe to {plan.name}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Trust footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center space-y-4"
        >
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-accent-500" />Secured by Razorpay</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-500" />Cancel anytime</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent-500" />No hidden fees</div>
          </div>
          <Link href="/upload" className="inline-block text-gray-600 hover:text-gray-400 text-sm transition-colors">
            ← Back to upload
          </Link>
        </motion.div>
      </div>
    </div>
  );
}