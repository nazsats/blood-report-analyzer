// app/upload/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Upload, AlertCircle, Sparkles, X, FileText, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_MESSAGES = [
  { text: "Scanning document structure...", icon: FileText },
  { text: "Identifying blood markers...", icon: Sparkles },
  { text: "Comparing with medical standards...", icon: CheckCircle2 },
  { text: "Generating plain English insights...", icon: Sparkles },
  { text: "Finalizing your health report...", icon: FileText },
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages
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
      // @ts-ignore - pdfjs-dist/build/pdf.mjs doesn't have a declaration file in some versions
      const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const pageImages: string[] = [];
      let fullText = "";

      // Process all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) throw new Error("Could not create canvas context");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const base64Image = canvas.toDataURL("image/jpeg", 0.85);
        pageImages.push(base64Image);

        // Extract text context for each page
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }

      setPdfPages(pageImages);
      if (pageImages.length > 0) {
        setPreview(pageImages[0]); // Show first page as main preview
      }
      setExtractedText(fullText);

    } catch (err: any) {
      console.error("PDF Processing Error:", err);
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
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
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

    // Support multi-page PDF by sending all rendered images
    if (file.type === "application/pdf" && pdfPages.length > 0) {
      try {
        for (let i = 0; i < pdfPages.length; i++) {
          const response = await fetch(pdfPages[i]);
          const blob = await response.blob();
          const imageFile = new File([blob], `${file.name.replace(/\.pdf$/i, "")}_page_${i + 1}.jpg`, { type: "image/jpeg" });
          formData.append("file", imageFile);
        }
      } catch (err) {
        console.error("Error converting PDF pages to files:", err);
        formData.append("file", file); // Fallback to original PDF
      }
    } else {
      formData.append("file", file);
    }

    if (extractedText) {
      formData.append("extractedText", extractedText);
    }

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
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      if (!success) setUploading(false); // Keep loading if success to show redirect
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            Sign In Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Please sign in to securely analyze your health reports.
          </p>
          <a
            href="/auth"
            className="block w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Sign In Now
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Upload Your Report
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            We support PDF, JPG, and PNG files.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-12 relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Upload className="w-64 h-64 text-blue-600 dark:text-blue-400 transform rotate-12" />
          </div>

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="upload-zone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10"
              >
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-3 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 sm:p-12 text-center hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="h-20 w-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Drag & Drop your file here
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    or click to browse
                  </p>
                  <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors pointer-events-none">
                    Select File
                  </button>
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10"
              >
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700 relative">
                  <button
                    onClick={clearFile}
                    className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 hover:shadow-lg transition-all z-20"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {preview ? (
                    <div className="relative h-64 w-full">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                      <div className="relative">
                        <FileText className="h-16 w-16 mb-4 text-blue-500" />
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                          PDF
                        </div>
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                      <div className="mt-6 flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">AI Analysis Ready</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleUpload}
                    disabled={uploading || isExtracting}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : isExtracting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Reading PDF...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Analyze Report
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearFile}
                    disabled={uploading}
                    className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md z-50 flex items-center justify-center px-4"
            >
              <div className="w-full max-w-lg">
                <div className="text-center mb-10">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse" />
                    <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-400 animate-spin relative z-10" />
                  </div>
                  <h2 className="text-2xl font-bold mt-6 text-gray-900 dark:text-white">
                    Analyzing Your Health
                  </h2>
                </div>

                <div className="space-y-6">
                  {LOADING_MESSAGES.map((msg, idx) => {
                    const isActive = idx === loadingStep;
                    const isCompleted = idx < loadingStep;
                    const Icon = msg.icon;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: idx <= loadingStep ? 1 : 0.4,
                          x: 0
                        }}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isActive
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : "border-transparent"
                          }`}
                      >
                        <div className={`
                          h-10 w-10 rounded-full flex items-center justify-center
                          ${isActive ? "bg-blue-600 text-white" : isCompleted ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-400"}
                        `}>
                          {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <span className={`font-medium ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-500"}`}>
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
    </div>
  );
}
