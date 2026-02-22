// components/AuthModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import {
    signInWithPopup, GoogleAuthProvider,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from "firebase/auth";
import {
    AlertCircle, Loader2, Mail, Lock, ArrowRight,
    UserPlus, X, Activity, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: "signin" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode = "signin" }: AuthModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignup, setIsSignup] = useState(initialMode === "signup");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen) {
            setError("");
            setIsSignup(initialMode === "signup");
        }
    }, [isOpen, initialMode]);

    const handleEmailAuth = async () => {
        if (!email || !password) { setError("Please fill in all fields."); return; }
        setLoading(true);
        setError("");
        try {
            if (isSignup) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            onClose();
            router.push("/upload");
        } catch (err: any) {
            if (err.code === "auth/user-not-found") setError("No account found with this email.");
            else if (err.code === "auth/wrong-password") setError("Incorrect password.");
            else if (err.code === "auth/email-already-in-use") setError("Email already in use.");
            else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters.");
            else setError(err.message || "Authentication failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        setError("");
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            onClose();
            router.push("/upload");
        } catch (err: any) {
            setError(err.message || "Google sign-in failed.");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 24 }}
                        transition={{ type: "spring", damping: 22, stiffness: 320, mass: 0.8 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl shadow-black/60"
                        style={{ background: "linear-gradient(135deg, #12072a 0%, #0f0520 100%)", border: "1px solid rgba(124,58,237,0.2)" }}
                    >
                        {/* Top gradient accent line */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-80" />

                        {/* Background blobs */}
                        <div className="absolute -top-24 -right-16 w-64 h-64 bg-primary-600/15 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-20 -left-12 w-56 h-56 bg-secondary-600/10 rounded-full blur-[80px] pointer-events-none" />

                        {/* Close */}
                        <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-200 transition-all z-10">
                            <X className="w-4 h-4" />
                        </motion.button>

                        <div className="relative p-8 sm:p-10">
                            {/* Logo */}
                            <div className="flex items-center justify-center mb-7">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-500 flex items-center justify-center shadow-xl shadow-primary-500/30">
                                    <Activity className="w-7 h-7 text-white" />
                                </div>
                            </div>

                            {/* Header */}
                            <div className="text-center mb-7">
                                <motion.h2 layout className="text-3xl font-black text-white mb-2">
                                    {isSignup ? "Create Account" : "Welcome Back"}
                                </motion.h2>
                                <p className="text-gray-500 text-sm">
                                    {isSignup
                                        ? "Start your AI-powered blood analysis journey."
                                        : "Sign in to access your reports and dashboard."}
                                </p>
                            </div>

                            {/* Google button */}
                            <motion.button
                                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                                onClick={handleGoogle} disabled={loading}
                                className="w-full py-3.5 mb-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-50 text-gray-200 text-sm">
                                <svg className="h-4 w-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.51h5.84c-.25 1.31-.98 2.42-2.07 3.16v2.6h3.35c1.96-1.81 3.09-4.47 3.09-7.51z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-1.01 7.28-2.73l-3.35-2.6c-1.01.68-2.29 1.08-3.93 1.08-3.02 0-5.58-2.04-6.49-4.79H.96v2.67C2.75 20.94 6.97 23 12 23z" fill="#34A853" />
                                    <path d="M5.51 14.21c-.23-.68-.36-1.41-.36-2.21s.13-1.53.36-2.21V7.34H.96C.35 8.85 0 10.38 0 12s.35 3.15.96 4.66l4.55-2.45z" fill="#FBBC05" />
                                    <path d="M12 4.98c1.64 0 3.11.56 4.27 1.66l3.19-3.19C17.46 1.01 14.97 0 12 0 6.97 0 2.75 2.06.96 5.34l4.55 2.45C6.42 5.02 8.98 4.98 12 4.98z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </motion.button>

                            {/* Divider */}
                            <div className="relative flex items-center gap-4 mb-5">
                                <div className="flex-1 h-px bg-white/8" />
                                <span className="text-gray-600 text-xs font-medium">or with email</span>
                                <div className="flex-1 h-px bg-white/8" />
                            </div>

                            {/* Email / Password */}
                            <div className="space-y-3 mb-5">
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary-400 transition-colors" />
                                    <input type="email" placeholder="Email address" value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary-500/60 focus:bg-white/8 transition-all text-white placeholder:text-gray-600 text-sm" />
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-primary-400 transition-colors" />
                                    <input type="password" placeholder="Password" value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary-500/60 focus:bg-white/8 transition-all text-white placeholder:text-gray-600 text-sm" />
                                </div>
                            </div>

                            {/* Submit */}
                            <motion.button
                                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                                onClick={handleEmailAuth} disabled={loading}
                                className="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-primary-600 to-secondary-500 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/40 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm mb-5">
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {isSignup ? <UserPlus className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                        {isSignup ? "Create Account" : "Sign In"}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </motion.button>

                            {/* Toggle */}
                            <p className="text-center text-gray-600 text-xs">
                                {isSignup ? "Already have an account? " : "Don't have an account? "}
                                <button onClick={() => { setIsSignup(!isSignup); setError(""); }}
                                    className="text-primary-400 font-bold hover:text-primary-300 transition-colors underline underline-offset-2">
                                    {isSignup ? "Sign In" : "Sign Up"}
                                </button>
                            </p>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                                        className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-xs font-medium flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                            <AlertCircle className="w-3 h-3 text-red-400" />
                                        </div>
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
