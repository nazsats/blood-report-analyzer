// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "firebase/auth";
import { AlertCircle, Loader2, Mail, Lock, ArrowRight, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleEmailAuth = async () => {
        setLoading(true);
        setError("");
        console.log(`Attempting ${isSignup ? "Sign Up" : "Sign In"} for:`, email);
        try {
            if (isSignup) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log("Sign up success:", userCredential.user);
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log("Sign in success:", userCredential.user);
            }
            router.push("/upload");
        } catch (err: any) {
            console.error("Auth error:", err);
            setError(err.message || "Authentication failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        setError("");
        console.log("Attempting Google Sign In");
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            console.log("Google sign in success:", userCredential.user);
            router.push("/upload");
        } catch (err: any) {
            console.error("Google auth error:", err);
            setError(err.message || "Google sign-in failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-4">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-gray-700/50 p-10"
            >
                {/* Logo / Title */}
                <div className="text-center mb-10">
                    <motion.h1
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3"
                    >
                        Blood Report AI
                    </motion.h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {isSignup ? "Create your account" : "Welcome back!"}
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    {/* Sign In / Sign Up Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleEmailAuth}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-blue-500/50"
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin" />
                                {isSignup ? "Creating Account..." : "Signing In..."}
                            </>
                        ) : isSignup ? (
                            <>
                                <UserPlus className="h-5 w-5" />
                                Create Account
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </motion.button>

                    {/* Google Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGoogle}
                        disabled={loading}
                        className={`w-full py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-md ${loading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.51h5.84c-.25 1.31-.98 2.42-2.07 3.16v2.6h3.35c1.96-1.81 3.09-4.47 3.09-7.51z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-1.01 7.28-2.73l-3.35-2.6c-1.01.68-2.29 1.08-3.93 1.08-3.02 0-5.58-2.04-6.49-4.79H.96v2.67C2.75 20.94 6.97 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.51 14.21c-.23-.68-.36-1.41-.36-2.21s.13-1.53.36-2.21V7.34H.96C.35 8.85 0 10.38 0 12s.35 3.15.96 4.66l4.55-2.45z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 4.98c1.64 0 3.11.56 4.27 1.66l3.19-3.19C17.46 1.01 14.97 0 12 0 6.97 0 2.75 2.06.96 5.34l4.55 2.45C6.42 5.02 8.98 4.98 12 4.98z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </motion.button>

                    {/* Toggle Sign Up / Sign In */}
                    <div className="text-center mt-6">
                        <p className="text-gray-600 dark:text-gray-400">
                            {isSignup ? "Already have an account?" : "Don't have an account?"}
                        </p>
                        <button
                            onClick={() => setIsSignup(!isSignup)}
                            className="mt-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                            {isSignup ? "Sign In" : "Create Account"}
                        </button>
                    </div>

                    {/* Forgot Password */}
                    {!isSignup && (
                        <div className="text-center mt-4">
                            <a
                                href="#"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                Forgot your password?
                            </a>
                        </div>
                    )}

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-3"
                            >
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
