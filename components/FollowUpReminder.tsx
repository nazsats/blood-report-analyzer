// components/FollowUpReminder.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, Calendar, Check, X, Plus, Trash2, Clock } from "lucide-react";
import { db } from "@/lib/firebaseClient";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

interface Reminder {
    id: string;
    label: string;
    date: string;       // ISO date string
    notes?: string;
    done: boolean;
}

interface FollowUpReminderProps {
    reportId: string;
    /** Pre-filled suggestions based on AI markers */
    suggestions?: string[];
}

export default function FollowUpReminder({ reportId, suggestions = [] }: FollowUpReminderProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [label, setLabel] = useState("");
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Load existing reminders from Firestore report doc
    useEffect(() => {
        if (!reportId) return;
        getDoc(doc(db, "reports", reportId)).then(snap => {
            if (snap.exists()) {
                const data = snap.data();
                setReminders(data.reminders || []);
            }
        });
    }, [reportId]);

    const saveReminders = async (updated: Reminder[]) => {
        if (!reportId) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "reports", reportId), { reminders: updated });
        } catch {
            toast.error("Failed to save reminder.");
        } finally {
            setSaving(false);
        }
    };

    const addReminder = async () => {
        if (!label || !date) { toast.error("Please set a name and date."); return; }
        const newReminder: Reminder = {
            id: Date.now().toString(),
            label, date, notes, done: false,
        };
        const updated = [...reminders, newReminder];
        setReminders(updated);
        await saveReminders(updated);
        setLabel(""); setDate(""); setNotes("");
        toast.success("Reminder set!");
    };

    const toggleDone = async (id: string) => {
        const updated = reminders.map(r => r.id === id ? { ...r, done: !r.done } : r);
        setReminders(updated);
        await saveReminders(updated);
    };

    const deleteReminder = async (id: string) => {
        const updated = reminders.filter(r => r.id !== id);
        setReminders(updated);
        await saveReminders(updated);
    };

    const sortedReminders = [...reminders].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const upcoming = sortedReminders.filter(r => !r.done);
    const today = new Date().toISOString().split("T")[0];

    const defaultSuggestions = [
        "Retest blood panel in 8 weeks",
        "Follow-up with GP about abnormal markers",
        "Start new supplement — check progress in 4 weeks",
        "Schedule specialist referral",
    ];

    const allSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

    return (
        <>
            <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(true)}
                className="relative flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary-500/15 border border-primary-500/25 text-primary-300 hover:bg-primary-500/25 transition-all text-sm font-semibold">
                <BellRing className="w-4 h-4" />
                Reminders
                {upcoming.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
                        {upcoming.length}
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md" />

                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
                            style={{ background: "#0f0520", border: "1px solid rgba(124,58,237,0.2)" }}>

                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent" />

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/8 shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                                        <Bell className="w-5 h-5 text-primary-400" /> Follow-Up Reminders
                                    </h2>
                                    <p className="text-gray-500 text-xs mt-1">Track re-tests, appointments, and health goals</p>
                                </div>
                                <button onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Add new reminder */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Add Reminder</h3>
                                    <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                                        placeholder="e.g. Retest Vitamin D in 8 weeks"
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-600 px-4 py-3 rounded-2xl focus:outline-none focus:border-primary-500/50 text-sm" />
                                    <div className="flex gap-3">
                                        <input type="date" value={date} onChange={e => setDate(e.target.value)} min={today}
                                            className="flex-1 bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl focus:outline-none focus:border-primary-500/50 text-sm [color-scheme:dark]" />
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                            onClick={addReminder} disabled={saving}
                                            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-500 text-white text-sm font-bold shadow-lg shadow-primary-600/25 disabled:opacity-50">
                                            <Plus className="w-4 h-4" /> Add
                                        </motion.button>
                                    </div>
                                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                                        placeholder="Notes (optional)"
                                        className="w-full bg-white/5 border border-white/10 text-gray-300 placeholder:text-gray-600 px-4 py-2.5 rounded-2xl focus:outline-none focus:border-primary-500/50 text-xs" />
                                </div>

                                {/* Quick-add suggestions */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Add</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {allSuggestions.map((s, i) => (
                                            <button key={i} onClick={() => setLabel(s)}
                                                className="text-xs px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 hover:bg-primary-500/20 transition-colors">
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Reminders list */}
                                {sortedReminders.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Your Reminders</h3>
                                        <div className="space-y-2.5">
                                            {sortedReminders.map(r => {
                                                const dateObj = new Date(r.date);
                                                const isOverdue = !r.done && dateObj < new Date();
                                                return (
                                                    <div key={r.id} className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${r.done ? "bg-white/2 border-white/5 opacity-50" :
                                                            isOverdue ? "bg-red-500/8 border-red-500/20" :
                                                                "bg-white/4 border-white/8"}`}>
                                                        <button onClick={() => toggleDone(r.id)}
                                                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${r.done ? "bg-accent-500 border-accent-500" : isOverdue ? "border-red-400" : "border-white/20 hover:border-primary-400"}`}>
                                                            {r.done && <Check className="w-3 h-3 text-white" />}
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium ${r.done ? "line-through text-gray-600" : "text-white"}`}>{r.label}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Clock className={`w-3 h-3 ${isOverdue ? "text-red-400" : "text-gray-600"}`} />
                                                                <span className={`text-xs ${isOverdue ? "text-red-400 font-semibold" : "text-gray-500"}`}>
                                                                    {isOverdue ? "Overdue · " : ""}{dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                                </span>
                                                            </div>
                                                            {r.notes && <p className="text-xs text-gray-600 mt-1">{r.notes}</p>}
                                                        </div>
                                                        <button onClick={() => deleteReminder(r.id)}
                                                            className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {reminders.length === 0 && (
                                    <div className="text-center py-8 text-gray-600">
                                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No reminders yet. Add your first one above.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
