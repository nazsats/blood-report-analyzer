"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Loader2, AlertCircle, CheckCircle2, Info,
  Activity, Target, Utensils, Moon, Sun,
  Dumbbell, Ban, Sparkles, Heart, TrendingUp,
  Shield, Brain, Clock, ShieldAlert, FlaskConical,
  Syringe, Pill, Volume2, VolumeX, Share2,
  FileText, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import ReactMarkdown from "react-markdown";

/* ─── Interfaces ─────────────────────────────────────────── */
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
  status: "complete";
  healthGoals?: string[];
  nutrition?: Nutrition;
  lifestyle?: Lifestyle;
  supplements?: Supplement[];
  futurePredictions?: FuturePrediction[];
  medicationAlerts?: MedicationAlert[];
}

/* ─── Theme constants ────────────────────────────────────── */
type Section = "summary" | "tests" | "predictions" | "medications" | "chart" | "nutrition" | "lifestyle";

const TABS: { id: Section; label: string; emoji: string }[] = [
  { id: "summary",     label: "Summary",     emoji: "📋" },
  { id: "tests",       label: "Tests",       emoji: "🔬" },
  { id: "predictions", label: "Predictions", emoji: "🔮" },
  { id: "medications", label: "Medications", emoji: "💊" },
  { id: "chart",       label: "Visuals",     emoji: "📊" },
  { id: "nutrition",   label: "Nutrition",   emoji: "🥗" },
  { id: "lifestyle",   label: "Lifestyle",   emoji: "🧘" },
];

const FLAG_COLORS = {
  normal: { text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  bar: "#4ade80" },
  high:   { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    bar: "#f87171" },
  low:    { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  bar: "#fbbf24" },
};

const RISK_COLORS = {
  low:      { text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  label: "Low Risk" },
  moderate: { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  label: "Moderate Risk" },
  elevated: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "Elevated Risk" },
  high:     { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    label: "High Risk" },
};

const RISK_LEVEL_COLORS = {
  low:      { text: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/25" },
  moderate: { text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25" },
  high:     { text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/25" },
  critical: { text: "text-red-500",    bg: "bg-red-600/15",    border: "border-red-600/40" },
};

function parseRange(range: string): { min: number; max: number } | null {
  const match = range.match(/([\d.]+)\s*[-–—]\s*([\d.]+)/);
  if (!match) return null;
  return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
}

function gaugePercent(value: number, range: { min: number; max: number }): number {
  const span = range.max - range.min;
  if (span === 0) return 50;
  return Math.min(Math.max(((value - range.min) / span) * 100, 0), 100);
}

function scoreColor(s: number) {
  if (s >= 8) return "text-green-400";
  if (s >= 6) return "text-amber-400";
  return "text-red-400";
}

/* ─── Component ──────────────────────────────────────────── */
export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [report, setReport]           = useState<Report | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("summary");
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      if (!shareId) { setError("Invalid share link"); setLoading(false); return; }
      try {
        const q = query(collection(db, "reports"), where("shareId", "==", shareId));
        const snap = await getDocs(q);
        if (snap.empty) { setError("Report not found or link expired"); setLoading(false); return; }
        setReport(snap.docs[0].data() as Report);
      } catch {
        setError("Failed to load shared report");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [shareId]);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0414] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
          <Heart className="absolute inset-0 m-auto h-6 w-6 text-violet-400" />
        </div>
        <p className="text-violet-300 text-sm">Loading shared report…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#0a0414] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md bg-white/5 backdrop-blur border border-white/10 p-10 rounded-3xl"
        >
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Report Not Found</h2>
          <p className="text-gray-400">{error ?? "This shared report is not available."}</p>
        </motion.div>
      </div>
    );
  }

  const { summary, recommendation, overallScore, tests = [], fileName } = report;
  const predictions  = report.futurePredictions  ?? [];
  const medAlerts    = report.medicationAlerts   ?? [];
  const supplements  = report.supplements        ?? [];
  const healthGoals  = report.healthGoals        ?? [];
  const riskLevel    = report.riskLevel;
  const rlc          = riskLevel ? RISK_LEVEL_COLORS[riskLevel] : null;

  const abnormal     = tests.filter(t => t.flag !== "normal");
  const pieData      = [
    { name: "Normal",          value: tests.filter(t => t.flag === "normal").length, fill: "#4ade80" },
    { name: "High",            value: tests.filter(t => t.flag === "high").length,   fill: "#f87171" },
    { name: "Low",             value: tests.filter(t => t.flag === "low").length,    fill: "#fbbf24" },
  ].filter(d => d.value > 0);

  const radarData = abnormal.slice(0, 6).map(t => {
    const r = parseRange(t.range);
    return { subject: t.test.substring(0, 12), value: r ? gaugePercent(t.value, r) : 50 };
  });

  return (
    <div className="min-h-screen bg-[#0a0414] text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 pb-20">

        {/* ── Brand banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-500/20 rounded-lg border border-violet-500/30">
              <Heart className="h-4 w-4 text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-violet-300 tracking-wide">AI Blood Report</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium">
            Shared Report
          </span>
        </motion.div>

        {/* ── Header card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-6 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
                  <FileText className="h-3 w-3 text-violet-400" />
                  <span className="text-violet-300 text-xs font-medium truncate max-w-[200px]">{fileName}</span>
                </div>
                {rlc && riskLevel && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${rlc.bg} ${rlc.border} ${rlc.text}`}>
                    {RISK_LEVEL_COLORS[riskLevel] && riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Health Analysis Report</h1>
              <p className="text-gray-400 text-sm flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-violet-400" />
                AI-Powered Blood Report Insights
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-start gap-2 flex-shrink-0">
              {summary && (
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleSpeak}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:border-violet-500/40 hover:text-violet-300 transition-all text-sm"
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isSpeaking ? "Stop" : "Listen"}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-all text-sm"
              >
                <Share2 className="h-4 w-4" />
                {copied ? "Copied!" : "Share"}
              </motion.button>
            </div>
          </div>

          {/* Score row */}
          {overallScore && (
            <div className="relative z-10 mt-6 flex flex-wrap items-center gap-6 pt-6 border-t border-white/8">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Health Score</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black ${scoreColor(overallScore)}`}>{overallScore.toFixed(1)}</span>
                  <span className="text-gray-500 text-lg">/10</span>
                </div>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Tests Analyzed</p>
                <span className="text-2xl font-bold text-white">{tests.length}</span>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Needs Attention</p>
                <span className="text-2xl font-bold text-amber-400">{abnormal.length}</span>
              </div>
              {predictions.length > 0 && (
                <>
                  <div className="h-10 w-px bg-white/10" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Risk Factors</p>
                    <span className="text-2xl font-bold text-violet-400">{predictions.length}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {TABS.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === id
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                  : "bg-white/5 text-gray-400 border border-white/8 hover:border-violet-500/30 hover:text-violet-300"
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </motion.div>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">

          {/* SUMMARY */}
          {activeSection === "summary" && (
            <motion.section
              key="summary"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-3">
                  <div className="p-2 bg-violet-500/15 rounded-xl border border-violet-500/20">
                    <Info className="h-5 w-5 text-violet-400" />
                  </div>
                  Executive Summary
                </h2>
                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>

              {recommendation && (
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-3xl p-7">
                  <h3 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5" /> Key Recommendation
                  </h3>
                  <p className="text-gray-200 leading-relaxed">{recommendation}</p>
                </div>
              )}

              {healthGoals.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                  <h3 className="text-lg font-bold text-cyan-300 mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5" /> Health Goals
                  </h3>
                  <ul className="space-y-3">
                    {healthGoals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {supplements.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-7">
                  <h3 className="text-lg font-bold text-violet-300 mb-4 flex items-center gap-2">
                    <Pill className="h-5 w-5" /> Supplements Recommended
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {supplements.map((s, i) => (
                      <div key={i} className="bg-violet-500/8 border border-violet-500/15 rounded-2xl p-4">
                        <p className="font-semibold text-violet-300 text-sm mb-1">{s.name}</p>
                        {s.dose && <p className="text-xs text-cyan-400 mb-1">Dose: {s.dose}</p>}
                        <p className="text-xs text-gray-400 leading-relaxed">{s.reason}</p>
                        {s.duration && <p className="text-xs text-amber-400 mt-1">Duration: {s.duration}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {/* TESTS */}
          {activeSection === "tests" && (
            <motion.section
              key="tests"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tests.map((test, i) => {
                  const fc = FLAG_COLORS[test.flag];
                  const r = parseRange(test.range);
                  const pct = r ? gaugePercent(test.value, r) : null;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white pr-2 leading-snug">{test.test}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${fc.bg} ${fc.border} border ${fc.text} uppercase`}>
                          {test.flag}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-3xl font-black text-white">{test.value}</span>
                        <span className="text-xs text-gray-500">{test.unit}</span>
                      </div>

                      <p className="text-xs text-gray-500 mb-3">Range: <span className="text-gray-300">{test.range}</span></p>

                      {pct !== null && (
                        <div className="mb-3">
                          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: fc.bar }}
                            />
                          </div>
                        </div>
                      )}

                      {test.explanation && (
                        <p className="text-xs text-gray-400 leading-relaxed mb-2">{test.explanation}</p>
                      )}

                      {test.rootCauses && (
                        <div className="bg-purple-500/8 border border-purple-500/15 rounded-xl p-3 mt-2">
                          <p className="text-xs font-medium text-purple-300 mb-1">Likely Causes</p>
                          <p className="text-xs text-gray-400 leading-relaxed">{test.rootCauses}</p>
                        </div>
                      )}

                      {test.advice && (
                        <div className="bg-cyan-500/8 border border-cyan-500/15 rounded-xl p-3 mt-2">
                          <p className="text-xs font-medium text-cyan-300 mb-1">Action Plan</p>
                          <p className="text-xs text-gray-400 leading-relaxed">{test.advice}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* PREDICTIONS */}
          {activeSection === "predictions" && (
            <motion.section
              key="predictions"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {predictions.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No prediction data in this report.</p>
                </div>
              ) : predictions.map((p, i) => {
                const rc = RISK_COLORS[p.risk] ?? RISK_COLORS.moderate;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-violet-500/25 transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-violet-500/15 rounded-xl border border-violet-500/20">
                          <Brain className="h-4 w-4 text-violet-400" />
                        </div>
                        <h3 className="text-base font-bold text-white">{p.condition}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${rc.bg} ${rc.border} ${rc.text}`}>
                          {rc.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />{p.timeframe}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white/4 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <FlaskConical className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-300">Why this risk?</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{p.reason}</p>
                      </div>
                      <div className="bg-green-500/8 border border-green-500/15 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs font-semibold text-green-300">Prevention</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{p.prevention}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.section>
          )}

          {/* MEDICATIONS */}
          {activeSection === "medications" && (
            <motion.section
              key="medications"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {medAlerts.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Syringe className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No medication interactions flagged for this report.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {medAlerts.map((alert, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="bg-red-500/6 border border-red-500/20 rounded-2xl p-6"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-red-500/15 rounded-xl border border-red-500/20">
                            <Syringe className="h-4 w-4 text-red-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-red-300">{alert.medication}</h3>
                            <p className="text-xs text-gray-500">Affects: {alert.marker}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-3">{alert.interaction}</p>
                        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-300 mb-1">Recommendation</p>
                          <p className="text-xs text-gray-300">{alert.suggestion}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {supplements.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <h3 className="text-base font-bold text-violet-300 mb-4 flex items-center gap-2">
                        <Pill className="h-4 w-4" /> Supplement Recommendations
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {supplements.map((s, i) => (
                          <div key={i} className="bg-violet-500/8 border border-violet-500/15 rounded-xl p-4">
                            <p className="font-semibold text-violet-300 text-sm mb-1">{s.name}</p>
                            {s.dose && <p className="text-xs text-cyan-400 mb-1">Dose: {s.dose}</p>}
                            <p className="text-xs text-gray-400 leading-relaxed">{s.reason}</p>
                            {s.duration && <p className="text-xs text-amber-400 mt-1">Duration: {s.duration}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.section>
          )}

          {/* CHART */}
          {activeSection === "chart" && (
            <motion.section
              key="chart"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="grid md:grid-cols-2 gap-5"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-80 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 text-center">Test Result Distribution</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1a0a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                      <Legend iconType="circle" wrapperStyle={{ color: "#9ca3af", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-80 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 text-center">Abnormal Markers Radar</h3>
                {radarData.length > 0 ? (
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                        <Radar name="Value %" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                        <Tooltip contentStyle={{ background: "#1a0a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-green-400 gap-3">
                    <CheckCircle2 className="h-14 w-14 opacity-80" />
                    <p className="text-sm font-medium">All markers in normal range</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* NUTRITION */}
          {activeSection === "nutrition" && (
            <motion.section
              key="nutrition"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {report.nutrition ? (
                <>
                  <div className="bg-white/5 border border-l-4 border-l-green-500 border-white/10 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-1">Nutrition Focus</h3>
                    <p className="text-gray-300 text-sm">{report.nutrition.focus}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {([
                      { key: "breakfast", label: "Breakfast", Icon: Sun,      color: "text-amber-400",  bg: "bg-amber-500/8  border-amber-500/15" },
                      { key: "lunch",     label: "Lunch",     Icon: Utensils,  color: "text-green-400",  bg: "bg-green-500/8  border-green-500/15" },
                      { key: "dinner",    label: "Dinner",    Icon: Moon,      color: "text-blue-400",   bg: "bg-blue-500/8   border-blue-500/15" },
                      { key: "snacks",    label: "Snacks",    Icon: Heart,     color: "text-pink-400",   bg: "bg-pink-500/8   border-pink-500/15" },
                    ] as const).map(({ key, label, Icon, color, bg }) => (
                      <div key={key} className={`border rounded-2xl p-5 ${bg}`}>
                        <h4 className={`font-semibold ${color} mb-3 flex items-center gap-2 text-sm`}>
                          <Icon className="h-4 w-4" />{label}
                        </h4>
                        <ul className="space-y-1.5">
                          {(report.nutrition![key] as string[]).map((item, i) => (
                            <li key={i} className="text-gray-300 text-xs leading-relaxed">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {report.nutrition.avoid.length > 0 && (
                    <div className="bg-red-500/6 border border-red-500/20 rounded-2xl p-5">
                      <h4 className="font-semibold text-red-300 mb-3 flex items-center gap-2 text-sm">
                        <Ban className="h-4 w-4" /> Avoid / Limit
                      </h4>
                      <ul className="space-y-1.5">
                        {report.nutrition.avoid.map((item, i) => (
                          <li key={i} className="text-gray-300 text-xs leading-relaxed">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <Utensils className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nutrition details not available.</p>
                </div>
              )}
            </motion.section>
          )}

          {/* LIFESTYLE */}
          {activeSection === "lifestyle" && (
            <motion.section
              key="lifestyle"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {report.lifestyle ? (
                <>
                  {[
                    { label: "Exercise",           value: report.lifestyle.exercise, Icon: Dumbbell, color: "text-cyan-400",   bg: "bg-cyan-500/8   border-cyan-500/15" },
                    { label: "Sleep Hygiene",       value: report.lifestyle.sleep,    Icon: Moon,     color: "text-indigo-400", bg: "bg-indigo-500/8 border-indigo-500/15" },
                    { label: "Stress Management",   value: report.lifestyle.stress,   Icon: Brain,    color: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/15" },
                  ].map(({ label, value, Icon, color, bg }) => (
                    <div key={label} className={`border rounded-2xl p-6 ${bg}`}>
                      <h3 className={`font-bold ${color} mb-3 flex items-center gap-2`}>
                        <Icon className="h-5 w-5" />{label}
                      </h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{value}</p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Lifestyle details not available.</p>
                </div>
              )}
            </motion.section>
          )}

        </AnimatePresence>

        {/* ── CTA footer ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-14 bg-gradient-to-br from-violet-500/10 to-cyan-500/8 border border-violet-500/20 rounded-3xl p-8 text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/30">
              <Sparkles className="h-7 w-7 text-violet-400" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Analyze Your Own Blood Report</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Upload your blood report and get a comprehensive AI-powered health analysis in seconds.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-violet-500/25"
          >
            <Heart className="h-4 w-4" />
            Get Your Free Analysis
          </a>
          <p className="text-xs text-gray-600 mt-4 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" />
            Your data is encrypted and private
          </p>
        </motion.div>

      </div>
    </div>
  );
}
