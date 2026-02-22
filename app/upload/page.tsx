// app/upload/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Upload, AlertCircle, Sparkles, X, FileText, CheckCircle2, CloudUpload, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "@/components/AuthModal";

const LOADING_MESSAGES = [
  { text: "Scanning document structure...", icon: FileText },
  { text: "Identifying blood markers...", icon: Sparkles },
  { text: "Comparing with medical standards...", icon: CheckCircle2 },
  { text: "Generating plain English insights...", icon: Sparkles },
  { text: "Finalizing your wellness protocol...", icon: CheckCircle2 },
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [uploading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const processPDF = async (pdfFile: File) => {
    setIsExtracting(true);
    setPreview(null);
    setPdfPages([]);
    setExtractedText("");
    setError("");
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      // @ts-ignore
      const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const pageImages: string[] = [];
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create canvas context");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        pageImages.push(canvas.toDataURL("image/jpeg", 0.85));
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      setPdfPages(pageImages);
      if (pageImages.length > 0) setPreview(pageImages[0]);
      setExtractedText(fullText);
    } catch (err: any) {
      setError(`Failed to process PDF: ${err.message || "Unknown error"}. Please try an image instead.`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/") && selectedFile.type !== "application/pdf") {
      setError("Please upload an image or PDF file.");
      return;
    }
    setError("");
    setFile(selectedFile);
    setExtractedText("");
    setPdfPages([]);
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      processPDF(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user || isExtracting) return;
    setUploading(true);
    setError("");
    setSuccess(false);
    setLoadingStep(0);
    const formData = new FormData();
    if (file.type === "application/pdf" && pdfPages.length > 0) {
      try {
        for (let i = 0; i < pdfPages.length; i++) {
          const response = await fetch(pdfPages[i]);
          const blob = await response.blob();
          formData.append("file", new File([blob], `${file.name.replace(/\.pdf$/i, "")}_page_${i + 1}.jpg`, { type: "image/jpeg" }));
        }
      } catch {
        formData.append("file", file);
      }
    } else {
      formData.append("file", file);
    }
    if (extractedText) formData.append("extractedText", extractedText);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setSuccess(true);
      setTimeout(() => router.push(`/results/${data.reportId}`), 1000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      if (!success) setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setPdfPages([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0414]">
        <div className="w-12 h-12 rounded-full border-2 border-primary-700 border-t-primary-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0414] px-4">
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-600/10 rounded-full blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center max-w-sm w-full glass-card border border-white/10 p-10 rounded-3xl z-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600/30 to-secondary-500/30 border border-primary-500/30 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Sign In Required</h2>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Securely sign in to analyze your health reports and access your personalized wellness data.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-secondary-500 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all"
          >
            Sign In Now
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0414] relative overflow-hidden">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary-600/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 dot-grid opacity-25" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-32">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-300 text-sm font-medium mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Analysis Ready
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight"
          >
            Upload Your
            <span className="gradient-text"> Blood Report</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400"
          >
            Supports PDF, JPG, and PNG · Processed in under 30 seconds
          </motion.p>
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative rounded-3xl border border-white/10 bg-white/3 backdrop-blur-xl overflow-hidden"
        >
          {/* Top gradient line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

          <div className="p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload-zone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${isDragOver
                        ? "border-primary-400 bg-primary-500/10 scale-[1.01]"
                        : "border-white/15 hover:border-primary-500/50 hover:bg-white/4"
                      }`}
                  >
                    {/* Animated glow when dragging */}
                    {isDragOver && (
                      <div className="absolute inset-0 rounded-2xl bg-primary-500/5 animate-pulse" />
                    )}

                    <motion.div
                      animate={{ y: isDragOver ? -8 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600/25 to-secondary-500/25 border border-primary-500/25 flex items-center justify-center mx-auto mb-6">
                        <CloudUpload className="w-10 h-10 text-primary-400" />
                      </div>
                    </motion.div>

                    <h3 className="text-xl font-bold text-white mb-2">
                      {isDragOver ? "Drop your file here!" : "Drag & Drop your file"}
                    </h3>
                    <p className="text-gray-500 mb-8">or click to browse from your device</p>

                    <div className="flex justify-center gap-3">
                      {[
                        { icon: FileText, label: "PDF" },
                        { icon: Image, label: "JPG / PNG" },
                      ].map((t) => (
                        <div key={t.label} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 font-medium">
                          <t.icon className="w-4 h-4 text-primary-400" />
                          {t.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="preview-zone"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  {/* Preview */}
                  <div className="relative rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
                    <button
                      onClick={clearFile}
                      className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors z-10 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {preview ? (
                      <div className="relative h-56 w-full overflow-hidden rounded-xl">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                        {pdfPages.length > 1 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-gray-900/80 text-xs text-gray-200 font-medium border border-white/10">
                            {pdfPages.length} pages
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-56 flex flex-col items-center justify-center text-gray-500">
                        <div className="relative mb-3">
                          <FileText className="w-16 h-16 text-primary-500/50" />
                          <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-primary-600 text-white text-[10px] font-bold">PDF</div>
                        </div>
                        <p className="font-medium text-white text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}

                    {/* File info */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <FileText className="w-4 h-4 text-primary-400" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                      </div>
                      {isExtracting ? (
                        <div className="flex items-center gap-2 text-xs text-secondary-400 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Reading PDF...
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-accent-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready to analyze
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpload}
                      disabled={uploading || isExtracting}
                      className="w-full py-4 bg-gradient-to-r from-primary-600 to-secondary-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary-600/30 hover:shadow-primary-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : isExtracting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Reading PDF...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Analyze My Report
                        </>
                      )}
                    </motion.button>
                    <button
                      onClick={clearFile}
                      disabled={uploading}
                      className="w-full py-3 text-gray-500 hover:text-gray-300 transition-colors text-sm font-medium"
                    >
                      Choose a different file
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-gray-600"
        >
          {["🔒 End-to-end encrypted", "🏥 HIPAA compliant", "⚡ Results in 30s", "🗑️ Auto-deleted after 30 days"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </motion.div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0414]/95 backdrop-blur-xl z-50 flex items-center justify-center px-4"
          >
            <div className="w-full max-w-md text-center">
              {/* Animated ring */}
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary-500/10 animate-ping" style={{ animationDelay: "0.3s" }} />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary-600/30 to-secondary-500/30 border border-primary-500/40 flex items-center justify-center">
                  <Sparkles className="w-9 h-9 text-primary-300 animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-white mb-2">Analyzing Your Health</h2>
              <p className="text-gray-500 text-sm mb-10">Our AI is working through your blood report...</p>

              <div className="space-y-3 text-left">
                {LOADING_MESSAGES.map((msg, idx) => {
                  const isActive = idx === loadingStep;
                  const isCompleted = idx < loadingStep;
                  const Icon = msg.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: idx <= loadingStep ? 1 : 0.3, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${isActive
                          ? "bg-primary-500/10 border-primary-500/30"
                          : isCompleted
                            ? "bg-accent-500/8 border-accent-500/20"
                            : "border-transparent"
                        }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-primary-600 text-white" :
                          isCompleted ? "bg-accent-500/20 text-accent-400" :
                            "bg-white/5 text-gray-600"
                        }`}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? "text-primary-300" :
                          isCompleted ? "text-accent-400" :
                            "text-gray-600"
                        }`}>
                        {msg.text}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
