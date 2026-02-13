// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileText, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Your Report History
      </h1>

      {reports.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-20 w-20 mx-auto mb-6 text-gray-400" />
          <p className="text-xl text-gray-600 dark:text-gray-400">No reports yet.</p>
          <button onClick={() => router.push("/upload")} className="mt-6 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            Upload Your First Report
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => router.push(`/results/${report.id}`)}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="font-bold text-lg truncate mb-2">{report.fileName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <Calendar className="h-4 w-4" />
                {report.createdAt?.toDate?.() ? format(new Date(report.createdAt.toDate()), "MMM dd, yyyy") : "Unknown date"}
              </div>
              {report.overallScore && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  <span className="font-semibold text-blue-700 dark:text-blue-200">
                    Score: {report.overallScore}/10
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}