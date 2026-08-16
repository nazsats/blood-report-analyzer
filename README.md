# 🩸 Blood Lab — Understand Your Blood Test

**Your lab gives you numbers. Blood Lab gives you sentences.**

**Live at [www.bloodlab.in](https://www.bloodlab.in)** · Android app in closed testing

Upload a photo or PDF of your blood test, and get a plain-English explanation of every
result, what might be causing anything unusual, and what you can actually do about it.

![Blood Lab home page](docs/screenshots/landing-hero.png)

> **Note:** the screenshots below were taken before the August 2026 redesign and
> still show the previous violet theme and the old name. They are accurate about
> what each screen does, not about how it currently looks.

---

## The problem, in one paragraph

You get a blood test. A few days later a PDF arrives full of things like
*"Ferritin: 8 ng/mL"* and *"HbA1c: 6.2%"*. There's a reference range next to each one,
so you can tell something is off — but not **why** it's off, **how serious** it is, or
**what to do next**. Your doctor has ten minutes and will focus on the worst number.
Everything else goes unexplained until, years later, it turns into a real problem.

Blood Lab reads that same report and explains it to you like a patient teacher would.

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

## See it in action

Everything below is a real run on a public sample lab report — a
[Drlogy Complete Blood Count template](https://drlogy.com). The report has 19 markers,
two of them out of range: haemoglobin low at 12.5 g/dL and packed cell volume high at
57.5%. Blood Lab found both.

### 1. Drop in your report

![Upload screen](docs/screenshots/upload.png)

### 2. Get the summary

A health score, a count of what's normal versus what needs attention, a written summary,
your top goals, and the single most important thing to do first.

![Results summary](docs/screenshots/results-summary.png)

### 3. Go through every marker

Each test with your value, the normal range, and a plain-English explanation. Anything
out of range also gets likely causes and a specific plan.

![All test results](docs/screenshots/results-tests.png)

### 4. See it as charts

A breakdown of normal versus flagged results, and a map of how your markers sit relative
to their ranges.

![Charts and visuals](docs/screenshots/results-visuals.png)

### 5. Look ahead

Conditions that could develop based on the pattern across markers — with a timeframe,
the reasoning, and how to prevent each one.

![Future predictions](docs/screenshots/results-predictions.png)

### 6. Eat and live around your results

![Nutrition plan](docs/screenshots/results-nutrition.png)

![Lifestyle plan](docs/screenshots/results-lifestyle.png)

### 7. Check your medicines

If you list what you take, Blood Lab flags known interactions with your lab values.

![Medication alerts](docs/screenshots/results-medications.png)

### The home page

![Home page, full](docs/screenshots/landing-full.png)

---

## Pricing

The first report is free — no card, and you see the full marker breakdown before
deciding whether it is worth paying for. After that, reports are ₹25 each or ₹60
for three, bought through Razorpay (UPI, cards, netbanking).

There is no subscription. Not buying is cancelling.

## What runs on the server

Some things deliberately never touch the browser:

- **Prices** live in `lib/packs.ts`. The client sends a pack id, never an amount,
  so devtools cannot buy three reports for ₹1.
- **Payment verification** checks the HMAC signature, asks Razorpay whether the
  payment actually captured, and refuses to credit an order twice.
- **Entitlement** — subscription, then bought credit, then the one free look —
  is decided from the user document, and only spent once a report completes. A
  blurry photo does not cost a paid credit.
- **Rate limiting** is per user in Firestore rather than in memory, because each
  serverless invocation may be a fresh instance and an in-process counter counts
  nothing.
- **Shared reports** resolve through `/api/share/[shareId]` with the Admin SDK,
  returning an allowlist of fields. The browser never queries the reports
  collection, which is what lets the security rules stay owner-only.

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

### 3. Lock down your database

**Do not skip this.** A new Firebase project often starts in test mode, which leaves
every document readable and writable by anyone on the internet. This repo ships the
rules it actually needs in [`firestore.rules`](firestore.rules) — deploy them before you
put any real data in:

```bash
firebase deploy --only firestore:rules
```

You can check what is currently live under
**Firebase Console → Firestore Database → Rules**. If you see
`allow read, write: if true;`, your database is wide open.

### 4. Start it

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
- Reports are encrypted in transit and at rest. Access control depends entirely on the
  Firestore rules you deploy — see step 3 of the setup above, and check yours
- Anyone holding a share link can open that report, by design. Treat share links as
  public
- There is no automatic deletion yet. You can delete any report yourself from the
  History page.

---

## ⚠️ Important — please read

**Blood Lab is not a doctor and does not give medical advice.**

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
