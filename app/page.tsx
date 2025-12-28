// app/page.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <ShieldCheck className="h-12 w-12 text-blue-500" />
          </motion.div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your health companion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-indigo-950 dark:to-purple-950">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Full-screen Hero Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero.png"
            alt="Blood Report Illustration"
            className="w-full h-full object-cover brightness-75 dark:brightness-50"
            loading="eager"
           
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent dark:from-black/80" />
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-blue-200 to-indigo-200 bg-clip-text text-transparent">
              Understand Your Blood Report
              <br />
              <span className="text-blue-300 dark:text-blue-200">In Plain English</span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-200 dark:text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Upload your lab report photo or PDF <br></br> our friendly AI turns complex numbers into
              <span className="font-semibold text-white"> clear, actionable insights</span> you can actually understand.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {user ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/upload"
                    className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300"
                  >
                    Upload Your Report Now
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href="/auth"
                      className="group inline-flex items-center gap-3 px-10 py-5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-semibold text-lg rounded-2xl shadow-xl hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-300"
                    >
                      Sign In to Start
                      <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link
                      href="/upload"
                      className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-lg rounded-2xl shadow-2xl hover:shadow-green-500/50 transition-all duration-300"
                    >
                      Try Without Signing In
                    </Link>
                  </motion.div>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-300" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Powered by GPT-4o</span>
              </div>
              <div className="flex items-center gap-2">
                <span>100% Secure</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}