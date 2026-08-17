// app/page.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Activity, Zap, Heart, Brain, TrendingUp,
  ChevronRight, Lock, FileText, Users, Award, Sparkles
} from "lucide-react";
import { useState } from "react";
import Pricing from "@/components/Pricing";
import AuthModal from "@/components/AuthModal";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = (i: number) => ({ transition: { delay: 0.1 + i * 0.1, duration: 0.5 } });

export default function Home() {
  const { user, loading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Deliberately no `if (loading) return <spinner />` here.
  //
  // Auth is resolved on the client, so `loading` is always true during server
  // rendering — which meant the entire marketing page server-rendered as the
  // word "Loading...". That is exactly what a crawler stores. For a product
  // whose economics only work through organic search, having the homepage be
  // invisible to search engines is close to fatal.
  //
  // None of this content depends on who is looking at it. Only the call to
  // action does, and it defaults to the signed-out version — which is the right
  // one for a visitor arriving from search anyway.

  const features = [
    {
      icon: Zap,
      title: "Analysis in Minutes",
      desc: "Upload your report and get comprehensive AI-powered insights in a couple of minutes.",
      color: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-400",
      border: "hover:border-yellow-500/30",
    },
    {
      icon: Brain,
      title: "Plain English Results",
      desc: "No more confusing medical jargon. Every marker explained simply and clearly.",
      color: "from-primary-500/20 to-secondary-500/20",
      iconColor: "text-primary-600 dark:text-primary-400",
      border: "hover:border-primary-500/30",
    },
    {
      icon: Heart,
      title: "Personalized Diet Plan",
      desc: "AI-generated meal plans tailored to your specific blood markers and health goals.",
      color: "from-red-500/20 to-pink-500/20",
      iconColor: "text-red-400",
      border: "hover:border-red-500/30",
    },
    {
      icon: TrendingUp,
      title: "Trend Tracking",
      desc: "Monitor your health progress over time with trend charts and historical data.",
      color: "from-accent-500/20 to-secondary-500/20",
      iconColor: "text-accent-600 dark:text-accent-400",
      border: "hover:border-accent-500/30",
    },
    {
      icon: Activity,
      title: "Wellness Protocol",
      desc: "Custom workout, supplement, and lifestyle recommendations based on your data.",
      color: "from-secondary-500/20 to-primary-500/20",
      iconColor: "text-secondary-600 dark:text-secondary-400",
      border: "hover:border-secondary-500/30",
    },
    {
      icon: ShieldCheck,
      title: "Private by Default",
      desc: "Encrypted in transit and at rest. Your reports are tied to your account and visible only to you.",
      color: "from-emerald-500/20 to-accent-500/20",
      iconColor: "text-emerald-400",
      border: "hover:border-emerald-500/30",
    },
  ];

  const steps = [
    { num: "01", title: "Upload Your Report", desc: "Drag and drop your PDF or image blood report. We support all standard lab formats.", icon: FileText },
    { num: "02", title: "AI Analyzes Instantly", desc: "Our GPT-4.1 powered engine reads every marker, flags abnormal values, and cross-references medical databases.", icon: Brain },
    { num: "03", title: "Get Your Health Plan", desc: "Receive a personalized wellness protocol with diet, exercise, and supplement recommendations.", icon: Sparkles },
  ];

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#08110F] text-gray-900 dark:text-white overflow-x-hidden">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-primary-600/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-[-10%] right-[5%] w-[500px] h-[500px] bg-secondary-600/15 rounded-full blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[30%] w-[700px] h-[700px] bg-primary-800/15 rounded-full blur-[130px] animate-blob animation-delay-4000" />
        <div className="absolute inset-0 dot-grid opacity-40" />
      </div>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative z-10 pt-36 pb-24 px-4 sm:px-6 text-center max-w-6xl mx-auto">
        <motion.div {...fadeUp} {...stagger(0)}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-primary-600 dark:text-primary-400" />
          Powered by GPT-4.1
        </motion.div>

        <motion.h1 {...fadeUp} {...stagger(1)}
          className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.05] mb-6"
        >
          Decode Your
          <br />
          <span className="shimmer-text">Blood Report</span>
          <br />
          <span className="text-gray-700 dark:text-gray-300">with AI</span>
        </motion.h1>

        <motion.p {...fadeUp} {...stagger(2)}
          className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto mb-12"
        >
          Upload your blood test. Get an instant, personalized health protocol — diet plan, supplement stack, and lifestyle tips — in plain English.
        </motion.p>

        <motion.div {...fadeUp} {...stagger(3)}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {user ? (
            <Link href="/upload">
              <motion.div
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-500 text-white font-bold rounded-2xl shadow-2xl shadow-primary-600/30 hover:shadow-primary-500/50 transition-all duration-200 cursor-pointer text-lg"
              >
                <Sparkles className="w-5 h-5" />
                Analyze My Report
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.div>
            </Link>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsAuthModalOpen(true)}
                className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-500 text-white font-bold rounded-2xl shadow-2xl shadow-primary-600/30 hover:shadow-primary-500/50 transition-all duration-200 text-lg"
              >
                <Sparkles className="w-5 h-5" />
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <Link href="#features" className="inline-flex items-center gap-2 px-6 py-4 text-gray-600 dark:text-gray-400 hover:text-white font-semibold transition-colors text-lg">
                See how it works
                <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </motion.div>

        {/* Trust indicators */}
        <motion.div {...fadeUp} {...stagger(4)}
          className="flex flex-wrap justify-center gap-6 mt-16 text-sm text-gray-500 dark:text-gray-400"
        >
          {[
            { icon: Users, text: "Free to try, no card required" },
            { icon: ShieldCheck, text: "Encrypted in transit & at rest" },
            { icon: Award, text: "Reads reports from any lab" },
            { icon: Zap, text: "Powered by GPT-4.1" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <item.icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>{item.text}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── HERO VISUAL CARD ─────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, type: "spring" }}
          className="relative"
        >
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-primary-500/50 to-secondary-500/50 blur-sm opacity-60" />
          <div className="relative rounded-3xl bg-gray-900/80 border border-gray-200 dark:border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Header bar */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-accent-500/70" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/8 text-xs text-gray-500 dark:text-gray-400 font-mono">
                  bloodlab.in/results/report_xyz
                </div>
              </div>
            </div>

            {/* Mock report UI */}
            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Score card */}
              <div className="sm:col-span-1 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-primary-600/20 to-secondary-500/20 border border-primary-500/20">
                <div className="text-6xl font-black text-gray-900 dark:text-white mb-1">8.2</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Overall Health Score</div>
                <div className="mt-3 px-3 py-1 rounded-full bg-accent-500/20 text-accent-600 dark:text-accent-400 text-xs font-bold">⬆ Above Average</div>
              </div>

              {/* Markers */}
              <div className="sm:col-span-2 space-y-3">
                {[
                  { name: "Glucose", val: "95 mg/dL", status: "normal", pct: 65 },
                  { name: "Vitamin D", val: "18 ng/mL", status: "low", pct: 30 },
                  { name: "LDL Cholesterol", val: "142 mg/dL", status: "high", pct: 80 },
                  { name: "Haemoglobin", val: "14.2 g/dL", status: "normal", pct: 70 },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-xs text-gray-600 dark:text-gray-400 font-medium">{m.name}</div>
                    <div className="flex-1 h-2 rounded-full bg-gray-50 dark:bg-white/8">
                      <div
                        className={`h-full rounded-full ${m.status === "normal" ? "bg-accent-400" :
                            m.status === "low" ? "bg-yellow-400" : "bg-red-400"
                          }`}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 w-20 shrink-0 text-right font-mono">{m.val}</div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${m.status === "normal" ? "bg-accent-500/20 text-accent-600 dark:text-accent-400" :
                        m.status === "low" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                      }`}>
                      {m.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI recommendation strip */}
            <div className="px-6 sm:px-8 pb-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
                  <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-1">AI Recommendation</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Your Vitamin D is critically low. Start with 4,000 IU D3 + K2 supplement daily. Get 20 min of sunlight exposure before 10 AM. Retest in 8 weeks.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-500/10 border border-secondary-500/25 text-secondary-700 dark:text-secondary-300 text-sm font-medium mb-4"
          >
            How it works
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white"
          >
            From upload to insights
            <br />
            <span className="gradient-text">in 3 simple steps</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* connecting line */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-primary-500/50 via-secondary-500/50 to-accent-500/50" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center p-8 rounded-3xl glass-card border border-gray-200 dark:border-white/8 hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-6 relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600/30 to-secondary-500/30 border border-primary-500/30 flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-primary-700 dark:text-primary-300" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-primary-500/30">
                  {i + 1}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/25 text-accent-600 dark:text-accent-300 text-sm font-medium mb-4"
          >
            Everything you need
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white"
          >
            Your complete
            <br />
            <span className="gradient-text">health intelligence platform</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`group relative p-6 rounded-2xl border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/3 hover:bg-white/7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${feat.border}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-5`}>
                <feat.icon className={`w-6 h-6 ${feat.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-300 transition-colors">{feat.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section className="relative z-10">
        <Pricing />
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-12 sm:p-16 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700/80 via-primary-600/70 to-secondary-600/60" />
          <div className="absolute inset-0 dot-grid opacity-20" />
          <div className="absolute -top-1/2 -left-1/4 w-full h-full rounded-full bg-primary-400/10 blur-3xl" />

          <div className="relative z-10">
            <Lock className="w-12 h-12 text-primary-600/70 dark:text-white/60 mx-auto mb-6" />
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
              Your health data, decoded.
            </h2>
            <p className="text-primary-700 dark:text-primary-200 text-lg mb-10 max-w-xl mx-auto">
              Understand your blood work and take control of your health.
            </p>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2.5 px-10 py-4 bg-white text-gray-900 font-bold rounded-2xl text-lg hover:bg-gray-100 transition-all duration-200 shadow-2xl"
            >
              <Sparkles className="w-5 h-5 text-primary-600" />
              Analyze Your First Report Free
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            <p className="mt-5 text-primary-700 dark:text-primary-300 text-sm">No credit card required · Cancel anytime</p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-white/8 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-secondary-400 flex items-center justify-center">
              <Activity className="w-4 h-4 text-gray-900 dark:text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Blood<span className="text-primary-600 dark:text-primary-400">Lab</span></span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
            © 2025 Blood Lab. For informational purposes only — not medical advice.
          </p>
          <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}