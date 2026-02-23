// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, FileText, TrendingUp, ChevronRight,
  Clock, ShieldCheck, Upload, AlertTriangle, CheckCircle2,
  Activity, Brain, Sparkles, Shield, TrendingDown, BarChart3,
  Search, Calendar, Trash2, ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

const RISK_CONFIG: Record<string, { label: string; text: string; bg: string; border: string; dot: string }> = {
  low: { label: "Low Risk", text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", dot: "bg-green-400" },
  moderate: { label: "Moderate", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400" },
  high: { label: "High Risk", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400" },
  critical: { label: "Critical", text: "text-red-500", bg: "bg-red-600/15", border: "border-red-600/30", dot: "bg-red-500" },
};

function scoreColor(s: number) {
  if (s >= 8) return "text-green-400";
  if (s >= 6) return "text-secondary-400";
  if (s >= 4) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(s: number) {
  if (s >= 8) return "bg-green-500/10 border-green-500/20";
  if (s >= 6) return "bg-secondary-500/10 border-secondary-500/20";
  if (s >= 4) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "reports"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteDoc(doc(db, "reports", id));
      toast.success("Report deleted");
    } catch {
      toast.error("Failed to delete report");
    }
  };

  const filteredReports = reports.filter(r =>
    r.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0414]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading your health history...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const completed = reports.filter(r => r.status === "complete" && r.overallScore);
  const scores = completed.map(r => r.overallScore as number);
  const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const bestScore = scores.length ? Math.max(...scores) : null;
  const latestScore = scores[0] ?? null;
  const trend = scores.length >= 2 ? +(scores[0] - scores[1]).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-[#0a0414] relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-secondary-600/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 dot-grid opacity-20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto pt-32 pb-20 px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold uppercase tracking-widest mb-4"
            >
              <Sparkles className="w-3 h-3" /> Personal Archive
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-black text-white mb-4"
            >
              Your Health{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
                Archive
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-400"
            >
              Track your physiological journey, monitor trends, and access past reports instantly.
            </motion.p>
          </div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="relative group min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary-500/50 focus:bg-white/10 transition-all text-white placeholder:text-gray-500 text-sm"
              />
            </div>
          </motion.div>
        </div>

        {/* ── Stats Dashboard (only when there are completed reports) ── */}
        {completed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            {[
              {
                label: "Total Reports",
                value: reports.length,
                icon: FileText,
                color: "text-primary-400",
                bg: "bg-primary-500/10",
                border: "border-primary-500/20",
              },
              {
                label: "Latest Score",
                value: latestScore ? `${latestScore}/10` : "—",
                icon: Activity,
                color: latestScore ? scoreColor(latestScore) : "text-gray-400",
                bg: latestScore ? scoreBg(latestScore).split(" ")[0] : "bg-white/5",
                border: latestScore ? scoreBg(latestScore).split(" ")[1] : "border-white/10",
              },
              {
                label: "Average Score",
                value: avgScore ? `${avgScore}/10` : "—",
                icon: BarChart3,
                color: avgScore ? scoreColor(avgScore) : "text-gray-400",
                bg: avgScore ? scoreBg(avgScore).split(" ")[0] : "bg-white/5",
                border: avgScore ? scoreBg(avgScore).split(" ")[1] : "border-white/10",
              },
              {
                label: trend !== null
                  ? (trend > 0 ? "Improving ↑" : trend < 0 ? "Declining ↓" : "Stable →")
                  : "Best Score",
                value: trend !== null
                  ? (trend > 0 ? `+${trend}` : `${trend}`)
                  : (bestScore ? `${bestScore}/10` : "—"),
                icon: trend !== null ? (trend >= 0 ? TrendingUp : TrendingDown) : Sparkles,
                color: trend !== null
                  ? (trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-gray-400")
                  : "text-amber-400",
                bg: trend !== null
                  ? (trend > 0 ? "bg-green-500/10" : trend < 0 ? "bg-red-500/10" : "bg-white/5")
                  : "bg-amber-500/10",
                border: trend !== null
                  ? (trend > 0 ? "border-green-500/20" : trend < 0 ? "border-red-500/20" : "border-white/10")
                  : "border-amber-500/20",
              },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`glass-card border ${border} rounded-2xl p-5`}>
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Empty State ── */}
        {filteredReports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 glass-card border border-white/10 rounded-[3rem]"
          >
            <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary-500/20">
              <FileText className="h-10 w-10 text-primary-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No reports found</h3>
            <p className="text-gray-400 mb-10 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? "No reports match your search. Try a different filename."
                : "You haven't uploaded any blood reports yet. Your health journey starts here."}
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="px-10 py-4 bg-gradient-to-r from-primary-600 to-secondary-500 text-white rounded-2xl font-bold hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] transition-all flex items-center gap-3 mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              Upload Your First Report
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report, i) => {
                const risk = report.riskLevel ? RISK_CONFIG[report.riskLevel] : null;
                const sc: number | undefined = report.overallScore;
                const abnormal = Array.isArray(report.tests)
                  ? report.tests.filter((t: any) => t.flag !== "normal").length
                  : null;
                const total = Array.isArray(report.tests) ? report.tests.length : null;
                const hasPredictions = Array.isArray(report.futurePredictions) && report.futurePredictions.length > 0;
                const hasMedAlerts = Array.isArray(report.medicationAlerts) && report.medicationAlerts.length > 0;

                return (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => router.push(`/results/${report.id}`)}
                    className="group relative glass-card p-6 cursor-pointer border border-white/10 hover:border-primary-500/30 shadow-sm hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-500 rounded-[2rem] flex flex-col justify-between overflow-hidden"
                  >
                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-bl-[4rem] group-hover:bg-primary-500/10 transition-colors" />

                    <div className="relative">
                      {/* File icon + delete */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-400 border border-primary-500/20 group-hover:scale-110 group-hover:bg-primary-500/20 transition-all duration-300">
                          <FileText className="h-6 w-6" />
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, report.id)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* File name */}
                      <h3
                        className="text-lg font-bold text-white mb-2 truncate group-hover:text-primary-300 transition-colors"
                        title={report.fileName}
                      >
                        {report.fileName}
                      </h3>

                      {/* Date + time */}
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-5">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                          <Calendar className="h-3.5 w-3.5" />
                          {report.createdAt?.toDate?.()
                            ? format(new Date(report.createdAt.toDate()), "MMM dd, yyyy")
                            : "Unknown date"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {report.createdAt?.toDate?.()
                            ? format(new Date(report.createdAt.toDate()), "h:mm a")
                            : ""}
                        </div>
                      </div>

                      {/* Score + Risk row */}
                      {(sc != null || risk) && (
                        <div className="flex items-center gap-2 mb-4">
                          {sc != null && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${scoreBg(sc)} flex-1`}>
                              <TrendingUp className={`h-3.5 w-3.5 ${scoreColor(sc)}`} />
                              <span className="text-xs text-gray-400">Score</span>
                              <span className={`text-sm font-black ml-auto ${scoreColor(sc)}`}>{sc}/10</span>
                            </div>
                          )}
                          {risk && (
                            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${risk.bg} ${risk.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                              <span className={`text-xs font-semibold ${risk.text}`}>{risk.label}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Test breakdown */}
                      {total != null && (
                        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Activity className="h-3 w-3 text-gray-600" />
                            <span>{total} tests</span>
                          </div>
                          {abnormal != null && abnormal > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{abnormal} abnormal</span>
                            </div>
                          )}
                          {abnormal === 0 && (
                            <div className="flex items-center gap-1.5 text-green-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>All normal</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feature badges */}
                      {(hasPredictions || hasMedAlerts) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {hasPredictions && (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              <Brain className="w-3 h-3" /> Predictions
                            </span>
                          )}
                          {hasMedAlerts && (
                            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                              <AlertTriangle className="w-3 h-3" /> Med Alerts
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/6">
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-600 font-bold uppercase tracking-wider">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent-500/60" />
                        <span>Private & Secured</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                        View Details <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Bottom disclaimer */}
        {reports.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 justify-center mt-10 text-gray-600 text-xs"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>All reports are encrypted and visible only to you</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
