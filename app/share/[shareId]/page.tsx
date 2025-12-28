// app/share/[shareId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Apple,
  Clock,
  Volume2,
  VolumeX,
} from "lucide-react";
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

interface Test {
  test: string;
  value: number;
  unit: string;
  range: string;
  flag: "normal" | "high" | "low";
  explanation?: string;
  advice?: string;
}

interface Report {
  fileName: string;
  summary: string;
  recommendation: string;
  overallScore?: number;
  tests: Test[];
  dietTips: string[];
  dailySchedule: string[];
  status: "complete";
}

const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"summary" | "tests" | "chart" | "diet" | "schedule">("summary");
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      if (!shareId) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        const reportsRef = collection(db, "reports");
        const q = query(reportsRef, where("shareId", "==", shareId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Report not found or link expired");
          setLoading(false);
          return;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data() as Report;
        setReport(data);
      } catch (err) {
        console.error("Share fetch error:", err);
        setError("Failed to load shared report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [shareId]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Oops!</h2>
          <p className="text-gray-600 dark:text-gray-400">{error || "This shared report is not available."}</p>
        </div>
      </div>
    );
  }

  const { summary, recommendation, overallScore, tests = [], dietTips = [], dailySchedule = [], fileName } = report;

  const pieData = tests.reduce(
    (acc, t) => {
      const key = t.flag === "normal" ? "Normal" : "Needs Attention";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { Normal: 0, "Needs Attention": 0 }
  );

  const chartData = Object.entries(pieData)
    .map(([name, value]) => ({
      name,
      value: Number(value),
      fill: name === "Normal" ? "#10B981" : "#F59E0B",
    }))
    .filter((item) => item.value > 0);

  const abnormalTests = tests.filter((t) => t.flag !== "normal");

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
              Shared Blood Report – Explained Simply! 😊
            </h1>
            <p className="text-gray-600 dark:text-gray-300">File: {fileName}</p>
          </div>

          {summary && (
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

        {overallScore && (
          <div className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-full border border-blue-200 dark:border-blue-800">
            <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              Health Score: {overallScore.toFixed(1)} / 10
            </span>
          </div>
        )}
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-wrap gap-3 mb-10 bg-white/80 dark:bg-gray-800/80 p-6 rounded-3xl shadow-xl backdrop-blur-xl border border-white/50 dark:border-gray-700/50"
      >
        {[
          { id: "summary" as const, label: "📋 Summary", icon: CheckCircle, count: 1 },
          { id: "tests" as const, label: "🔬 Tests", icon: Info, count: tests.length },
          { id: "chart" as const, label: "📊 Visuals", icon: PieChart, count: abnormalTests.length },
          { id: "diet" as const, label: "🍎 Diet", icon: Apple, count: dietTips.length },
          { id: "schedule" as const, label: "⏰ Plan", icon: Clock, count: dailySchedule.length },
        ].map(({ id, label, icon: Icon, count }) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-medium shadow-md ${
              activeSection === id
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

      {/* Content Sections */}
      <AnimatePresence mode="wait">
        {/* Summary */}
        {activeSection === "summary" && (
          <motion.section
            key="summary"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50"
          >
            <h2 className="text-3xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-8 flex items-center gap-4">
              📋 Summary
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="whitespace-pre-wrap text-xl mb-8">{summary}</p>
              {recommendation && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-8 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 rounded-2xl border-4 border-orange-200 dark:border-orange-800 shadow-xl"
                >
                  <h3 className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-4 flex items-center gap-3">
                    🎯 Recommendation
                  </h3>
                  <p className="text-xl">{recommendation}</p>
                </motion.div>
              )}
            </div>
          </motion.section>
        )}

        {/* Tests */}
        {activeSection === "tests" && (
          <motion.section
            key="tests"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50"
          >
            <h2 className="text-3xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-10 flex items-center gap-4">
              🔬 Test Results
            </h2>

            {tests.length === 0 ? (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                No tests detected in this shared report.
              </div>
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
                    <div
                      className={`absolute -top-3 left-6 px-4 py-2 rounded-2xl text-sm font-bold shadow-lg transform rotate-3 ${
                        test.flag === "normal"
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

                    <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-6 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {test.test}
                    </h3>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-4 mb-2">
                        <span
                          className={`text-5xl lg:text-6xl font-black ${
                            test.flag === "normal"
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
                        Range: <span className="font-bold">{test.range}</span>
                      </p>
                    </div>

                    {test.explanation && (
                      <div className="mb-6 p-6 bg-blue-50/80 dark:bg-blue-950/50 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
                        <p className="text-lg text-blue-800 dark:text-blue-200 font-semibold mb-2 flex items-center gap-2">
                          🧠 Explanation
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{test.explanation}</p>
                      </div>
                    )}

                    {test.advice && test.flag !== "normal" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 shadow-lg"
                      >
                        <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                          💡 Advice
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
        {activeSection === "chart" && (
          <motion.section
            key="chart"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50"
          >
            <h2 className="text-3xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-10 flex items-center gap-4">
              📊 Visual Overview
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
                    <p className="text-2xl font-bold">No chart data</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-[400px] bg-gradient-to-br from-gray-50/50 to-purple-50/30 dark:from-gray-900/50 dark:to-purple-900/20 rounded-2xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50"
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
                  ⚠️ Abnormal Tests ({abnormalTests.length})
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
                    <p className="text-2xl font-bold">All normal!</p>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.section>
        )}

        {/* Diet Tips */}
        {activeSection === "diet" && (
          <motion.section
            key="diet"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50"
          >
            <h2 className="text-3xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-10 flex items-center gap-4">
              <Apple className="h-12 w-12 text-green-500" /> Diet Tips
            </h2>
            {dietTips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dietTips.slice(0, 8).map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-2xl border-2 border-green-200 dark:border-green-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 shadow-lg"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">{i + 1}</span>
                      </div>
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {tip}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Apple className="h-20 w-20 text-green-400 mx-auto mb-6" />
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">No specific diet tips</p>
              </div>
            )}
          </motion.section>
        )}

        {/* Daily Schedule */}
        {activeSection === "schedule" && (
          <motion.section
            key="schedule"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/50 dark:border-gray-700/50"
          >
            <h2 className="text-3xl font-black bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text mb-10 flex items-center gap-4">
              <Clock className="h-12 w-12 text-blue-500" /> Daily Plan
            </h2>
            {dailySchedule.length > 0 ? (
              <div className="space-y-4 max-w-4xl mx-auto">
                {dailySchedule.slice(0, 10).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex items-start gap-6 p-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-3xl border-2 border-blue-200 dark:border-blue-800 hover:shadow-2xl hover:-translate-x-2 transition-all duration-500 shadow-xl"
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl mt-1 group-hover:scale-110 transition-transform">
                      <span className="text-2xl font-black text-white">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {step.split("–")[0]?.trim()}
                      </p>
                      <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                        {step.split("–")[1]?.trim()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Clock className="h-20 w-20 text-blue-400 mx-auto mb-6" />
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">No daily plan available</p>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}