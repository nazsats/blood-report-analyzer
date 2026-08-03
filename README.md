# 🩸 BloodAI — Understand Your Blood Test

**Your lab gives you numbers. BloodAI tells you what they mean.**

Upload a photo or PDF of your blood test, and get a plain-English explanation of every
result, what might be causing anything unusual, and what you can actually do about it.

![BloodAI home page](docs/screenshots/landing-hero.png)

---

## The problem, in one paragraph

You get a blood test. A few days later a PDF arrives full of things like
*"Ferritin: 8 ng/mL"* and *"HbA1c: 6.2%"*. There's a reference range next to each one,
so you can tell something is off — but not **why** it's off, **how serious** it is, or
**what to do next**. Your doctor has ten minutes and will focus on the worst number.
Everything else goes unexplained until, years later, it turns into a real problem.

BloodAI reads that same report and explains it to you like a patient teacher would.

---

## How it works

Three steps, about a minute or two.

| | Step | What happens |
|---|---|---|
| **1** | **Upload** | Drop in a PDF or take a photo of your report. Any lab, any format. |
| **2** | **AI reads it** | GPT-4o Vision pulls out every test on the page — the name, your value, the unit, and the normal range — and marks which ones are high, low, or fine. |
| **3** | **You get a plan** | A summary in plain English, plus food, lifestyle, and supplement suggestions tied to your specific numbers. |

---

## What you actually get

**For every single test on your report** — not just the bad ones:

- What the test measures, in everyday words
- Whether your value is normal, high, or low
- If it's off: the likely reasons **why**, and what happens if you ignore it
- A specific 30–90 day plan that references your actual number
  (not "eat healthier" — more like *"your ferritin is 8, aim for 50+; iron bisglycinate
  25mg with vitamin C, away from coffee; retest in 8 weeks"*)

**And across the whole report:**

- 🎯 **A health score out of 10** so you know roughly where you stand
- 🔮 **Early warnings** — patterns across several markers that suggest what could develop
  in 3–10 years, and how to avoid it
- 💊 **Medication conflicts** — if you list your medicines, it flags known interactions
  with your lab values
- 🥗 **A food plan** — breakfast, lunch, dinner, snacks, and what to avoid, each with a
  reason attached
- 🧘 **Lifestyle guidance** — exercise, sleep, and stress advice linked to specific markers
- 💬 **Ask questions** — chat with an AI about your own results
- 📈 **Track progress** — upload later reports and see your trends on a chart
- 🩺 **A letter for your doctor** — a clean summary you can print and take with you
- 📸 **Meal check** — snap a photo of food and get calories, macros, and a health score

---

## Screenshots

**Home page**

![Home page, full](docs/screenshots/landing-full.png)

**Upload screen** (you need a free account first)

![Upload screen](docs/screenshots/upload.png)

---

## Built with

| Part | What we use |
|---|---|
| Website | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Look and feel | Framer Motion (animation), Recharts (graphs), Lucide (icons) |
| The AI | OpenAI GPT-4o Vision |
| Accounts | Firebase Authentication |
| Database | Cloud Firestore |
| Reading PDFs | pdf.js in the browser, pdf-parse on the server |
| Images | Sharp |
| Payments | Razorpay |

---

## Running it yourself

You'll need [Node.js](https://nodejs.org) 20 or newer, a Firebase project, and an
OpenAI API key.

### 1. Get the code

```bash
git clone https://github.com/nazsats/blood-report-analyzer.git
cd blood-report-analyzer
npm install
```

### 2. Set up your keys

Create a file called `.env` in the main folder:

```env
# ---- Firebase, for the browser ----
# Firebase Console > Project settings > General > Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# ---- Firebase, for the server ----
# Firebase Console > Project settings > Service accounts > Generate new private key.
# Open the downloaded JSON and copy these two values out of it.
# The private key must stay on ONE line, in quotes, with \n where the line breaks were.
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# ---- OpenAI ----
OPENAI_API_KEY=sk-proj-your_key

# ---- Razorpay (only needed for paid plans) ----
RAZORPAY_KEY_ID=your_razorpay_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_id
```

> **Easier alternative for the server keys:** instead of the two `FIREBASE_ADMIN_*`
> values, you can point at the service account file directly and the app will read it:
>
> ```env
> GOOGLE_APPLICATION_CREDENTIALS=C:\full\path\to\service-account.json
> ```

### 3. Start it

```bash
npm run dev
```

Open <http://localhost:3000>.

### If something goes wrong

| What you see | Usually means |
|---|---|
| `Missing FIREBASE_ADMIN_CLIENT_EMAIL` | Your `.env` is missing the server keys from step 2 |
| `Incorrect API key provided` | Your OpenAI key is wrong, expired, or out of credit |
| Upload spins, then fails | Check the terminal running `npm run dev` — the real error prints there |
| Results page stays blank | Your Firestore security rules are probably blocking the read |

---

## Folder layout

```
app/
├── api/
│   ├── analyze/          # Reads a blood report and returns the analysis
│   ├── analyze-meal/     # Reads a food photo and logs the nutrition
│   ├── chat/             # Answers questions about a report
│   └── ...               # Subscription handling
├── upload/               # Where you drop your report in
├── results/[reportId]/   # The analysis, charts, and chat
├── history/              # Your past reports
├── share/[shareId]/      # A read-only link you can send to someone
└── profile/              # Age, sex, medications, conditions
components/               # Shared pieces of the interface
lib/                      # Firebase setup (browser and server)
hooks/                    # Reusable React logic
docs/screenshots/         # The images in this README
```

---

## The API

Both endpoints need a Firebase ID token in an `Authorization: Bearer <token>` header.

### `POST /api/analyze`

Send a blood report as `multipart/form-data`.

| Field | Required | Notes |
|---|---|---|
| `file` | yes | PDF or image. Send it multiple times for multi-page reports. |
| `extractedText` | no | Text already pulled from the PDF in the browser. Speeds things up. |
| `userAge`, `userGender`, `medications` | no | Makes the advice more specific to you. |

Returns `{ success, reportId, shareUrl }`. The full analysis is written to the
`reports/{reportId}` document in Firestore, which the results page listens to live.

### `POST /api/analyze-meal`

Send a food photo as `multipart/form-data` in a `file` field.

Returns food name, calories, macros, micronutrients, a health score out of 10, plus
pros, cons and tips. Also saves the entry to `mealLogs/{uid}_{date}` and updates your
running daily totals.

---

## Where this project is right now

Being straight with you: this is an **early-stage project**, not a finished medical
product.

- It has **not** been clinically validated, and no accuracy study has been published
- It is **not** certified or approved by any medical regulator
- Analysis quality depends on how readable your report is — a clear PDF beats a blurry
  photo every time
- Your reports are encrypted in transit and at rest, and Firebase Authentication ties
  them to your account. There is no automatic deletion yet, but you can delete any
  report yourself from the History page.

---

## ⚠️ Important — please read

**BloodAI is not a doctor and does not give medical advice.**

It is an educational tool that helps you understand what is written on your lab report.
It can be wrong. It can misread a number. It can miss something important.

Never use it to diagnose yourself, and never start, stop, or change a medication or
supplement based on what it says. Always talk to a qualified healthcare professional
about your results — especially if anything is flagged as high, low, or concerning.

If you feel unwell or think something is seriously wrong, contact a doctor or emergency
services immediately.

---

## License

MIT
