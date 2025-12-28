// components/Header.tsx
"use client";

import { useTheme } from "next-themes"; // Add this
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { Moon, Sun, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export default function Header() {
  const { theme, setTheme } = useTheme(); // Add this
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <header className="bg-white shadow-sm border-b dark:bg-gray-800 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-300">Blood Report AI</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")} // Toggle logic
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {user && (
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Sign Out ({user.email})
            </button>
          )}
        </div>
      </div>
    </header>
  );
}