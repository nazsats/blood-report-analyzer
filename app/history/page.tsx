// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileText, Calendar, TrendingUp, ChevronRight, Clock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "reports"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your health history...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-4">
            Your Health Archive
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Track your progress and access past reports instantly.
          </p>
        </div>

        {reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700"
          >
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No reports found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              You haven't uploaded any blood reports yet. Start your journey to better health today.
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all hover:shadow-lg shadow-primary-500/30"
            >
              Upload Your First Report
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => router.push(`/results/${report.id}`)}
                className="group relative bg-white dark:bg-gray-900 rounded-3xl p-6 cursor-pointer border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]" title={report.fileName}>
                      {report.fileName}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      {report.createdAt?.toDate?.() ? format(new Date(report.createdAt.toDate()), "MMM dd, yyyy • h:mm a") : "Unknown date"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {report.overallScore && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Health Score</span>
                      <div className="flex items-center gap-1.5 font-bold text-primary-600 dark:text-primary-400">
                        <TrendingUp className="h-4 w-4" />
                        {report.overallScore}/10
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 px-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Private & Encrypted</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}