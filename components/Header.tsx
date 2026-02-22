// components/Header.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { Moon, Sun, LogOut, Menu, X, User, FileText, Upload, CreditCard, Activity, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import AuthModal from "./AuthModal";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { name: "Upload", href: "/upload", icon: Upload },
    { name: "History", href: "/history", icon: FileText },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Pricing", href: "/subscribe", icon: CreditCard },
  ];

  return (
    <>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 25 }}
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled
            ? "py-2"
            : "py-4"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className={`flex justify-between items-center px-4 sm:px-6 h-14 rounded-2xl transition-all duration-500 ${scrolled
                ? "bg-gray-950/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40"
                : "bg-transparent"
              }`}
          >
            {/* Logo */}
            <div
              className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer group"
              onClick={() => router.push("/")}
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-secondary-400 flex items-center justify-center text-white shadow-lg shadow-primary-500/40"
              >
                <Activity className="w-5 h-5" />
              </motion.div>
              <span className="text-lg font-bold text-white tracking-tight">
                Blood<span className="text-primary-400">AI</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {user && navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/8 transition-all duration-200"
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all duration-200"
              >
                {mounted ? (
                  theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4" />
                )}
              </button>

              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/8 transition-all duration-200"
                  >
                    Sign In
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-500 text-white text-sm font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-200"
                  >
                    Get Started
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all"
              >
                {mounted ? (
                  theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all"
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <X className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Menu className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden mx-4 mt-2 rounded-2xl bg-gray-950/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-4 space-y-1">
                {user && navLinks.map((link, i) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/8 text-gray-300 hover:text-white font-medium transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
                        <link.icon className="w-4 h-4 text-primary-400" />
                      </div>
                      {link.name}
                    </Link>
                  </motion.div>
                ))}

                {!user && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/8 text-gray-300 hover:text-white font-medium transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-400" />
                    </div>
                    Sign In
                  </motion.button>
                )}

                {user && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: navLinks.length * 0.05 }}
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    Sign Out
                  </motion.button>
                )}

                {!user && (
                  <div className="pt-2 pb-1">
                    <button
                      onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-500 text-white font-semibold shadow-lg shadow-primary-500/30"
                    >
                      Get Started Free
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}