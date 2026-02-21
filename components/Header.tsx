// components/Header.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { Moon, Sun, LogOut, Menu, X, User, FileText, Upload, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    <header className="fixed top-0 w-full z-50 glass border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/30">
              B
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-200">
              Blood Report AI
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user && navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {link.name}
              </Link>
            ))}

            <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-gray-700">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {mounted ? (
                  theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
                ) : (
                  <div className="w-5 h-5" />
                )}
              </button>

              {/* Sign Out */}
              {user && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
              {!user && (
                <Link href="/auth" className="px-5 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors"
            >
              {mounted ? (
                theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
              ) : (
                <div className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {user && navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                >
                  <link.icon className="w-5 h-5 text-primary-500" />
                  {link.name}
                </Link>
              ))}
              {!user && (
                <Link
                  href="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                >
                  <User className="w-5 h-5 text-primary-500" />
                  Sign In
                </Link>
              )}

              {user && (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}