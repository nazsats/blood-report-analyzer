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
  Utensils,
  Moon,
  Sun,
  Dumbbell,
  Pill,
  Activity,
  Target,
  Share2,
  Ban
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
import ReactMarkdown from "react-markdown";

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
  status: "complete";
  healthGoals?: string[];
  nutrition?: Nutrition;
  lifestyle?: Lifestyle;
  supplements?: Supplement[];
  dietTips?: string[]; // Fallback
  dailySchedule?: string[]; // Fallback
}

const COLORS = ["#10B981", "#F59E0B", "#EF4444"];

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"summary" | "tests" | "chart" | "nutrition" | "lifestyle">("summary");
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Oops!</h2>
          <p className="text-gray-600 dark:text-gray-400">{error || "This shared report is not available."}</p>
        </div>
      </div>
    );
  }

  const { summary, recommendation, overallScore, tests = [], fileName } = report;

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-12 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 mb-10 border border-gray-100 dark:border-gray-700 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">Shared Report</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {fileName} Analysis
              </h1>
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                AI Health Insights
              </p>
            </div>

            <div className="flex gap-4">
              {summary && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSpeak}
                  className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl hover:shadow-md transition-all text-sm font-medium"
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isSpeaking ? "Stop" : "Listen"}
                </motion.button>
              )}
            </div>
          </div>

          {overallScore && (
            <div className="mt-8 flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Health Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{overallScore.toFixed(0)}</span>
                  <span className="text-gray-400 text-lg">/10</span>
                </div>
              </div>
              <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Status</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">Analysis Complete</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-wrap gap-3 mb-10"
        >
          {[
            { id: "summary" as const, label: "Summary", icon: Info },
            { id: "tests" as const, label: "Test Results", icon: Activity, count: tests.length },
            { id: "chart" as const, label: "Visuals", icon: PieChart },
            { id: "nutrition" as const, label: "Nutrition", icon: Utensils, count: report.nutrition ? 1 : 0 },
            { id: "lifestyle" as const, label: "Lifestyle", icon: Sun, count: report.lifestyle ? 1 : 0 },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${activeSection === id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${activeSection === id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Content Sections */}
        <AnimatePresence mode="wait">
          {/* Summary */}
          {activeSection === "summary" && (
            <motion.section
              key="summary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-6"
            >
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900 dark:text-white">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                    <Info className="h-6 w-6" />
                  </div>
                  Executive Summary
                </h2>
                <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>

              {recommendation && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/10 rounded-3xl p-8 border border-orange-100 dark:border-orange-900/30">
                  <h3 className="text-xl font-bold text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Key Recommendation
                  </h3>
                  <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">
                    {recommendation}
                  </p>
                </div>
              )}
            </motion.section>
          )}

          {/* Tests */}
          {activeSection === "tests" && (
            <motion.section
              key="tests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tests.map((test, i) => (
                  <motion.div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider ${test.flag === 'normal' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        test.flag === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                      {test.flag}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pr-12">{test.test}</h3>

                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{test.value}</span>
                      <span className="text-sm text-gray-500">{test.unit}</span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4 text-xs text-gray-500 dark:text-gray-400">
                      Range: <span className="font-medium text-gray-700 dark:text-gray-300">{test.range}</span>
                    </div>

                    {test.explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                        {test.explanation}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Charts */}
          {activeSection === "chart" && (
            <motion.section
              key="chart"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm h-[400px] flex flex-col">
                <h3 className="text-lg font-bold mb-6 text-center dark:text-white">Overall Status</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm h-[400px] flex flex-col">
                <h3 className="text-lg font-bold mb-6 text-center dark:text-white">Attention Needed</h3>
                {abnormalTests.length > 0 ? (
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={abnormalTests.slice(0, 5).map(t => ({ name: t.test.substring(0, 10), value: t.value }))}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-green-500">
                    <CheckCircle className="h-16 w-16 mb-4" />
                    <p className="font-medium">No abnormal results!</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* Nutrition */}
          {activeSection === "nutrition" && (
            <motion.section
              key="nutrition"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {report.nutrition ? (
                <>
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border-l-4 border-green-500">
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Nutrition Focus</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">{report.nutrition.focus}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-3xl">
                      <h4 className="font-bold text-orange-800 dark:text-orange-200 mb-4 flex items-center gap-2"><Sun className="h-4 w-4" /> Breakfast</h4>
                      <ul className="space-y-2">
                        {report.nutrition.breakfast.map((item, i) => (
                          <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl">
                      <h4 className="font-bold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2"><Utensils className="h-4 w-4" /> Lunch</h4>
                      <ul className="space-y-2">
                        {report.nutrition.lunch.map((item, i) => (
                          <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl">
                      <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2"><Moon className="h-4 w-4" /> Dinner</h4>
                      <ul className="space-y-2">
                        {report.nutrition.dinner.map((item, i) => (
                          <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl">
                      <h4 className="font-bold text-red-800 dark:text-red-200 mb-4 flex items-center gap-2"><Ban className="h-4 w-4" /> Avoid/Limit</h4>
                      <ul className="space-y-2">
                        {report.nutrition.avoid.map((item, i) => (
                          <li key={i} className="text-gray-700 dark:text-gray-300 text-sm">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nutrition details not available for this report.</p>
                </div>
              )}
            </motion.section>
          )}

          {/* Lifestyle */}
          {activeSection === "lifestyle" && (
            <motion.section
              key="lifestyle"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {report.lifestyle ? (
                <>
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600">
                      <Dumbbell className="h-5 w-5" /> Exercise
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {report.lifestyle.exercise}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-600">
                      <Moon className="h-5 w-5" /> Sleep Hygiene
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {report.lifestyle.sleep}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm md:col-span-2">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-600">
                      <Activity className="h-5 w-5" /> Stress Management
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {report.lifestyle.stress}
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-2 text-center py-20 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Lifestyle details not available for this report.</p>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}