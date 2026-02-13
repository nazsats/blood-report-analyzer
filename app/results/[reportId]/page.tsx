// app/results/[reportId]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import {
  Loader2,
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  Apple,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  Share2,
  Check,
  Target,
  Activity,
  Utensils,
  Moon,
  Sun,
  Dumbbell,
  Pill,
  Ban
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import toast from "react-hot-toast";
import ChatInterface from "@/components/ChatInterface";

interface Test {
  test: string;
  value: number;
  unit: string;
  range: string;
  flag: "normal" | "high" | "low";
  explanation?: string;
  advice?: string;
}

interface Nutrition {
  focus: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  snacks: string[];
  avoid: string[];
}

interface Lifestyle {
  exercise: string;
  sleep: string;
  stress: string;
}

interface Supplement {
  name: string;
  reason: string;
}

interface Report {
  fileName: string;
  summary: string;
  recommendation: string;
  overallScore?: number;
  tests: Test[];
  status: "processing" | "complete" | "error";
  healthGoals?: string[];
  nutrition?: Nutrition;
  lifestyle?: Lifestyle;
  supplements?: Supplement[];
  error?: string;
  shareId?: string;
}

const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

export default function ResultsPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"summary" | "tests" | "chart" | "nutrition" | "lifestyle">("summary");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!reportId) return;

    const unsub = onSnapshot(
      doc(db, "reports", reportId as string),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Report;
          setReport(data);

          // Generate or use existing shareId
          if (data.status === "complete" && !data.shareId) {
            const newShareId = Math.random().toString(36).substring(2, 10);
            updateDoc(doc(db, "reports", reportId as string), { shareId: newShareId });
            setShareUrl(`${window.location.origin}/share/${newShareId}`);
          } else if (data.shareId) {
            setShareUrl(`${window.location.origin}/share/${data.shareId}`);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [reportId]);

  // Pie Chart Data
  const pieData = report?.tests?.reduce(
    (acc, t) => {
      const key = t.flag === "normal" ? "Normal" : "Needs Attention";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { Normal: 0, "Needs Attention": 0 }
  ) || { Normal: 0, "Needs Attention": 0 };

  const chartData = Object.entries(pieData)
    .map(([name, value]) => ({
      name,
      value: Number(value),
      fill: name === "Normal" ? "#10B981" : "#F59E0B",
    }))
    .filter((item) => item.value > 0);

  const abnormalTests = report?.tests?.filter((t) => t.flag !== "normal") || [];

  // Voice Feedback
  const handleSpeak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!report?.summary) return;

    const utterance = new SpeechSynthesisUtterance(report.summary);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Copy Share Link
  const handleShare = () => {
    if (!shareUrl) return;

    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Skeleton height={80} className="mb-8 rounded-2xl" />
        <Skeleton height={400} className="rounded-2xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20 text-gray-500">
        Report not found.{" "}
        <button onClick={() => router.push("/upload")} className="text-blue-600 underline">
          Upload again?
        </button>
      </div>
    );
  }

  const { status, summary, recommendation, overallScore, tests = [], fileName } = report;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-10 backdrop-blur-sm border border-gray-100 dark:border-gray-700"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Your Blood Report – Explained Simply! 😊
            </h1>
            <p className="text-gray-600 dark:text-gray-300">File: {fileName}</p>
          </div>

          <div className="flex gap-4">
            {status === "complete" && shareUrl && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                <Share2 className="h-5 w-5" />
                Share Report
              </motion.button>
            )}

            {status === "complete" && summary && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSpeak}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all"
              >
                {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                {isSpeaking ? "Stop Reading" : "Listen to Summary"}
              </motion.button>
            )}
          </div>
        </div>

        {status === "complete" && overallScore && (
          <div className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-full border border-blue-200 dark:border-blue-800">
            <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              Health Score: {overallScore.toFixed(1)} / 10
            </span>
          </div>
        )}
      </motion.div>

      {/* Status Alerts */}
      <AnimatePresence>
        {status === "processing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-4 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border border-yellow-200 dark:border-yellow-800 rounded-2xl mb-8"
          >
            <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">AI is working its magic ✨</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">10-30 seconds – grab some water! 💧</p>
            </div>
          </motion.div>
        )}

        {status === "error" && report.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-4 p-6 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border border-red-200 dark:border-red-800 rounded-2xl mb-8"
          >
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">Oops! Something went wrong</p>
              <p className="text-sm text-red-700 dark:text-red-300">{report.error}</p>
              <button
                onClick={() => router.push("/upload")}
                className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      {status === "complete" && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-wrap gap-3 mb-10 bg-white/80 dark:bg-gray-800/80 p-6 rounded-3xl shadow-xl backdrop-blur-xl border border-white/50 dark:border-gray-700/50"
        >
          {[
            { id: "summary" as const, label: "📋 Summary", icon: CheckCircle, count: 1 },
            { id: "tests" as const, label: "🔬 Tests", icon: Info, count: tests.length },
            { id: "chart" as const, label: "📊 Visuals", icon: PieChart, count: abnormalTests.length },
            { id: "nutrition" as const, label: "🥗 Nutrition", icon: Utensils, count: report.nutrition?.breakfast?.length || 0 },
            { id: "lifestyle" as const, label: "🧘 Lifestyle", icon: Sun, count: 3 },
          ].map(({ id, label, icon: Icon, count }) => (
            <motion.button
              key={id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-medium shadow-md ${activeSection === id
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl"
                : "bg-gray-100/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600/70 hover:shadow-lg border border-gray-200/50 dark:border-gray-600/50"
                }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {count > 0 && (
                <span className="ml-2 px-2 py-1 bg-white/20 dark:bg-white/10 text-xs rounded-full backdrop-blur-sm">
                  {count}
                </span>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Content Sections */}
      <AnimatePresence mode="wait">
        {/* Summary */}
        {status === "complete" && activeSection === "summary" && (
          <motion.section
            key="summary"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* Summary Card */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50">
                <h2 className="text-2xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-6 flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                    <Activity className="h-6 w-6" />
                  </div>
                  Analysis Summary
                </h2>
                <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>

              {/* Health Goals Card */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50">
                <h2 className="text-2xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-6 flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600">
                    <Target className="h-6 w-6" />
                  </div>
                  Top Health Goals
                </h2>
                <div className="space-y-4">
                  {(report.healthGoals || []).length > 0 ? (
                    report.healthGoals!.map((goal, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tl from-green-500 to-emerald-500 text-white flex items-center justify-center shrink-0 font-bold shadow-md">
                          {i + 1}
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 font-medium pt-1">{goal}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No specific goals generated yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {recommendation && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-8 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 rounded-2xl border-4 border-orange-200 dark:border-orange-800 shadow-xl"
              >
                <h3 className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-4 flex items-center gap-3">
                  🎯 Quick Action Plan
                </h3>
                <p className="text-xl text-gray-800 dark:text-gray-200">{recommendation}</p>
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-6 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950 border-2 border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-200 text-lg flex items-start gap-3"
            >
              <AlertTriangle className="h-8 w-8 flex-shrink-0 mt-0.5" />
              <span>I'm your AI health buddy, but always chat with your real doctor for personalized medical advice! 🩺</span>
            </motion.p>
          </motion.section>
        )}

        {/* Tests Section */}
        {status === "complete" && activeSection === "tests" && (
          <motion.section
            key="tests"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50"
          >
            <h2 className="text-3xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-10 flex items-center gap-4">
              🔬 Your Test Results – Made DEAD SIMPLE
            </h2>

            {tests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <AlertTriangle className="h-20 w-20 text-yellow-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">No tests detected yet 😅</h3>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                  Try uploading a clearer photo next time – good lighting, no glare, flat surface works best!
                </p>
                <button
                  onClick={() => router.push("/upload")}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl text-xl font-bold hover:shadow-xl transition-all"
                >
                  📸 Upload Clearer Photo
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tests.map((test, idx) => (
                  <motion.div
                    key={`${test.test}-${idx}`}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 shadow-xl hover:shadow-2xl border-2 border-white/50 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-500 hover:-translate-y-2"
                  >
                    {/* Status Badge */}
                    <div
                      className={`absolute -top-3 left-6 px-4 py-2 rounded-2xl text-sm font-bold shadow-lg transform rotate-3 ${test.flag === "normal"
                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                        : test.flag === "high"
                          ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                          : "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        {test.flag === "normal" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {test.flag === "normal" ? "✅ ALL GOOD!" : test.flag === "high" ? "🔥 A BIT HIGH" : "⚠️ A BIT LOW"}
                      </span>
                    </div>

                    {/* Test Name */}
                    <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-6 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {test.test}
                    </h3>

                    {/* Value */}
                    <div className="mb-8">
                      <div className="flex items-baseline gap-4 mb-2">
                        <span
                          className={`text-5xl lg:text-6xl font-black ${test.flag === "normal"
                            ? "text-green-600 dark:text-green-400"
                            : test.flag === "high"
                              ? "text-red-600 dark:text-red-400"
                              : "text-orange-600 dark:text-orange-400"
                            }`}
                        >
                          {test.value}
                        </span>
                        <span className="text-2xl text-gray-500 dark:text-gray-400 font-semibold">{test.unit}</span>
                      </div>
                      <p className="text-lg text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-4 py-2 rounded-xl">
                        Normal range: <span className="font-bold">{test.range}</span>
                      </p>
                    </div>

                    {/* Explanation */}
                    {test.explanation && (
                      <div className="mb-6 p-6 bg-blue-50/80 dark:bg-blue-950/50 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
                        <p className="text-lg text-blue-800 dark:text-blue-200 font-semibold mb-2 flex items-center gap-2">
                          🧠 Easy Peasy Explanation
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{test.explanation}</p>
                      </div>
                    )}

                    {/* Advice */}
                    {test.advice && test.flag !== "normal" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-lg"
                      >
                        <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                          💡 Fun Fix Idea
                        </p>
                        <p className="text-lg text-emerald-700 dark:text-emerald-300 leading-relaxed">{test.advice}</p>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Charts */}
        {status === "complete" && activeSection === "chart" && (
          <motion.section
            key="chart"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50"
          >
            <h2 className="text-3xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-10 flex items-center gap-4">
              📊 Visual Peek – See Your Health at a Glance
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Pie Chart */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-[400px] w-full bg-gradient-to-br from-gray-50/50 to-blue-50/30 dark:from-gray-900/50 dark:to-blue-900/20 rounded-2xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50"
              >
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <PieChart className="h-24 w-24 text-gray-300 mb-4" />
                    <p className="text-2xl font-bold">No data yet</p>
                    <p>Upload a report to see your results!</p>
                  </div>
                )}
                <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                  🟢 Green = Perfect • 🟠 Orange = Small tweaks needed
                </p>
              </motion.div>

              {/* Bar Chart for Abnormal Tests */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-[400px] bg-gradient-to-br from-gray-50/50 to-purple-50/30 dark:from-gray-900/50 dark:to-purple-900/20 rounded-2xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50"
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
                  ⚠️ Tests Needing Attention ({abnormalTests.length})
                </h3>
                {abnormalTests.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={abnormalTests.slice(0, 8).map((t) => ({
                        name: t.test.length > 15 ? t.test.slice(0, 12) + "..." : t.test,
                        value: t.value,
                      }))}
                    >
                      <XAxis dataKey="name" angle={-45} height={80} textAnchor="end" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-24 w-24 mb-4" />
                    <p className="text-2xl font-bold">🎉 Perfect!</p>
                    <p className="text-lg">All your tests are in normal range!</p>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* Nutrition Section */}
        {status === "complete" && activeSection === "nutrition" && report.nutrition && (
          <motion.section
            key="nutrition"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-8"
          >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50 dark:border-gray-700/50">
              <h2 className="text-3xl font-black text-green-600 dark:text-green-400 mb-2 flex items-center gap-3">
                <Utensils className="h-8 w-8" /> Nutrition Protocol
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Focus: <span className="font-bold text-gray-800 dark:text-white">{report.nutrition.focus}</span>
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Meal Cards */}
              <div className="space-y-6">
                {/* Breakfast */}
                <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-800/30">
                  <h3 className="font-bold text-lg text-orange-700 dark:text-orange-300 mb-4 flex items-center gap-2"><Sun className="h-5 w-5" /> Breakfast</h3>
                  <ul className="space-y-2">
                    {report.nutrition.breakfast.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Lunch */}
                <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-800/30">
                  <h3 className="font-bold text-lg text-green-700 dark:text-green-300 mb-4 flex items-center gap-2"><Utensils className="h-5 w-5" /> Lunch</h3>
                  <ul className="space-y-2">
                    {report.nutrition.lunch.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                {/* Dinner */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                  <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2"><Moon className="h-5 w-5" /> Dinner</h3>
                  <ul className="space-y-2">
                    {report.nutrition.dinner.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Snacks & Avoid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                    <h3 className="font-bold text-purple-700 dark:text-purple-300 mb-3 text-sm uppercase">Snacks</h3>
                    <ul className="text-sm space-y-1">
                      {report.nutrition.snacks.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-800/30">
                    <h3 className="font-bold text-red-700 dark:text-red-300 mb-3 flex items-center gap-1 text-sm uppercase"><Ban className="h-4 w-4" /> Limt / Avoid</h3>
                    <ul className="text-sm space-y-1">
                      {report.nutrition.avoid.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Lifestyle & Supplements Section */}
        {status === "complete" && activeSection === "lifestyle" && (
          <motion.section
            key="lifestyle"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Exercise & Habits */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50 dark:border-gray-700/50 space-y-8">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                <Activity className="h-7 w-7 text-blue-500" /> Lifestyle Habits
              </h2>
              {report.lifestyle && (
                <>
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2"><Dumbbell className="h-5 w-5" /> Movement</h4>
                    <p className="text-gray-700 dark:text-gray-300">{report.lifestyle.exercise}</p>
                  </div>
                  <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2"><Moon className="h-5 w-5" /> Sleep Hygiene</h4>
                    <p className="text-gray-700 dark:text-gray-300">{report.lifestyle.sleep}</p>
                  </div>
                  <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                    <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2"><Sun className="h-5 w-5" /> Stress Management</h4>
                    <p className="text-gray-700 dark:text-gray-300">{report.lifestyle.stress}</p>
                  </div>
                </>
              )}
            </div>

            {/* Supplements */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/50 dark:border-gray-700/50">
              <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                <Pill className="h-7 w-7 text-green-500" /> Smart Supplements
              </h2>
              <div className="space-y-4">
                {report.supplements?.map((supp, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-gray-200">{supp.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{supp.reason}</p>
                    </div>
                  </div>
                ))}
                {(!report.supplements || report.supplements.length === 0) && (
                  <p className="text-gray-500 italic">No specific supplements recommended based on this report.</p>
                )}
              </div>
              <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800/30 text-sm text-yellow-800 dark:text-yellow-200 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>Always consult your doctor before starting any new supplements, especially if you are on medication.</p>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      {status === "complete" && <ChatInterface reportId={reportId as string} reportSummary={summary} />}
    </div>
  );
}