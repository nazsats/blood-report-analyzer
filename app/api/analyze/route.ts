// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { adminDb, getAdminApp } from '@/lib/firebaseAdmin';
import { ANALYZE_LIMIT, consumeRateLimit } from '@/lib/rateLimit';
import sharp from 'sharp';
import { FieldValue } from 'firebase-admin/firestore';

// pdf-parse is loaded on demand, never at module scope. Importing it eagerly pulls in
// @napi-rs/canvas, a native module: if that binary is missing from the deployed bundle
// the require throws while the route module is still being evaluated, so the handler's
// try/catch never runs and every upload — even a plain image that never touches a PDF —
// fails with an opaque HTML 500. Deferring it confines that failure to the one branch
// that actually needs a PDF parsed server-side.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// Without this the platform default (10-15s) kills the function long before a
// vision analysis finishes. 60 is the ceiling on Vercel's Hobby plan; on Pro this
// can go up to 300, which is worth doing for long multi-page reports.
export const maxDuration = 60;
export const runtime = 'nodejs';

const openai = new OpenAI({
  // Kept just under maxDuration so the SDK times out first and we can return a
  // readable JSON error, rather than the platform hard-killing the function and
  // returning an HTML error page.
  timeout: 55000,
  apiKey: process.env.OPENAI_API_KEY,
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  const reportId = uuidv4();
  console.log(`[API Analyze] Starting request ${reportId}`);

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    let decoded: any;
    try {
      decoded = await getAdminApp().auth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Rate limit before anything expensive. A verified token is not a
    // trusted caller: anyone can mint one by signing in, so without this a
    // single account can loop this endpoint and bill us for every iteration.
    const rate = await consumeRateLimit(uid, ANALYZE_LIMIT);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many reports in a short time. Please try again in ${Math.ceil(rate.retryAfter / 60)} minutes.` },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      );
    }

    // Body parsing happens after the caller is known. Reading a multipart
    // upload costs memory and CPU, and doing it first meant an
    // unauthenticated request could spend both before being told no —
    // and could not be rate limited, because rate limiting needs a uid.
    const form = await req.formData() as any;
    const files = form.getAll('file') as File[];
    let extractedText = form.get('extractedText') as string;
    const userAge = form.get('userAge') as string | null;
    const userGender = form.get('userGender') as string | null;
    const medications = form.get('medications') as string | null;

    // A text-based PDF is sent as extracted text with no images attached, so
    // text on its own is a valid submission.
    if (files.length === 0 && !extractedText?.trim()) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    for (const file of files) {
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      if (!isImage && !isPDF) {
        return NextResponse.json({ error: `File type ${file.type} not supported` }, { status: 400 });
      }
    }

    // Fetch user profile for richer personalisation (medications, conditions)
    const userRef = adminDb.collection('users').doc(uid);
    let userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        freeUploadsUsed: 0,
        pro: false,
        email: decoded.email ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
      userDoc = await userRef.get();
    }
    const userData = userDoc.data() || { freeUploadsUsed: 0, pro: false };

    // Free allowance, counted server-side against the uid. The app keeps its
    // own count for deciding which screen to show, but that lives on the
    // device and resets on reinstall — this is the one that holds.
    const FREE_UPLOADS = 1;
    const used: number = userData.freeUploadsUsed ?? 0;
    const isPro: boolean = userData.pro === true;

    if (!isPro && used >= FREE_UPLOADS) {
      return NextResponse.json(
        {
          error: 'free_limit_reached',
          message: 'You have used your free report. Unlock the full analysis to continue.',
          freeUploadsUsed: used,
        },
        { status: 402 },
      );
    }

    // Merge medications from form AND profile for completeness
    const profileMeds = userData.currentMedications || '';
    const profileConditions = userData.chronicConditions || '';
    const allMedications = [medications, profileMeds].filter(Boolean).join(', ');

    const reportRef = adminDb.collection('reports').doc(reportId);
    await reportRef.set({
      userId: uid,
      // Text-only submissions carry the name separately, since there is no file part.
      fileName: files[0]?.name || (form.get('fileName') as string) || 'report.pdf',
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
    });

    let userContent: any[] = [{ type: 'text', text: 'Please analyze this blood report comprehensively.' }];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (isImage) {
        const processedImage = await sharp(buffer)
          .resize({ width: 1536, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 95 })
          .toBuffer();
        const base64 = processedImage.toString('base64');
        userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } });
      } else if (isPDF && !extractedText) {
        // Fallback: If client didn't extract text, do it on the server
        console.log('[API Analyze] Extracting text from PDF on server...');
        try {
          extractedText = await extractPdfText(buffer);
        } catch (pdfErr) {
          // The web client extracts PDF text in the browser, so only a caller that
          // posts a raw PDF reaches this. Fail with something the user can act on
          // rather than letting a parser problem read as a generic server error.
          console.error('[API Analyze] Server-side PDF extraction failed:', pdfErr);
          const message = 'This PDF could not be read on the server. Please upload it as an image, or try a different file.';
          // The report doc is already 'processing' by this point — close it out, or it
          // sits unresolved in the user's history forever.
          await reportRef.update({ status: 'error', error: message });
          return NextResponse.json({ error: message }, { status: 422 });
        }
      }
    }

    if (extractedText) {
      userContent.push({ type: 'text', text: `Extracted report text:\n\n${extractedText}` });
    }

    const patientContext = [
      userAge ? `Patient Age: ${userAge}` : '',
      userGender ? `Patient Gender: ${userGender}` : '',
      allMedications ? `Current Medications: ${allMedications}` : '',
      profileConditions ? `Known Chronic Conditions: ${profileConditions}` : '',
    ].filter(Boolean).join('\n');

    const systemPrompt = `You are a world-class functional medicine physician, clinical nutritionist, and preventive health expert with 20+ years of experience. You analyze blood reports with the precision of a top diagnostician and the empathy of a patient educator.

${patientContext ? `PATIENT CONTEXT:\n${patientContext}\n` : ''}

Your task: produce a DEEPLY PERSONALISED, CLINICALLY RICH health analysis that goes beyond generic advice.

═══════════════════════════════════════
ANALYSIS REQUIREMENTS
═══════════════════════════════════════

1. EXTRACT EVERY SINGLE TEST MARKER shown in the report. Do NOT skip any tests. Include both normal and abnormal results. If there are 30 tests on the page, you must output exactly 30 objects in the "tests" array.

2. FOR EACH ABNORMAL MARKER, identify:
   - The 2-3 most likely ROOT CAUSES specific to this patient (e.g., lifestyle, diet, genetics, medication side effects, underlying conditions)
   - The FUTURE HEALTH RISK if this marker stays unaddressed (be specific: "persistent LDL >190 increases cardiovascular event risk by ~30% over 10 years")
   - A PRECISE 30-90 DAY IMPROVEMENT PLAN referencing the exact value (e.g., "Ferritin of 8 ng/mL → target 50+ ng/mL: take iron bisglycinate 25mg with 500mg Vitamin C away from meals")

3. FUTURE PREDICTIONS: Generate 2-4 conditions the patient may develop in 3-10 years based on the PATTERN of markers — not just individual values. Explain the mechanism clearly.

4. MEDICATION INTERACTIONS: If medications are listed, flag interactions with specific lab values using clinical evidence (e.g., "Metformin depletes B12 — your B12 of 180 pg/mL may reflect this"). Empty array if no medications.

5. SUPPLEMENTS: Only recommend supplements where there is clear deficiency or clinical benefit shown by the markers. Include exact dose, form (e.g., methylcobalamin vs cyanocobalamin), timing, and duration.

6. NUTRITION: Make every meal suggestion specific to the abnormal markers. Every food item must include WHY it helps (e.g., "Lentils — high in folate, which raises your low B12 pathway efficiency").

7. LIFESTYLE: Tie every recommendation to a specific marker (e.g., "Zone 2 cardio 3×/week — proven to lower LDL-C by 5-10% and improve insulin sensitivity for your elevated glucose").

Return ONLY a single valid JSON object. No markdown, no code fences, no extra text:

{
  "summary": "5-6 sentence professional yet warm summary. Name the 2-3 most significant findings with their values. Explain the pattern you see (e.g., metabolic syndrome cluster). Note what is going well. End with an empowering statement. Reference the patient's context if provided.",
  "recommendation": "The single most impactful action — very specific (e.g., 'Your ferritin is 8 ng/mL — critically low. Start iron bisglycinate 25mg with Vitamin C 500mg at breakfast, away from coffee. Retest in 8 weeks. This alone may resolve your fatigue within 3-4 weeks.').",
  "overallScore": 7.2,
  "riskLevel": "low|moderate|high|critical",
  "tests": [ // This array MUST contain an object for EVERY single test parameter found in the report. Normal or abnormal, do not skip any.
    {
      "test": "Full test name",
      "value": 5.4,
      "unit": "mmol/L",
      "range": "3.9-5.6",
      "flag": "normal|high|low",
      "explanation": "Plain English: what this test measures and what THIS patient's value means clinically. Mention if it's borderline, trending, or severely abnormal.",
      "rootCauses": "2-3 specific root causes for THIS patient's abnormal value. Be mechanistic (e.g., 'Your HbA1c of 6.2% is driven by insulin resistance, likely from excess refined carbohydrate intake and sedentary desk work — this is an early warning sign'). Leave empty string for normal results.",
      "advice": "Specific 30-90 day plan referencing the exact value. Include: (1) dietary changes with specific foods, (2) supplement if applicable with dose, (3) lifestyle change, (4) when to retest. Only for abnormal results."
    }
  ],
  "futurePredictions": [
    {
      "condition": "Condition name (e.g., Non-alcoholic Fatty Liver Disease)",
      "risk": "low|moderate|elevated|high",
      "timeframe": "e.g., 5-10 years if untreated",
      "reason": "Mechanistic explanation: 'Your ALT of 52 U/L combined with triglycerides of 210 mg/dL and glucose of 105 mg/dL forms a metabolic pattern associated with hepatic fat accumulation. Without dietary change, NAFLD probability is elevated over the next decade.'",
      "prevention": "The single most effective evidence-based prevention step — be specific."
    }
  ],
  "medicationAlerts": [
    {
      "medication": "Drug name",
      "marker": "Affected lab test name",
      "interaction": "Clinical explanation of how this drug affects this specific lab value, referencing the patient's actual number (e.g., 'Metformin interferes with ileal B12 absorption — your B12 of 180 pg/mL is below the 200 pg/mL threshold and may worsen over time on this medication').",
      "suggestion": "Specific clinical recommendation (e.g., 'Discuss B12 supplementation with your prescriber — methylcobalamin 1000mcg sublingual daily is often recommended for patients on long-term Metformin')."
    }
  ],
  "healthGoals": [
    "Measurable goal tied to a marker (e.g., 'Raise Vitamin D from 18 to 50+ ng/mL in 12 weeks via 4000 IU D3 + K2 daily')",
    "Second measurable goal",
    "Third measurable goal"
  ],
  "nutrition": {
    "focus": "e.g., Anti-inflammatory, Iron-rich & Liver-supportive",
    "breakfast": ["Specific meal + why (e.g., 'Spinach omelette with pumpkin seeds — iron, folate, and zinc to address your deficiencies')"],
    "lunch": ["Specific meal + why"],
    "dinner": ["Specific meal + why"],
    "snacks": ["Specific snack + why"],
    "avoid": ["Food to avoid + why it worsens a specific marker (e.g., 'Alcohol — directly elevates ALT/AST and worsens your liver enzymes')"]
  },
  "lifestyle": {
    "exercise": "Specific type, frequency, duration — tied to markers (e.g., 'Zone 2 cardio (brisk walk/cycling at 60-70% max HR) 4×/week for 35 min — shown to lower LDL-C by 8% and improve HbA1c by 0.3-0.5% over 12 weeks')",
    "sleep": "Specific sleep recommendation tied to markers (e.g., '7.5-8.5 hours of sleep is critical — sleep deprivation raises cortisol, which drives glucose up and explains your borderline HbA1c; use a consistent sleep schedule and limit blue light after 9pm')",
    "stress": "Specific stress intervention tied to markers (e.g., 'Your elevated cortisol pattern (high glucose + low DHEA if tested) responds strongly to diaphragmatic breathing 10 min/day or yoga — proven to reduce fasting glucose by 10-15 mg/dL in 8 weeks')"
  },
  "supplements": [
    {
      "name": "Supplement name + preferred form (e.g., Vitamin D3 as cholecalciferol)",
      "dose": "Specific dose (e.g., 4000 IU daily with fatty meal)",
      "reason": "Why needed — reference exact marker value (e.g., 'Your Vitamin D is 18 ng/mL — deficient. Optimal is 50-80 ng/mL. At this level, immune function, bone density, and mood regulation are impaired.')",
      "duration": "e.g., 12 weeks then retest; ongoing if deficiency persists"
    }
  ]
}

CRITICAL RULES:
- YOU MUST EXTRACT EVERY SINGLE TEST ITEM. DO NOT SUMMARIZE OR SKIP ANY ROWS. ALL PARAMETERS SHOWN IN THE IMAGE MUST BE IN THE "tests" ARRAY.
- value field must be a NUMBER (never a string)
- futurePredictions: 2-4 items always
- medicationAlerts: [] if no medications provided
- Be empathetic — patients are anxious. Acknowledge difficulty where appropriate
- End summary with genuine encouragement
- Never use generic phrases like "eat a balanced diet" — always be specific to the markers
- rootCauses and advice fields: use empty string "" for normal results`;

    // Free readers get a deliberately shorter answer. It is not a worse one:
    // it leads with what is most striking about their results, which is what
    // makes someone want the full breakdown. Paying for depth is an easier
    // decision than paying to remove an artificial limit.
    //
    // One prompt, not two. A second full medical prompt would drift out of
    // sync with this one within a couple of edits, and a blood report is not
    // the place to discover that the free tier is following stale rules.
    const isPaid = userData.pro === true;

    const FREE_TIER_BRIEF = `

FREE TIER — LENGTH LIMIT:
Return the same JSON shape, but keep it brief and high-signal:
- "tests": still include EVERY marker found, with value, unit, range and status.
  This is the part the reader came for and must never be truncated.
- Explanations: one short sentence per abnormal marker; empty string "" for
  normal ones.
- "futurePredictions", "supplements", "medicationAlerts": return [] — these are
  reserved for the full report.
- "advice": one sentence per field, not a paragraph.
- "summary": 2-3 sentences, warm and specific to the most notable finding.
Be accurate and complete on the numbers, concise on the prose.`;

    const finalPrompt = isPaid ? systemPrompt : systemPrompt + FREE_TIER_BRIEF;

    // gpt-4.1 is cheaper than gpt-4o ($2/$8 vs $2.50/$10 per 1M) and newer.
    // max_tokens caps the worst case rather than describing the usual one:
    // measured output is ~2.4k, so 4000 leaves headroom for a report with an
    // unusually long marker list without leaving an 8000-token bill exposed.
    console.log(`[API Analyze] Calling OpenAI (${isPaid ? 'full' : 'free'} tier)…`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: finalPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: isPaid ? 4000 : 1600,
      temperature: 0.1,
    });

    const raw = (completion.choices[0]?.message?.content || '{}')
      .replace(/```json|```/g, '')
      .trim();

    let aiResult: any = {
      summary: 'Analysis failed to generate structure.',
      recommendation: '',
      overallScore: 5,
      riskLevel: 'moderate',
      tests: [],
      futurePredictions: [],
      medicationAlerts: [],
      healthGoals: [],
      nutrition: { focus: '', breakfast: [], lunch: [], dinner: [], snacks: [], avoid: [] },
      lifestyle: { exercise: '', sleep: '', stress: '' },
      supplements: [],
    };

    try {
      const parsed = JSON.parse(raw);
      aiResult = {
        ...aiResult,
        ...parsed,
        tests: Array.isArray(parsed.tests) ? parsed.tests : [],
        futurePredictions: Array.isArray(parsed.futurePredictions) ? parsed.futurePredictions : [],
        medicationAlerts: Array.isArray(parsed.medicationAlerts) ? parsed.medicationAlerts : [],
        healthGoals: Array.isArray(parsed.healthGoals) ? parsed.healthGoals : [],
        supplements: Array.isArray(parsed.supplements) ? parsed.supplements : [],
        nutrition: parsed.nutrition || { focus: '', breakfast: [], lunch: [], dinner: [], snacks: [], avoid: [] },
        lifestyle: parsed.lifestyle || { exercise: '', sleep: '', stress: '' },
      };
    } catch (parseError) {
      console.error('[API Analyze] JSON parse error, using defaults:', parseError);
      console.error('[API Analyze] Raw content that failed to parse:', raw);
    }

    await reportRef.update({
      status: 'complete',
      summary: aiResult.summary,
      recommendation: aiResult.recommendation,
      overallScore: aiResult.overallScore,
      riskLevel: aiResult.riskLevel,
      tests: aiResult.tests,
      futurePredictions: aiResult.futurePredictions,
      medicationAlerts: aiResult.medicationAlerts,
      healthGoals: aiResult.healthGoals,
      nutrition: aiResult.nutrition,
      lifestyle: aiResult.lifestyle,
      supplements: aiResult.supplements,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Spend the free allowance only now, on a report that actually completed.
    // Counting at the start would burn someone's one free look on a blurry
    // photo or an OpenAI timeout — a refund conversation over a free feature.
    // Increment, rather than write used+1, so two requests racing cannot both
    // read 0 and both write 1.
    if (!isPro) {
      await userRef.update({ freeUploadsUsed: FieldValue.increment(1) });
    }

    const shareId = uuidv4();
    await reportRef.update({ shareId });

    // Derive the origin from the request so share links work on every deployment
    // (local, preview, production) instead of the placeholder host this used to emit.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;

    return NextResponse.json({ success: true, reportId, shareUrl: `${origin}/share/${shareId}` });

  } catch (err: any) {
    console.error('[API Analyze] FATAL ERROR:', err);

    // The OpenAI client is set to give up just before the function's own 60s
    // budget, so this is the path a slow analysis takes. Say something the user
    // can act on instead of leaving the report stuck on "processing".
    const timedOut =
      err?.name === 'APIConnectionTimeoutError' ||
      err?.name === 'AbortError' ||
      /timeout|timed out/i.test(err?.message || '');

    const message = timedOut
      ? 'The analysis took too long to finish. This usually means the report was very long or the scan was hard to read — try uploading fewer pages at a time, or a clearer scan.'
      : `Server error: ${err.message}`;

    try {
      await adminDb.collection('reports').doc(reportId).update({
        status: 'error',
        error: message,
      });
    } catch (dbErr: any) {
      console.error('[API Analyze] Failed to log error to DB:', dbErr.message);
    }
    return NextResponse.json({ error: message }, { status: timedOut ? 504 : 500 });
  }
}
