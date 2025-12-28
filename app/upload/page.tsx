// app/upload/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Upload, AlertCircle, ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_MESSAGES = [
  "Reading your blood like a good book...",
  "AI is putting on its tiny doctor glasses 👓",
  "Counting those red blood cells one by one...",
  "Mixing science with a sprinkle of magic ✨",
  "Almost there – your health story is coming to life!",
  "Your report is getting the VIP treatment...",
  "Brewing some smart insights just for you ☕",
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages every 2.5 seconds
  useEffect(() => {
    if (!uploading) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [uploading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    setError("");
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setSuccess(true);
      setTimeout(() => {
        router.push(`/results/${data.reportId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md mx-auto"
        >
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            Please Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            You need to be signed in to upload and analyze your blood reports.
          </p>
          <a
            href="/auth"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all"
          >
            Sign In Now
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-indigo-950 dark:to-purple-950 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Upload Your Blood Report
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Drag & drop or select your lab report image – we'll explain it in plain English! 📊
          </p>
        </div>

        {/* Upload Area */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 p-12 text-center relative overflow-hidden"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative"
                >
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-96 mx-auto rounded-xl object-contain shadow-lg"
                  />
                  <button
                    onClick={clearFile}
                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
                    {file?.name}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="mx-auto w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Upload className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Drop your report here
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    or click to select a file (JPG, PNG, PDF)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all mt-4"
                  >
                    <Upload className="h-5 w-5" />
                    Choose File
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Upload Button */}
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 text-center"
            >
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`inline-flex items-center gap-3 px-12 py-6 text-xl font-bold rounded-2xl shadow-2xl transition-all ${
                  uploading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-green-500/50"
                } text-white`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze My Report"
                )}
              </button>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 flex items-center gap-3 justify-center"
              >
                <AlertCircle className="h-6 w-6 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-2xl text-green-700 dark:text-green-300 flex items-center gap-3 justify-center"
              >
                <Loader2 className="h-6 w-6 animate-spin" />
                Analysis complete! Redirecting...
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Info */}
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Signed in as: <strong className="text-blue-600 dark:text-blue-400">{user.email}</strong>
          </p>
        </div>

        {/* Full-screen Loading Overlay */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center max-w-md px-8"
              >
                <div className="relative mb-8">
                  <Loader2 className="h-24 w-24 text-blue-400 animate-spin mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full border-4 border-blue-400/30 animate-pulse" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-6">
                  Analyzing Your Report...
                </h2>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMessageIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-xl text-gray-200 min-h-[60px]"
                  >
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </motion.p>
                </AnimatePresence>

                <p className="mt-12 text-sm text-gray-400">
                  This usually takes 10–30 seconds. Thank you for your patience! 💙
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}