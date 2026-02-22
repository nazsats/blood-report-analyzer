"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  User, Phone, Calendar, Activity, Heart, Pill,
  AlertCircle, Edit3, Camera, Save, ChevronRight,
  FileText, TrendingUp, Shield, Droplets, Upload,
  Clock, Stethoscope, Brain, Target,
  Mail, Loader2, ArrowLeft
} from "lucide-react";

interface HealthProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: string;
  bloodType: string;
  chronicConditions: string;
  currentMedications: string;
  allergies: string;
  emergencyContact: string;
  profileImageUrl: string;
  isProfileComplete: boolean;
}

interface ReportStats {
  totalReports: number;
  avgScore: number;
  bestScore: number;
  latestRisk: string;
  latestScore: number;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

const defaultProfile: HealthProfile = {
  firstName: "", lastName: "", email: "", phoneNumber: "",
  gender: "", dateOfBirth: "", bloodType: "",
  chronicConditions: "", currentMedications: "", allergies: "",
  emergencyContact: "", profileImageUrl: "", isProfileComplete: false,
};

function calcAge(dob: string): string {
  if (!dob) return "—";
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} yrs`;
}

const RISK_COLORS: Record<string, string> = {
  low: "text-green-400",
  moderate: "text-amber-400",
  high: "text-red-400",
  critical: "text-red-500",
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<HealthProfile>(defaultProfile);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) { router.push("/"); return; }
    if (!user) return;

    const fetchAll = async () => {
      try {
        // Fetch profile
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as Partial<HealthProfile>;
          setProfile(prev => ({ ...prev, ...data, email: user.email || "" }));
          if (!data.firstName) setIsEditing(true);
        } else {
          setIsEditing(true);
        }

        // Fetch reports for stats
        const q = query(
          collection(db, "reports"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const reports = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setRecentReports(reports.slice(0, 3));

        if (reports.length > 0) {
          const completed = reports.filter(r => r.status === "complete" && r.overallScore);
          const scores = completed.map(r => r.overallScore as number);
          setStats({
            totalReports: reports.length,
            avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0,
            bestScore: scores.length ? Math.max(...scores) : 0,
            latestRisk: completed[0]?.riskLevel || "—",
            latestScore: completed[0]?.overallScore || 0,
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchAll();
  }, [user, loading, router]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file || !user) return;
    const toastId = toast.loading("Uploading photo…");
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfile(prev => ({ ...prev, profileImageUrl: url }));
      await setDoc(doc(db, "users", user.uid), { profileImageUrl: url }, { merge: true });
      toast.success("Photo updated!", { id: toastId });
    } catch {
      toast.error("Upload failed", { id: toastId });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { ...profile, isProfileComplete: true, email: user.email }, { merge: true });
      setProfile(prev => ({ ...prev, isProfileComplete: true }));
      setIsEditing(false);
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0414] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-400" />
      </div>
    );
  }

  const scoreColor = (s: number) => s >= 8 ? "text-green-400" : s >= 6 ? "text-secondary-400" : s >= 4 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-[#0a0414] relative pt-24 pb-16 px-4">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-primary-600/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-secondary-600/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold uppercase tracking-widest mb-3">
              <User className="w-3 h-3" /> Health Profile
            </div>
            <h1 className="text-3xl font-black text-white">
              {profile.firstName ? `${profile.firstName}'s Profile` : "My Profile"}
            </h1>
          </div>
          {!isEditing && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-500/15 border border-primary-500/25 text-primary-300 hover:bg-primary-500/25 transition-all text-sm font-semibold">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </motion.button>
          )}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── View Mode ── */}
          {!isEditing && (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* Profile hero card */}
              <div className="glass-card border border-white/10 rounded-3xl p-8">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                      {profile.profileImageUrl ? (
                        <Image src={profile.profileImageUrl} alt="Profile" fill className="object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-primary-400" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center cursor-pointer hover:bg-primary-500 transition-colors shadow-lg">
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }} />
                    </label>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-white">
                      {profile.firstName || profile.lastName
                        ? `${profile.firstName} ${profile.lastName}`.trim()
                        : user?.displayName || "Anonymous User"}
                    </h2>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {profile.email && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                          <Mail className="w-3.5 h-3.5" /> {profile.email}
                        </div>
                      )}
                      {profile.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                          <Phone className="w-3.5 h-3.5" /> {profile.phoneNumber}
                        </div>
                      )}
                      {profile.dateOfBirth && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                          <Calendar className="w-3.5 h-3.5" /> {calcAge(profile.dateOfBirth)}
                        </div>
                      )}
                      {profile.gender && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-sm capitalize">
                          <User className="w-3.5 h-3.5" /> {profile.gender}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Blood type badge */}
                  {profile.bloodType && profile.bloodType !== "Unknown" && (
                    <div className="flex flex-col items-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20 shrink-0">
                      <Droplets className="w-5 h-5 text-red-400 mb-1" />
                      <p className="text-2xl font-black text-red-300">{profile.bloodType}</p>
                      <p className="text-xs text-red-400/60">Blood Type</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Health Stats row */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Reports", value: stats.totalReports, icon: FileText, color: "text-secondary-400", bg: "bg-secondary-500/10", border: "border-secondary-500/20" },
                    { label: "Avg Health Score", value: `${stats.avgScore}/10`, icon: TrendingUp, color: scoreColor(stats.avgScore), bg: "bg-accent-500/10", border: "border-accent-500/20" },
                    { label: "Best Score", value: `${stats.bestScore}/10`, icon: Target, color: scoreColor(stats.bestScore), bg: "bg-primary-500/10", border: "border-primary-500/20" },
                    { label: "Latest Risk", value: stats.latestRisk || "—", icon: Shield, color: RISK_COLORS[stats.latestRisk] || "text-gray-400", bg: "bg-white/5", border: "border-white/10" },
                  ].map(({ label, value, icon: Icon, color, bg, border }) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      className={`glass-card border ${border} rounded-2xl p-5`}>
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <p className={`text-xl font-black ${color} capitalize`}>{value}</p>
                      <p className="text-gray-500 text-xs mt-1">{label}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Medical info grid */}
              <div className="grid md:grid-cols-2 gap-6">

                {/* Health conditions */}
                <div className="glass-card border border-white/10 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" /> Medical History
                  </h3>
                  <InfoRow icon={<Activity className="w-3.5 h-3.5 text-amber-400" />} label="Chronic Conditions"
                    value={profile.chronicConditions || "None reported"} />
                  <InfoRow icon={<Pill className="w-3.5 h-3.5 text-blue-400" />} label="Current Medications"
                    value={profile.currentMedications || "None"} />
                  <InfoRow icon={<AlertCircle className="w-3.5 h-3.5 text-orange-400" />} label="Allergies"
                    value={profile.allergies || "None known"} />
                  <InfoRow icon={<Phone className="w-3.5 h-3.5 text-green-400" />} label="Emergency Contact"
                    value={profile.emergencyContact || "Not set"} />
                </div>

                {/* Recent reports */}
                <div className="glass-card border border-white/10 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-400" /> Recent Reports
                  </h3>
                  {recentReports.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm mb-4">No reports yet</p>
                      <Link href="/upload"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600/80 text-white text-sm font-semibold hover:bg-primary-600 transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Upload Report
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentReports.map((r, i) => (
                        <Link key={i} href={`/results/${r.id}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6 hover:bg-white/8 transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{r.fileName}</p>
                            <p className="text-gray-500 text-xs">
                              {r.createdAt?.toDate?.() ? new Date(r.createdAt.toDate()).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          {r.overallScore && (
                            <span className={`text-sm font-bold ${scoreColor(r.overallScore)} shrink-0`}>{r.overallScore}/10</span>
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                        </Link>
                      ))}
                      <Link href="/history"
                        className="flex items-center justify-center gap-2 text-primary-400 text-xs font-semibold hover:text-primary-300 transition-colors py-2">
                        View all reports <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Upload Report", href: "/upload", icon: Upload, color: "from-primary-600 to-secondary-500", shadow: "shadow-primary-600/20" },
                  { label: "View History", href: "/history", icon: Clock, color: "from-secondary-500 to-cyan-500", shadow: "shadow-secondary-500/20" },
                  { label: "AI Analysis", href: "/upload", icon: Brain, color: "from-purple-600 to-primary-500", shadow: "shadow-purple-600/20" },
                  { label: "Subscription", href: "/subscribe", icon: Stethoscope, color: "from-accent-500 to-emerald-500", shadow: "shadow-accent-500/20" },
                ].map(({ label, href, icon: Icon, color, shadow }) => (
                  <Link key={label} href={href}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg ${shadow} hover:shadow-xl transition-all hover:-translate-y-0.5 text-center`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-bold">{label}</span>
                  </Link>
                ))}
              </div>

            </motion.div>
          )}

          {/* ── Edit Mode ── */}
          {isEditing && (
            <motion.div key="edit" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card border border-white/10 rounded-3xl overflow-hidden">

              {/* Edit header */}
              <div className="flex items-center justify-between p-6 border-b border-white/8">
                <div className="flex items-center gap-3">
                  {profile.isProfileComplete && (
                    <button onClick={() => setIsEditing(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-white">Edit Health Profile</h2>
                    <p className="text-gray-500 text-xs mt-0.5">Your data stays private & encrypted</p>
                  </div>
                </div>
                <Shield className="w-5 h-5 text-green-400" />
              </div>

              <div className="p-6 space-y-8">

                {/* Photo upload */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                      {profile.profileImageUrl ? (
                        <Image src={profile.profileImageUrl} alt="Profile" fill className="object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-primary-400" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-primary-600 flex items-center justify-center cursor-pointer hover:bg-primary-500 transition-colors">
                      <Camera className="w-3 h-3 text-white" />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }} />
                    </label>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Profile Photo</p>
                    <p className="text-gray-500 text-xs mt-0.5">Optional — helps personalise your experience</p>
                  </div>
                </div>

                {/* Personal Information */}
                <section>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField label="First Name" name="firstName" value={profile.firstName} onChange={handleInput} placeholder="John" />
                    <FormField label="Last Name" name="lastName" value={profile.lastName} onChange={handleInput} placeholder="Doe" />
                    <FormField label="Phone Number" name="phoneNumber" value={profile.phoneNumber} onChange={handleInput} placeholder="+1 (555) 000-0000" type="tel" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Gender</label>
                      <select name="gender" value={profile.gender} onChange={handleInput}
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl focus:outline-none focus:border-primary-500/50 text-sm [color-scheme:dark]">
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>
                    <FormField label="Date of Birth" name="dateOfBirth" value={profile.dateOfBirth} onChange={handleInput} type="date" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400">Blood Type</label>
                      <select name="bloodType" value={profile.bloodType} onChange={handleInput}
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl focus:outline-none focus:border-primary-500/50 text-sm [color-scheme:dark]">
                        <option value="">Select blood type</option>
                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Medical Information */}
                <section>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-red-400" /> Medical Information
                  </h3>
                  <div className="space-y-4">
                    <TextAreaField
                      label="Chronic Conditions"
                      name="chronicConditions"
                      value={profile.chronicConditions}
                      onChange={handleInput}
                      placeholder="e.g. Type 2 Diabetes, Hypertension, Thyroid disorder…"
                      hint="This helps the AI give you more accurate, personalised analysis"
                    />
                    <TextAreaField
                      label="Current Medications"
                      name="currentMedications"
                      value={profile.currentMedications}
                      onChange={handleInput}
                      placeholder="e.g. Metformin 500mg, Lisinopril 10mg…"
                      hint="Used to detect medication-lab value interactions in your reports"
                    />
                    <TextAreaField
                      label="Known Allergies"
                      name="allergies"
                      value={profile.allergies}
                      onChange={handleInput}
                      placeholder="e.g. Penicillin, Shellfish, Latex…"
                    />
                    <FormField
                      label="Emergency Contact"
                      name="emergencyContact"
                      value={profile.emergencyContact}
                      onChange={handleInput}
                      placeholder="Name + phone number"
                    />
                  </div>
                </section>

                {/* AI Enhancement tip */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-500/8 border border-primary-500/20">
                  <Brain className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-primary-300 text-sm font-semibold">Improve your AI analysis</p>
                    <p className="text-gray-500 text-xs mt-0.5">Filling in your medications and chronic conditions allows the AI to detect drug-lab interactions and provide much more personalised recommendations when you upload reports.</p>
                  </div>
                </div>

                {/* Save button */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={saveProfile} disabled={saving}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-500 text-white font-bold text-base shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? "Saving…" : "Save Health Profile"}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-white text-sm mt-0.5 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, name, value, onChange, placeholder, type = "text" }:
  { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-400">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-600 px-4 py-3 rounded-2xl focus:outline-none focus:border-primary-500/50 focus:bg-white/8 transition-all text-sm [color-scheme:dark]" />
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder, hint }:
  { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-400">{label}</label>
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
      <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={2}
        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-600 px-4 py-3 rounded-2xl focus:outline-none focus:border-primary-500/50 focus:bg-white/8 transition-all text-sm resize-none" />
    </div>
  );
}
