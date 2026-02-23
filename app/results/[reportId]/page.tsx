// app/results/[reportId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertCircle, CheckCircle2, Info,
  AlertTriangle, Volume2, VolumeX, Share2,
  Target, Activity, Utensils, Moon, Sun,
  Dumbbell, Pill, Ban, Sparkles,
  Heart, TrendingUp, TrendingDown, Shield,
  Brain, Clock, Zap, ShieldAlert, FlaskConical,
  CalendarClock, Stethoscope, Syringe
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import toast from "react-hot-toast";
import ChatInterface from "@/components/ChatInterface";
import DoctorLetter from "@/components/DoctorLetter";
import FollowUpReminder from "@/components/FollowUpReminder";

interface Test {
  test: string;
  value: number;
  unit: string;
  range: string;
  flag: "normal" | "high" | "low";
  explanation?: string;
  rootCauses?: string;
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
  dose?: string;
  reason: string;
  duration?: string;
}

interface FuturePrediction {
  condition: string;
  risk: "low" | "moderate" | "elevated" | "high";
  timeframe: string;
  reason: string;
  prevention: string;
}

interface MedicationAlert {
  medication: string;
  marker: string;
  interaction: string;
  suggestion: string;
}

interface Report {
  fileName: string;
  summary: string;
  recommendation: string;
  overallScore?: number;
  riskLevel?: "low" | "moderate" | "high" | "critical";
  tests: Test[];
  status: "processing" | "complete" | "error";
  healthGoals?: string[];
  nutrition?: Nutrition;
  lifestyle?: Lifestyle;
  supplements?: Supplement[];
  futurePredictions?: FuturePrediction[];
  medicationAlerts?: MedicationAlert[];
  error?: string;
  shareId?: string;
}

type Section = "summary" | "tests" | "predictions" | "medications" | "chart" | "nutrition" | "lifestyle";

function parseRange(range: string): { min: number; max: number } | null {
  const match = range.match(/([\d.]+)\s*[-–—]\s*([\d.]+)/);
  if (!match) return null;
  return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
}

function gaugePercent(value: number, range: { min: number; max: number }): number {
  const span = range.max - range.min;
  if (span === 0) return 50;
  const pct = ((value - range.min) / span) * 100;
  return Math.min(Math.max(pct, 0), 100);
}

const FLAG_COLORS = {
  normal: { text: "text-accent-400", bg: "bg-accent-500/15", border: "border-accent-500/30", bar: "#4ade80" },
  high: { text: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", bar: "#f87171" },
  low: { text: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30", bar: "#fbbf24" },
};

const RISK_COLORS = {
  low: { text: "text-accent-400", bg: "bg-accent-500/15", border: "border-accent-500/30", label: "Low Risk" },
  moderate: { text: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30", label: "Moderate Risk" },
  elevated: { text: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30", label: "Elevated Risk" },
  high: { text: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", label: "High Risk" },
};

const RISK_LEVEL_COLORS = {
  low: { text: "text-accent-400", bg: "bg-accent-500/10", border: "border-accent-500/30" },
  moderate: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  high: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  critical: { text: "text-red-500", bg: "bg-red-600/15", border: "border-red-600/40" },
};

const TABS: { id: Section; label: string; emoji: string }[] = [
  { id: "summary", label: "Summary", emoji: "📋" },
  { id: "tests", label: "Tests", emoji: "🔬" },
  { id: "predictions", label: "Predictions", emoji: "🔮" },
  { id: "medications", label: "Medications", emoji: "💊" },
  { id: "chart", label: "Visuals", emoji: "📊" },
  { id: "nutrition", label: "Nutrition", emoji: "🥗" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🧘" },
];

export default function ResultsPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("summary");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!reportId) return;
    const unsub = onSnapshot(
      doc(db, "reports", reportId as string),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Report;
          setReport(data);
          if (data.status === "complete" && !data.shareId) {
            const newShareId = Math.random().toString(36).substring(2, 10);
            updateDoc(doc(db, "reports", reportId as string), { shareId: newShareId });
          }
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [reportId]);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    if (!report?.summary) return;
    const utterance = new SpeechSynthesisUtterance(report.summary);
    utterance.rate = 0.95; utterance.pitch = 1.05; utterance.volume = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleShare = () => {
    if (!report?.shareId) return;
    const url = `${window.location.origin}/share/${report.shareId}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0414] px-4 py-28 max-w-6xl mx-auto">
        <SkeletonTheme baseColor="#1a0a2e" highlightColor="#2e1060">
          <Skeleton height={100} borderRadius={20} className="mb-6" />
          <Skeleton height={60} borderRadius={16} className="mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton height={200} borderRadius={16} />
            <Skeleton height={200} borderRadius={16} />
            <Skeleton height={200} borderRadius={16} />
          </div>
        </SkeletonTheme>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0a0414] flex items-center justify-center px-4">
        <div className="text-center glass-card p-12 rounded-3xl border border-white/10 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Report Not Found</h2>
          <p className="text-gray-400 mb-6">This report doesn't exist or was deleted.</p>
          <button onClick={() => router.push("/upload")}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-500 text-white rounded-2xl font-bold">
            Upload a New Report
          </button>
        </div>
      </div>
    );
  }

  const { status, summary, recommendation, overallScore, tests = [], fileName, nutrition, lifestyle, supplements, healthGoals, futurePredictions = [], medicationAlerts = [], riskLevel } = report;
  const abnormalTests = tests.filter(t => t.flag !== "normal");
  const score = overallScore ?? 0;

  const scoreColor = score >= 8 ? "text-accent-400" : score >= 6 ? "text-secondary-400" : score >= 4 ? "text-amber-400" : "text-red-400";
  const scoreLabel = score >= 8 ? "Excellent" : score >= 6 ? "Good" : score >= 4 ? "Needs Work" : "Critical";

  const normalCount = tests.filter(t => t.flag === "normal").length;
  const pieData = [
    { name: "Normal", value: normalCount },
    { name: "Needs Attention", value: abnormalTests.length },
  ].filter(d => d.value > 0);

  const radarData = tests.slice(0, 6).map(t => ({
    subject: t.test.length > 12 ? t.test.slice(0, 10) + "…" : t.test,
    value: t.flag === "normal" ? 100 : t.flag === "high" ? 60 : 40,
  }));

  const patientName = user?.displayName || "";
  const reminderSuggestions = [
    ...abnormalTests.map(t => `Retest ${t.test} in 8 weeks`),
    "Follow-up with GP about results",
    "Start supplement protocol — check in 4 weeks",
  ].slice(0, 5);

  const riskColors = riskLevel ? RISK_LEVEL_COLORS[riskLevel] : null;

  return (
    <div className="min-h-screen bg-[#0a0414] relative">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-secondary-600/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 dot-grid opacity-20" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-28">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3" /> AI Blood Analysis
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">Your Report Results</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-400 inline-block" />
                {fileName}
              </p>
              {riskLevel && riskColors && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${riskColors.bg} ${riskColors.text} ${riskColors.border}`}>
                  {riskLevel.toUpperCase()} RISK
                </span>
              )}
            </div>
          </div>

          {status === "complete" && (
            <div className="flex flex-wrap items-center gap-2">
              <FollowUpReminder
                reportId={reportId as string}
                suggestions={reminderSuggestions}
              />
              <DoctorLetter
                reportData={{
                  fileName,
                  summary,
                  recommendation,
                  overallScore,
                  riskLevel,
                  tests,
                  supplements,
                  futurePredictions,
                  medicationAlerts,
                }}
                patientName={patientName}
              />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 border border-white/10 text-gray-300 hover:text-white hover:bg-white/12 transition-all text-sm font-medium">
                <Share2 className="w-4 h-4" /> Share
              </motion.button>
              {summary && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSpeak}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${isSpeaking ? "bg-secondary-500/20 border-secondary-500/40 text-secondary-300" : "bg-white/8 border-white/10 text-gray-300 hover:text-white hover:bg-white/12"}`}>
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {isSpeaking ? "Stop" : "Listen"}
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Health Score Hero ──────────────────────────────────────── */}
        {status === "complete" && overallScore && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {/* Score */}
            <div className="col-span-2 md:col-span-1 glass-card border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Health Score</p>
              <p className={`text-6xl font-black ${scoreColor}`}>{score.toFixed(1)}</p>
              <p className="text-gray-400 text-sm mt-1">/ 10 · {scoreLabel}</p>
            </div>
            {[
              { label: "Total Tests", value: tests.length, icon: Activity, color: "text-secondary-400" },
              { label: "Normal", value: normalCount, icon: CheckCircle2, color: "text-accent-400" },
              { label: "Need Attention", value: abnormalTests.length, icon: AlertTriangle, color: "text-amber-400" },
              { label: "Risk Factors", value: futurePredictions.length, icon: Brain, color: "text-purple-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                <Icon className={`w-5 h-5 ${color} mb-3`} />
                <div>
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="text-gray-500 text-xs mt-1">{label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Status Alerts ──────────────────────────────────────────── */}
        <AnimatePresence>
          {status === "processing" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="flex items-center gap-4 p-5 glass-card border border-amber-500/20 rounded-2xl mb-8 bg-amber-500/5">
              <div className="w-10 h-10 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin shrink-0" />
              <div>
                <p className="font-semibold text-amber-200">AI is analysing your report…</p>
                <p className="text-sm text-amber-400/70">This usually takes 10–30 seconds ✨</p>
              </div>
            </motion.div>
          )}
          {status === "error" && report.error && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="flex items-start gap-4 p-5 glass-card border border-red-500/20 rounded-2xl mb-8 bg-red-500/5">
              <AlertCircle className="w-6 h-6 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-200">Analysis failed</p>
                <p className="text-sm text-red-400/80 mt-1">{report.error}</p>
                <button onClick={() => router.push("/upload")}
                  className="mt-3 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm rounded-xl font-medium transition-colors">
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        {status === "complete" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex gap-2 flex-wrap mb-8 p-1.5 glass-card border border-white/8 rounded-2xl">
            {TABS.map(({ id, label, emoji }) => {
              const hasBadge = id === "predictions" && futurePredictions.length > 0;
              const hasMedBadge = id === "medications" && medicationAlerts.length > 0;
              return (
                <button key={id} onClick={() => setActiveSection(id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeSection === id
                    ? "bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-lg shadow-primary-600/20"
                    : "text-gray-400 hover:text-white hover:bg-white/8"}`}>
                  <span>{emoji}</span>{label}
                  {(hasBadge || hasMedBadge) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 right-1.5" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ── Content ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* SUMMARY */}
          {status === "complete" && activeSection === "summary" && (
            <motion.section key="summary" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} className="space-y-6">

              <div className="grid md:grid-cols-2 gap-6">
                {/* Summary Card */}
                <div className="glass-card border border-white/10 rounded-2xl p-7">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-primary-300" />
                    </div>
                    AI Analysis Summary
                  </h2>
                  <div className="prose prose-sm prose-invert max-w-none text-gray-300 leading-relaxed [&_strong]:text-white [&_ul]:text-gray-300">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                </div>

                {/* Health Goals */}
                <div className="glass-card border border-white/10 rounded-2xl p-7">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-500/15 flex items-center justify-center">
                      <Target className="w-4 h-4 text-accent-400" />
                    </div>
                    Top Health Goals
                  </h2>
                  <div className="space-y-3">
                    {(healthGoals || []).length > 0 ? healthGoals!.map((goal, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">{i + 1}</span>
                        <p className="text-gray-300 text-sm leading-relaxed">{goal}</p>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-600">
                        <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No specific goals generated.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendation banner */}
              {recommendation && (
                <div className="p-6 rounded-2xl bg-gradient-to-r from-primary-600/10 to-secondary-600/10 border border-primary-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 to-transparent" />
                  <h3 className="text-base font-bold text-primary-200 mb-2 flex items-center gap-2 relative">
                    <Zap className="w-4 h-4" /> #1 Priority Action
                  </h3>
                  <p className="text-gray-300 leading-relaxed relative text-sm">{recommendation}</p>
                </div>
              )}

              {/* Abnormal overview */}
              {abnormalTests.length > 0 && (
                <div className="glass-card border border-amber-500/15 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-amber-300 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {abnormalTests.length} Test{abnormalTests.length > 1 ? "s" : ""} Need Attention
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {abnormalTests.map((t, i) => {
                      const flagKey = (t.flag === "high" || t.flag === "low") ? t.flag : "normal";
                      const fc = FLAG_COLORS[flagKey];
                      return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${fc.bg} ${fc.border}`}>
                          {t.flag === "high" ? <TrendingUp className={`w-4 h-4 shrink-0 ${fc.text}`} />
                            : <TrendingDown className={`w-4 h-4 shrink-0 ${fc.text}`} />}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{t.test}</p>
                            <p className={`text-xs ${fc.text}`}>{t.value} {t.unit} · {t.flag === "high" ? "High" : "Low"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick insights row */}
              {futurePredictions.length > 0 && (
                <div className="glass-card border border-purple-500/15 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <Brain className="w-4 h-4" /> Future Risk Snapshot
                    <span className="text-xs text-gray-500 font-normal ml-auto">See Predictions tab for details</span>
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {futurePredictions.slice(0, 3).map((p, i) => {
                      const rc = RISK_COLORS[p.risk] || RISK_COLORS.moderate;
                      return (
                        <div key={i} className={`p-3 rounded-xl border ${rc.bg} ${rc.border}`}>
                          <p className={`text-xs font-bold ${rc.text} mb-1`}>{p.risk.toUpperCase()} RISK</p>
                          <p className="text-white text-sm font-semibold">{p.condition}</p>
                          <p className="text-gray-500 text-xs mt-1">{p.timeframe}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/3 border border-white/8 text-gray-500 text-sm">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-gray-600" />
                <p>This is an AI-generated analysis for informational purposes only. Always consult a qualified doctor for medical decisions.</p>
              </div>
            </motion.section>
          )}

          {/* TESTS */}
          {status === "complete" && activeSection === "tests" && (
            <motion.section key="tests" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">🔬 All Test Results</h2>
                <p className="text-gray-500 text-sm mt-1">{tests.length} markers analysed · {abnormalTests.length} need attention</p>
              </div>

              {tests.length === 0 ? (
                <div className="text-center py-20 glass-card border border-white/10 rounded-2xl">
                  <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-60" />
                  <h3 className="text-xl font-bold text-white mb-2">No markers detected</h3>
                  <p className="text-gray-400 mb-6 max-w-xs mx-auto">Try uploading a clearer photo with good lighting and no glare.</p>
                  <button onClick={() => router.push("/upload")} className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-500 text-white rounded-2xl font-bold">
                    Upload Again
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tests.map((test, idx) => {
                    const parsed = parseRange(test.range);
                    const pct = parsed ? gaugePercent(test.value, parsed) : null;
                    const flagKey = (test.flag === "high" || test.flag === "low") ? test.flag : "normal";
                    const fc = FLAG_COLORS[flagKey];
                    return (
                      <motion.div key={`${test.test}-${idx}`}
                        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`glass-card border rounded-2xl p-5 flex flex-col gap-4 ${fc.border}`}>

                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-white font-bold text-sm leading-tight">{test.test}</h3>
                          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${fc.bg} ${fc.text} border ${fc.border}`}>
                            {test.flag === "normal" ? "✓ Normal" : test.flag === "high" ? "↑ High" : "↓ Low"}
                          </span>
                        </div>

                        {/* Value */}
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-4xl font-black ${fc.text}`}>{test.value}</span>
                          <span className="text-gray-500 text-sm">{test.unit}</span>
                        </div>

                        {/* Range bar */}
                        {parsed && pct !== null && (
                          <div>
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{parsed.min}</span>
                              <span className="text-gray-500">Normal range</span>
                              <span>{parsed.max}</span>
                            </div>
                            <div className="relative h-2 rounded-full bg-white/10 overflow-visible">
                              <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-amber-500/30 via-accent-500/30 to-red-500/30" />
                              <div className="absolute inset-y-0 rounded-full bg-accent-500/30" style={{ left: "15%", right: "15%" }} />
                              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
                                style={{ left: `${pct}%`, backgroundColor: fc.bar, transform: `translate(-50%, -50%)` }} />
                            </div>
                            <p className="text-xs text-gray-600 mt-1 text-center">Range: {test.range} {test.unit}</p>
                          </div>
                        )}

                        {/* Explanation */}
                        {test.explanation && (
                          <div className="p-3 rounded-xl bg-secondary-500/8 border border-secondary-500/15">
                            <p className="text-xs text-secondary-300 font-semibold mb-1 flex items-center gap-1">
                              <Info className="w-3 h-3" /> What this means
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">{test.explanation}</p>
                          </div>
                        )}

                        {/* Root Causes — always show when available */}
                        {test.rootCauses && (
                          <div className="p-3 rounded-xl bg-purple-500/8 border border-purple-500/15">
                            <p className="text-xs text-purple-300 font-semibold mb-1 flex items-center gap-1">
                              <Brain className="w-3 h-3" /> Likely causes
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">{test.rootCauses}</p>
                          </div>
                        )}

                        {/* Advice */}
                        {test.advice && test.flag !== "normal" && (
                          <div className="p-3 rounded-xl bg-primary-500/8 border border-primary-500/15">
                            <p className="text-xs text-primary-300 font-semibold mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> How to improve
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">{test.advice}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {/* PREDICTIONS */}
          {status === "complete" && activeSection === "predictions" && (
            <motion.section key="predictions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} className="space-y-6">

              <div className="glass-card border border-purple-500/20 rounded-2xl p-5 flex items-center gap-4 bg-purple-500/5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Future Health Predictions</h2>
                  <p className="text-purple-400 text-sm">Based on your current blood markers — if left unaddressed</p>
                </div>
              </div>

              {futurePredictions.length === 0 ? (
                <div className="text-center py-16 glass-card border border-white/10 rounded-2xl">
                  <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-40" />
                  <p className="text-gray-500 text-sm">No future predictions generated for this report.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-5">
                  {futurePredictions.map((p, i) => {
                    const rc = RISK_COLORS[p.risk] || RISK_COLORS.moderate;
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`glass-card border rounded-2xl p-6 space-y-4 ${rc.border}`}>

                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-white font-bold text-base">{p.condition}</h3>
                          <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${rc.bg} ${rc.text} ${rc.border}`}>
                            {p.risk.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Projected timeframe: <span className="text-white font-semibold">{p.timeframe}</span></span>
                        </div>

                        <div className="p-3 rounded-xl bg-white/4 border border-white/6">
                          <p className="text-xs text-gray-400 font-semibold mb-1.5 flex items-center gap-1.5">
                            <FlaskConical className="w-3 h-3" /> Why your markers suggest this
                          </p>
                          <p className="text-gray-300 text-xs leading-relaxed">{p.reason}</p>
                        </div>

                        <div className="p-3 rounded-xl bg-accent-500/8 border border-accent-500/15">
                          <p className="text-xs text-accent-400 font-semibold mb-1.5 flex items-center gap-1.5">
                            <ShieldAlert className="w-3 h-3" /> Prevention plan
                          </p>
                          <p className="text-gray-300 text-xs leading-relaxed">{p.prevention}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/3 border border-white/8 text-gray-500 text-xs">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-gray-600" />
                <p>These predictions are based on statistical trends in blood markers and are not definitive diagnoses. Consult your doctor for personalised medical advice.</p>
              </div>
            </motion.section>
          )}

          {/* MEDICATIONS */}
          {status === "complete" && activeSection === "medications" && (
            <motion.section key="medications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} className="space-y-6">

              <div className="glass-card border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4 bg-amber-500/5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Medication Interaction Alerts</h2>
                  <p className="text-amber-400 text-sm">How your medications may affect your lab values</p>
                </div>
              </div>

              {medicationAlerts.length === 0 ? (
                <div className="text-center py-16 glass-card border border-white/10 rounded-2xl">
                  <Pill className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-40" />
                  <p className="text-gray-400 font-semibold mb-1">No medication alerts detected</p>
                  <p className="text-gray-600 text-sm max-w-sm mx-auto">
                    If you're on medications, include them when uploading your report for personalised interaction analysis.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicationAlerts.map((alert, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-card border border-amber-500/20 rounded-2xl p-6 space-y-4">

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                          <Syringe className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{alert.medication}</h3>
                          <p className="text-amber-400 text-xs">Interacts with: <span className="font-semibold">{alert.marker}</span></p>
                        </div>
                        <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                          ⚠ ALERT
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-white/4 border border-white/8">
                        <p className="text-xs text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                          <Info className="w-3 h-3" /> Interaction explanation
                        </p>
                        <p className="text-gray-300 text-sm leading-relaxed">{alert.interaction}</p>
                      </div>

                      <div className="p-4 rounded-xl bg-accent-500/8 border border-accent-500/20">
                        <p className="text-xs text-accent-400 font-semibold mb-2 flex items-center gap-1.5">
                          <Stethoscope className="w-3 h-3" /> Recommendation
                        </p>
                        <p className="text-gray-300 text-sm leading-relaxed">{alert.suggestion}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Smart Supplements section */}
              {(supplements || []).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent-400" /> Recommended Supplements
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {supplements!.map((s, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="glass-card border border-white/8 rounded-2xl p-5 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent-500/15 flex items-center justify-center text-accent-400 font-bold text-xs shrink-0">{i + 1}</div>
                          <div className="flex-1">
                            <h4 className="text-white font-bold">{s.name}</h4>
                            {s.dose && <p className="text-accent-400 text-xs font-semibold mt-0.5">{s.dose}</p>}
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">{s.reason}</p>
                        {s.duration && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <CalendarClock className="w-3 h-3" /> Duration: <span className="text-gray-400">{s.duration}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-300/80 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Always consult your doctor before starting new supplements, especially if on prescription medication.
              </div>
            </motion.section>
          )}

          {/* CHARTS */}
          {status === "complete" && activeSection === "chart" && (
            <motion.section key="chart" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6">
              <h2 className="text-xl font-bold text-white">📊 Visual Health Overview</h2>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Pie */}
                <div className="glass-card border border-white/10 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white mb-4">Results Breakdown</h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={110}
                          paddingAngle={4} dataKey="value" nameKey="name">
                          <Cell fill="#4ade80" />
                          <Cell fill="#fbbf24" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#12072a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
                        <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 13 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-gray-600">No data yet</div>
                  )}
                </div>

                {/* Radar */}
                <div className="glass-card border border-white/10 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white mb-4">Marker Health Map</h3>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <Radar name="Health %" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
                        <Tooltip contentStyle={{ backgroundColor: "#12072a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                          formatter={(v: any) => [`${v}%`, "Health"]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-gray-600">Not enough data</div>
                  )}
                </div>
              </div>

              {/* Abnormal list */}
              {abnormalTests.length > 0 && (
                <div className="glass-card border border-white/10 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white mb-4">⚠ Tests Needing Attention</h3>
                  <div className="space-y-3">
                    {abnormalTests.map((t, i) => {
                      const flagKey = (t.flag === "high" || t.flag === "low") ? t.flag : "normal";
                      const fc = FLAG_COLORS[flagKey];
                      return (
                        <div key={i} className={`flex items-center gap-4 p-3.5 rounded-xl border ${fc.bg} ${fc.border}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${fc.bg}`}>
                            {t.flag === "high" ? <TrendingUp className={`w-4 h-4 ${fc.text}`} /> : <TrendingDown className={`w-4 h-4 ${fc.text}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{t.test}</p>
                            <p className={`text-xs ${fc.text}`}>{t.value} {t.unit} · Range: {t.range}</p>
                          </div>
                          <span className={`text-xs font-bold ${fc.text} shrink-0`}>{t.flag === "high" ? "HIGH" : "LOW"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {/* NUTRITION */}
          {status === "complete" && activeSection === "nutrition" && nutrition && (
            <motion.section key="nutrition" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6">
              <div className="glass-card border border-accent-500/20 rounded-2xl p-5 flex items-center gap-4 bg-accent-500/5">
                <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Personalised Nutrition Protocol</h2>
                  <p className="text-accent-400 text-sm">Focus: {nutrition.focus}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <MealCard title="Breakfast" icon={<Sun className="w-4 h-4" />} items={nutrition.breakfast}
                  color="from-amber-500/10 to-amber-600/5" border="border-amber-500/20" textColor="text-amber-300" dot="bg-amber-400" />
                <MealCard title="Lunch" icon={<Utensils className="w-4 h-4" />} items={nutrition.lunch}
                  color="from-accent-500/10 to-accent-600/5" border="border-accent-500/20" textColor="text-accent-300" dot="bg-accent-400" />
                <MealCard title="Dinner" icon={<Moon className="w-4 h-4" />} items={nutrition.dinner}
                  color="from-secondary-500/10 to-secondary-600/5" border="border-secondary-500/20" textColor="text-secondary-300" dot="bg-secondary-400" />
                <MealCard title="Snacks" icon={<Heart className="w-4 h-4" />} items={nutrition.snacks}
                  color="from-primary-500/10 to-primary-600/5" border="border-primary-500/20" textColor="text-primary-300" dot="bg-primary-400" />
              </div>

              {nutrition.avoid.length > 0 && (
                <div className="glass-card border border-red-500/20 rounded-2xl p-5 bg-red-500/4">
                  <h3 className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2">
                    <Ban className="w-4 h-4" /> Limit or Avoid
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {nutrition.avoid.map((item, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {/* LIFESTYLE */}
          {status === "complete" && activeSection === "lifestyle" && (
            <motion.section key="lifestyle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6">

              <div className="grid md:grid-cols-2 gap-6">
                {/* Lifestyle habits */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-secondary-400" /> Lifestyle Habits
                  </h2>
                  {lifestyle ? (
                    <>
                      <LifestyleCard icon={<Dumbbell className="w-4 h-4" />} title="Movement & Exercise"
                        content={lifestyle.exercise} color="secondary" />
                      <LifestyleCard icon={<Moon className="w-4 h-4" />} title="Sleep Hygiene"
                        content={lifestyle.sleep} color="primary" />
                      <LifestyleCard icon={<Sun className="w-4 h-4" />} title="Stress Management"
                        content={lifestyle.stress} color="accent" />
                    </>
                  ) : (
                    <div className="text-gray-600 text-sm py-8 text-center glass-card border border-white/8 rounded-2xl">No lifestyle data available.</div>
                  )}
                </div>

                {/* Supplements */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Pill className="w-5 h-5 text-accent-400" /> Smart Supplements
                  </h2>
                  <div className="space-y-3">
                    {(supplements || []).length > 0 ? supplements!.map((s, i) => (
                      <div key={i} className="glass-card border border-white/8 rounded-2xl p-4 flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent-500/15 flex items-center justify-center text-accent-400 font-bold text-xs shrink-0">{i + 1}</div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-sm">{s.name}</h4>
                            {s.dose && <p className="text-accent-400 text-xs font-semibold">{s.dose}</p>}
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed">{s.reason}</p>
                        {s.duration && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <CalendarClock className="w-3 h-3" /> {s.duration}
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="text-gray-600 text-sm py-8 text-center glass-card border border-white/8 rounded-2xl">No supplements recommended.</div>
                    )}
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-300/80 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    Always consult your doctor before starting new supplements, especially if on medication.
                  </div>
                </div>
              </div>
            </motion.section>
          )}

        </AnimatePresence>

        {/* Chat Interface */}
        {status === "complete" && (
          <ChatInterface reportId={reportId as string} reportSummary={summary} />
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function MealCard({ title, icon, items, color, border, textColor, dot }:
  { title: string; icon: React.ReactNode; items: string[]; color: string; border: string; textColor: string; dot: string }) {
  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-br ${color} border ${border}`}>
      <h3 className={`font-bold text-sm ${textColor} mb-3 flex items-center gap-2`}>
        {icon} {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-gray-300 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LifestyleCard({ icon, title, content, color }:
  { icon: React.ReactNode; title: string; content: string; color: "primary" | "secondary" | "accent" }) {
  const colors = {
    primary: "bg-primary-500/8 border-primary-500/20 text-primary-300",
    secondary: "bg-secondary-500/8 border-secondary-500/20 text-secondary-300",
    accent: "bg-accent-500/8 border-accent-500/20 text-accent-300",
  };
  return (
    <div className={`p-5 rounded-2xl border ${colors[color]}`}>
      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">{icon} {title}</h4>
      <p className="text-gray-400 text-sm leading-relaxed">{content}</p>
    </div>
  );
}
