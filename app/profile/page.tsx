"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  FaUser, FaPhone, FaMapMarkerAlt, FaIdCard,
  FaFileAlt, FaGraduationCap, FaCar, FaStar,
  FaCheckCircle, FaEdit, FaCamera, FaFileDownload, FaArrowRight, FaArrowLeft,
  FaMagic, FaHotel, FaBriefcase, FaUtensils, FaShoppingCart,
  FaCut, FaMusic, FaConciergeBell, FaUserTie, FaCoffee, FaWineGlass,
  FaGuitar, FaPalette, FaMicrophone, FaVideo, FaInstagram, FaLinkedin,
  FaFacebook, FaTwitter, FaRuler,
  FaChevronLeft, FaChevronRight, FaRunning, FaStore, FaSmile, FaBroom, FaCashRegister, FaShoppingBag, FaBox, FaBullhorn,
  FaDumbbell, FaHandPaper, FaWalking, FaFilm, FaImage, FaPlane, FaKeyboard, FaHeadset,
  FaCalculator, FaHandSparkles, FaSpa
} from "react-icons/fa";
import Image from "next/image";
import toast from "react-hot-toast";

// Profession Categories with Icons
const PROFESSION_CATEGORIES = [
  {
    id: "medical",
    name: "Medical & Health",
    icon: FaUserTie,
    color: "from-blue-500 to-cyan-500",
    subcategories: [
      { id: "doctor", name: "Doctor", icon: FaUserTie },
      { id: "nurse", name: "Nurse", icon: FaUser },
      { id: "pharmacist", name: "Pharmacist", icon: FaBriefcase },
      { id: "therapist", name: "Therapist", icon: FaSpa },
      { id: "technician", name: "Lab Technician", icon: FaBox }
    ]
  },
  {
    id: "office_work",
    name: "Office Work",
    icon: FaBriefcase,
    color: "from-gray-500 to-slate-500",
    subcategories: [
      { id: "admin_assistant", name: "Administrative Assistant", icon: FaUser },
      { id: "receptionist", name: "Receptionist", icon: FaConciergeBell },
      { id: "manager", name: "Manager", icon: FaBriefcase },
      { id: "accountant", name: "Accountant", icon: FaCalculator }
    ]
  },
  {
    id: "lifestyle",
    name: "Lifestyle & Fitness",
    icon: FaDumbbell,
    color: "from-green-500 to-emerald-500",
    subcategories: [
      { id: "trainer", name: "Personal Trainer", icon: FaDumbbell },
      { id: "nutritionist", name: "Nutritionist", icon: FaUtensils },
      { id: "coach", name: "Life Coach", icon: FaStar }
    ]
  },
  {
    id: "other",
    name: "Other",
    icon: FaStar,
    color: "from-purple-500 to-pink-500",
    subcategories: [
      { id: "student", name: "Student", icon: FaGraduationCap },
      { id: "retired", name: "Retired", icon: FaCoffee },
      { id: "freelancer", name: "Freelancer", icon: FaBriefcase }
    ]
  }
];

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  professionCategory: string;
  professionSubcategory: string;
  nationality: string;
  city: string;
  openToWorkIn: string[];
  gender: string;
  dateOfBirth: string;
  languagesSpoken: string[];
  hasInsurance: boolean;
  healthIssues: string;
  introduction: string;
  profileImageUrl: string;
  profilePhotos: string[];
  linkedinUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  isProfileComplete: boolean;
  resumeUrl?: string; // Added resume URL
}

const ProfileContent = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const [currentStep, setCurrentStep] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [profile, setProfile] = useState<Profile>({
    firstName: "", lastName: "", email: "", phoneNumber: "",
    professionCategory: "", professionSubcategory: "",
    nationality: "", city: "", openToWorkIn: [],
    gender: "", dateOfBirth: "", languagesSpoken: [],
    hasInsurance: false, healthIssues: "",
    introduction: "",
    profileImageUrl: "", profilePhotos: [],
    linkedinUrl: "", instagramUrl: "", twitterUrl: "",
    isProfileComplete: false,
    resumeUrl: ""
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    if (user) {
      const fetchData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as Partial<Profile>;
            let photos = data.profilePhotos || [];
            if (photos.length === 0 && data.profileImageUrl) {
              photos = [data.profileImageUrl];
            }
            setProfile(prev => ({ ...prev, ...data, profilePhotos: photos, email: user.email || "" }));
          } else {
            setProfile(prev => ({ ...prev, email: user.email || "" }));
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          toast.error("Failed to load profile.");
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [user, loading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setProfile(prev => ({ ...prev, [name]: checked }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (file: File, index: number) => {
    if (!file || !user) return;

    const toastId = toast.loading("Uploading photo...");
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const newPhotos = [...profile.profilePhotos];
      while (newPhotos.length < index) newPhotos.push("");
      newPhotos[index] = url;

      const updates: any = { profilePhotos: newPhotos };
      if (index === 0) updates.profileImageUrl = url;

      setProfile(prev => ({ ...prev, ...updates }));
      await setDoc(doc(db, "users", user.uid), updates, { merge: true });

      toast.success("Photo uploaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    }
  };

  const handleResumeUpload = async (file: File) => {
    if (!file || !user) return;
    const toastId = toast.loading("Uploading resume...");

    try {
      const storageRef = ref(storage, `resumes/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setProfile(prev => ({ ...prev, resumeUrl: url }));
      await setDoc(doc(db, "users", user.uid), { resumeUrl: url }, { merge: true });

      toast.success("Resume uploaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { ...profile, isProfileComplete: true }, { merge: true });
      toast.success("Profile saved successfully!");
      if (isEditMode) {
        router.push("/profile");
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  if (loading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-16 h-16 border-t-4 border-blue-600 rounded-full"></div>
    </div>;
  }

  // Render View Mode
  if (!isEditMode && profile.isProfileComplete) {
    const category = PROFESSION_CATEGORIES.find(c => c.id === profile.professionCategory);
    const subcategory = category?.subcategories.find(s => s.id === profile.professionSubcategory);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 pt-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-gray-500 mt-2 flex items-center gap-2">
                {subcategory?.icon && <subcategory.icon className="text-blue-500" />}
                {subcategory?.name || category?.name || "User"}
              </p>
            </div>
            <div className="flex gap-3">
              {profile.resumeUrl && (
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <FaFileDownload /> Resume
                </a>
              )}
              <Link href="/profile?edit=true" className="px-6 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors flex items-center gap-2">
                <FaEdit /> Edit Profile
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Photos */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="aspect-square rounded-2xl overflow-hidden relative bg-gray-100">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPhotoIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="w-full h-full relative"
                    >
                      {profile.profilePhotos[currentPhotoIndex] ? (
                        <Image
                          src={profile.profilePhotos[currentPhotoIndex]}
                          alt="Profile"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <FaUser className="h-20 w-20" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Slider Controls */}
                  {profile.profilePhotos.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? profile.profilePhotos.length - 1 : prev - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <FaChevronLeft />
                      </button>
                      <button
                        onClick={() => setCurrentPhotoIndex(prev => prev === profile.profilePhotos.length - 1 ? 0 : prev + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                      >
                        <FaChevronRight />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  {profile.profilePhotos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${idx === currentPhotoIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg">
                <h3 className="font-bold mb-4 flex items-center gap-2"><FaUser className="text-blue-500" /> Personal Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gender</span>
                    <span className="font-medium capitalize">{profile.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nationality</span>
                    <span className="font-medium">{profile.nationality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">City</span>
                    <span className="font-medium">{profile.city}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="lg:col-span-2 space-y-6">
              {profile.introduction && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg">
                  <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><FaFileAlt className="text-blue-500" /> About Me</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {profile.introduction}
                  </p>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><FaCheckCircle className="text-blue-500" /> Preferences & Health</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {profile.healthIssues && (
                    <div className="col-span-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                      <div className="font-medium text-red-600 dark:text-red-400 mb-1">Health Issues</div>
                      <div className="text-sm">{profile.healthIssues}</div>
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between">
                    <span className="text-gray-500">Medical Insurance</span>
                    {profile.hasInsurance ? <FaCheckCircle className="text-green-500" /> : <span className="text-gray-400">No</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Edit/Create Mode
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Progress Bar */}
          <div className="h-2 bg-gray-100">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / 5) * 100}%` }}
            />
          </div>

          <div className="p-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold">What best describes you?</h2>
                <div className="grid grid-cols-2 gap-4">
                  {PROFESSION_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setProfile(prev => ({ ...prev, professionCategory: cat.id }));
                        nextStep();
                      }}
                      className={`p-6 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${profile.professionCategory === cat.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white mb-4`}>
                        <cat.icon className="text-xl" />
                      </div>
                      <div className="font-bold text-lg">{cat.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full"><FaArrowLeft /></button>
                  <h2 className="text-2xl font-bold">Select Specialization</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {PROFESSION_CATEGORIES.find(c => c.id === profile.professionCategory)?.subcategories.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setProfile(prev => ({ ...prev, professionSubcategory: sub.id }));
                        nextStep();
                      }}
                      className={`p-4 rounded-xl border text-left flex items-center gap-4 transition-all hover:border-blue-500 ${profile.professionSubcategory === sub.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                    >
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><sub.icon /></div>
                      <span className="font-medium">{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full"><FaArrowLeft /></button>
                  <h2 className="text-2xl font-bold">Basic Information</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <input type="text" name="firstName" value={profile.firstName} onChange={handleInputChange} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <input type="text" name="lastName" value={profile.lastName} onChange={handleInputChange} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <input type="tel" name="phoneNumber" value={profile.phoneNumber} onChange={handleInputChange} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <select name="gender" value={profile.gender} onChange={handleInputChange} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nationality</label>
                    <input type="text" name="nationality" value={profile.nationality} onChange={handleInputChange} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. American" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City of Residence</label>
                    <input type="text" name="city" value={profile.city} onChange={handleInputChange} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. New York" />
                  </div>
                </div>
                <button onClick={nextStep} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                  Continue <FaArrowRight className="inline ml-2" />
                </button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full"><FaArrowLeft /></button>
                  <h2 className="text-2xl font-bold">Photos & Bio</h2>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium">Profile Photos (Add up to 3)</label>
                  <div className="flex gap-4">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden hover:border-blue-500 transition-colors cursor-pointer bg-gray-50">
                        {profile.profilePhotos[idx] ? (
                          <Image src={profile.profilePhotos[idx]} alt="Upload" fill className="object-cover" />
                        ) : (
                          <FaCamera className="text-gray-400 text-2xl" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.files) handleFileUpload(e.target.files[0], idx);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Resume / CV (Optional)</label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-gray-50">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files) handleResumeUpload(e.target.files[0]);
                      }}
                    />
                    {profile.resumeUrl ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <FaCheckCircle /> <span>Resume Uploaded</span>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <FaFileAlt className="mx-auto text-2xl mb-2" />
                        <span>Click to upload PDF or Docx</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">About You</label>
                  <textarea
                    name="introduction"
                    value={profile.introduction}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Tell us about your health goals, lifestyle, etc."
                  />
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl">
                  <input type="checkbox" name="hasInsurance" checked={profile.hasInsurance} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
                  <label className="text-sm font-medium">I have medical insurance</label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Existing Health Issues (Optional)</label>
                  <input type="text" name="healthIssues" value={profile.healthIssues} onChange={handleInputChange} className="w-full p-3 rounded-xl border bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Diabetes, Hypertension" />
                </div>

                <button onClick={saveProfile} disabled={saving} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  {saving ? "Saving..." : <><FaCheckCircle /> Save Profile</>}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-16 h-16 border-t-4 border-blue-600 rounded-full"></div></div>}>
      <ProfileContent />
    </React.Suspense>
  );
}
