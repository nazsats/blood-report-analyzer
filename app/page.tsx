// app/page.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Activity, Zap, Heart } from "lucide-react";
import { useState } from "react";

import Pricing from "@/components/Pricing";

export default function Home() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Upload your blood report and I can analyze it for you.' },
    { role: 'user', content: 'What does high LDL cholesterol mean?' },
    { role: 'assistant', content: 'High LDL (Low-Density Lipoprotein) is often called "bad" cholesterol. It can build up in your arteries and increase heart risk. We should look at your diet and exercise plan.' }
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block relative"
          >
            <div className="absolute inset-0 rounded-full blur-xl bg-primary-500/30" />
            <ShieldCheck className="relative h-16 w-16 text-primary-600 dark:text-primary-500" />
          </motion.div>
          <p className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-400">
            Securing your health data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-gray-950 selection:bg-primary-100 dark:selection:bg-primary-900/30">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-400/20 rounded-full blur-[100px] -translate-y-1/2 mix-blend-multiply dark:mix-blend-screen dark:bg-primary-900/20 animate-blob" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-secondary-400/20 rounded-full blur-[100px] -translate-y-1/2 mix-blend-multiply dark:mix-blend-screen dark:bg-secondary-900/20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-primary-300/20 rounded-full blur-[100px] translate-y-1/2 mix-blend-multiply dark:mix-blend-screen dark:bg-primary-800/20 animate-blob animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-32 sm:pt-40 sm:pb-40">
        <div className="text-center max-w-5xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-medium text-sm mb-8 shadow-sm"
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>Now with GPT-4 Medical Analysis</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 dark:text-white mb-8"
          >
            Decode Your Blood Work <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600 dark:from-primary-400 dark:via-secondary-400 dark:to-primary-400 animate-gradient">
              Talk to Your Health AI
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto"
          >
            Don't just read your report—ask it questions. Our AI explains complex
            medical terms in plain English and gives you actionable advice.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {user ? (
              <Link
                href="/upload"
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-primary-600 text-white font-semibold rounded-2xl overflow-hidden transition-all hover:bg-primary-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10">Start Chatting Analysis</span>
                <ArrowRight className="h-5 w-5 relative z-10 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-2xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  <span className="relative z-10">Get Started Free</span>
                  <ArrowRight className="h-5 w-5 relative z-10 transition-transform group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-white/10 dark:bg-black/5 opacity-0 group-hover:opacity-100" />
                </Link>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-8 py-4 text-gray-600 dark:text-gray-300 font-semibold hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  See Examples
                </Link>
              </>
            )}
          </motion.div>
        </div>

        {/* Chatbot Simulation Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
          className="relative mx-auto max-w-4xl"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-3xl blur-2xl opacity-20 dark:opacity-30 animate-pulse" />
          <div className="relative rounded-2xl glass p-1 shadow-2xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
            <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col h-[500px]">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-white">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Dr. AI Assistant</h3>
                  <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Online & Ready
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 space-y-6 overflow-hidden relative">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + (i * 0.5) }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary-100 dark:bg-primary-900/50'}`}>
                      {msg.role === 'user' ? <div className="text-xs font-bold">U</div> : <Activity className="h-4 w-4 text-primary-600" />}
                    </div>
                    <div className={`p-4 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Faux Input */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="h-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center px-4 text-gray-400 text-sm">
                  Ask about your glucose levels...
                </div>
              </div>
            </div>
          </div>
        </motion.div>


        {/* Features Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 text-left">
          {[
            {
              icon: Activity,
              title: "Instant Analysis",
              desc: "Get results in under 30 seconds with 99% accuracy on standard markers.",
              color: "text-secondary-500",
              bg: "bg-secondary-50 dark:bg-secondary-900/20",
              border: "group-hover:border-secondary-200 dark:group-hover:border-secondary-800",
            },
            {
              icon: Heart,
              title: "Plain English",
              desc: "No more confusing medical terms. We explain everything simply and clearly.",
              color: "text-red-500",
              bg: "bg-red-50 dark:bg-red-900/20",
              border: "group-hover:border-red-200 dark:group-hover:border-red-800",
            },
            {
              icon: ShieldCheck,
              title: "Bank-Grade Security",
              desc: "Your data is encrypted end-to-end and HIPAA compliant. We prioritize privacy.",
              color: "text-primary-500",
              bg: "bg-primary-50 dark:bg-primary-900/20",
              border: "group-hover:border-primary-200 dark:group-hover:border-primary-800",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group p-8 rounded-3xl glass hover:bg-white dark:hover:bg-gray-800 border border-transparent ${feature.border} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 ring-4 ring-white dark:ring-gray-900`}>
                <feature.icon className={`h-7 w-7 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <Pricing />

      </div>
    </div>
  );
}