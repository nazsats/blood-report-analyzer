# 🩸 BloodAI — Decode Your Blood Report with AI

**BloodAI** is a premium, AI-powered health intelligence platform that transforms complex blood test reports into clear, actionable health insights. Using GPT-4o Vision, it analyzes your lab results in seconds and provides a personalized wellness protocol — now with an integrated **AI Meal Analyzer** to track your daily nutrition.

---

## ✨ Features

### 🔬 1. Instant AI Blood Report Analysis
Our GPT-4o Vision-powered engine processes your PDF or image-based blood reports in under 30 seconds. It automatically identifies biomarkers, extracts numerical values, and flags any results falling outside standard clinical ranges.

### 💬 2. Plain English Explanations
BloodAI translates complex markers (like *Ferritin*, *HbA1c*, or *LDL*) into friendly, human-readable language. You'll understand not just *what* your levels are, but *why* they matter.

### 🥗 3. Personalized Wellness & Diet Protocols
Based on your unique blood chemistry, the AI generates a comprehensive health plan:
- **Meal Plans**: Specific breakfast, lunch, and dinner suggestions to improve flagged markers.
- **Supplement Stacks**: Targeted recommendations (e.g., Vitamin D3+K2) with dosage guidelines.
- **Lifestyle Tips**: Daily habits (morning sunlight, specific sleep windows) to optimize your health score.

### 📸 4. AI Meal Analyzer *(New!)*
Snap a photo of any meal and let GPT-4o Vision identify it and return:
- **Calories & Macros**: Protein, carbs, fat, fiber, sugar, saturated fat.
- **Key Micronutrients**: Iron, Vitamin C, Calcium, Potassium, Sodium, and more — with % Daily Value.
- **Health Score** (1–10), a nutrition verdict, pros, cons, and improvement tips.
- **Daily Log**: Meals are logged per user per day in Firestore, with running totals for calories, protein, carbs, and fat.

### 📈 5. Health Score & Trend Tracking
Receive an overall "Health Score" out of 10. As you upload subsequent reports, BloodAI provides interactive charts showing your progress over time.

### 🔒 6. Secure & Private
Your health data is sensitive. We use Firebase Auth for identity management and Firestore security rules to ensure data is accessible only by you.

---

## 🛠️ Tech Stack

### Frontend & UI
| Tool | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org/) (App Router) | Core framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| [Recharts](https://recharts.org/) | Charts & trend graphs |
| [Lucide Icons](https://lucide.dev/) | Icon library |

### Backend & AI
| Tool | Purpose |
|---|---|
| [OpenAI GPT-4o](https://openai.com/) | Blood report & meal vision analysis |
| [Firebase Auth](https://firebase.google.com/docs/auth) | User authentication |
| [Cloud Firestore](https://firebase.google.com/docs/firestore) | Database (reports & meal logs) |
| [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) | Server-side Firestore access |
| [Sharp](https://sharp.pixelplumbing.com/) | Server-side image processing |
| [Razorpay](https://razorpay.com/) | Payments |

---

## 📁 Project Structure

```
app/
├── api/
│   ├── analyze/          # Blood report analysis endpoint (GPT-4o Vision)
│   └── analyze-meal/     # Meal photo analysis & nutrition logging endpoint
├── results/              # Analysis results & health score page
├── history/              # Past report tracking
├── upload/               # Document upload & processing
└── profile/              # User profile page
components/               # Reusable UI components
lib/                      # Firebase client & admin configurations
hooks/                    # Custom React hooks (Auth, etc.)
public/                   # Static assets
```

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/nazsats/blood-report-analyzer.git
cd blood-report-analyzer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=your_project
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OpenAI
OPENAI_API_KEY=your_openai_key

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app in action.

---

## 📡 API Endpoints

### `POST /api/analyze`
Analyzes a blood test report (PDF or image).
- **Auth**: Bearer token required
- **Body**: `multipart/form-data` with `file` field
- **Returns**: Parsed biomarkers, health score, diet & supplement recommendations

### `POST /api/analyze-meal`
Analyzes a food photo and logs nutrition data.
- **Auth**: Bearer token required
- **Body**: `multipart/form-data` with `file` field (image only)
- **Returns**: `{ foodName, calories, macros, micros, healthScore, verdict, pros, cons, tips, mealType }`
- **Side effect**: Saves entry to `mealLogs/{uid}_{date}/entries/{entryId}` and updates daily totals in Firestore

---

## 📄 License
This project is licensed under the MIT License.

---

*⚠️ Disclaimer: BloodAI is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional.*