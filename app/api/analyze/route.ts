// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openaiClient';
import { v4 as uuidv4 } from 'uuid';
import { adminDb, getAdminApp } from '@/lib/firebaseAdmin';
import { ANALYZE_LIMIT, consumeRateLimit } from '@/lib/rateLimit';
import sharp from 'sharp';
import { FieldValue } from 'firebase-admin/firestore';
import { FREE_REPORTS } from '@/lib/packs';

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
    const FREE_UPLOADS = FREE_REPORTS;
    const used: number = userData.freeUploadsUsed ?? 0;
    const isPro: boolean = userData.pro === true;
    const credits: number = userData.credits ?? 0;

    // Three ways to be entitled to a report, in the order we want them spent:
    // an old unlimited subscription, then a bought credit, then the one free
    // look. Credits before the free scan is deliberate — someone who has paid
    // should get the full analysis now, and still have their free one if they
    // ever run out.
    const usingCredit = !isPro && credits > 0;
    const usingFree = !isPro && !usingCredit && used < FREE_UPLOADS;

    if (!isPro && !usingCredit && !usingFree) {
      return NextResponse.json(
        {
          error: 'payment_required',
          message: 'You have used your free report. Buy a report to continue.',
          freeUploadsUsed: used,
          credits,
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

    /**
     * The analysis is two prompts, not one, and they run at the same time.
     *
     * A single call produced the whole report - markers, predictions, diet,
     * lifestyle, supplements - in about 2,400 output tokens. Generation time is
     * roughly linear in output length, so the reader watched a spinner for the
     * entire thing before seeing a single number, and a long report came
     * uncomfortably close to the 60s platform ceiling.
     *
     * Split by what the reader actually came for. CORE is the report itself:
     * every marker, what it means, the summary. PLAN is the advice built on top
     * of it: predictions, food, lifestyle, supplements. Neither needs the
     * other's output, so they run concurrently and the wall clock becomes the
     * longer of the two rather than their sum.
     *
     * The cost is that both calls read the report, so a scanned image goes
     * through vision twice - about Rs 0.45 per report. Deliberate trade: the
     * wait is what people complained about, not the price.
     */
    const isPaid = isPro || usingCredit;

    const PERSONA = `You are a world-class functional medicine physician, clinical nutritionist, and preventive health expert with 20+ years of experience. You analyze blood reports with the precision of a top diagnostician and the empathy of a patient educator.

${patientContext ? `PATIENT CONTEXT:\n${patientContext}\n` : ''}`;

    const CORE_PROMPT = `${PERSONA}

Your task: read this blood report and explain it. Accuracy on the numbers matters more than anything else here.

ANALYSIS REQUIREMENTS

1. EXTRACT EVERY SINGLE TEST MARKER shown in the report. Do NOT skip any tests. Include both normal and abnormal results. If there are 30 tests on the page, you must output exactly 30 objects in the "tests" array.

2. FOR EACH ABNORMAL MARKER, identify the 2-3 most likely ROOT CAUSES specific to this patient (lifestyle, diet, genetics, medication side effects, underlying conditions), and give a PRECISE 30-90 DAY improvement plan referencing the exact value (e.g., "Ferritin of 8 ng/mL to target 50+ ng/mL: iron bisglycinate 25mg with 500mg Vitamin C away from meals").

Return ONLY a single valid JSON object. No markdown, no code fences, no extra text:

{
  "summary": "5-6 sentence professional yet warm summary. Name the 2-3 most significant findings with their values. Explain the pattern you see (e.g., metabolic syndrome cluster). Note what is going well. End with an empowering statement. Reference the patient's context if provided.",
  "recommendation": "The single most impactful action - very specific (e.g., 'Your ferritin is 8 ng/mL - critically low. Start iron bisglycinate 25mg with Vitamin C 500mg at breakfast, away from coffee. Retest in 8 weeks.').",
  "overallScore": 7.2,
  "riskLevel": "low|moderate|high|critical",
  "tests": [
    {
      "test": "Full test name",
      "value": 5.4,
      "unit": "mmol/L",
      "range": "3.9-5.6",
      "flag": "normal|high|low",
      "explanation": "Plain English: what this test measures and what THIS patient's value means clinically. Mention if it is borderline, trending, or severely abnormal.",
      "rootCauses": "2-3 specific mechanistic root causes for THIS patient's abnormal value. Empty string for normal results.",
      "advice": "Specific 30-90 day plan referencing the exact value: dietary change with specific foods, supplement with dose if applicable, lifestyle change, and when to retest. Empty string for normal results."
    }
  ]
}

CRITICAL RULES:
- YOU MUST EXTRACT EVERY SINGLE TEST ITEM. DO NOT SUMMARIZE OR SKIP ANY ROWS. ALL PARAMETERS SHOWN MUST BE IN THE "tests" ARRAY.
- value field must be a NUMBER (never a string)
- Be empathetic - patients are anxious. Acknowledge difficulty where appropriate
- End summary with genuine encouragement
- Never use generic phrases like "eat a balanced diet" - always be specific to the markers
- rootCauses and advice fields: use empty string "" for normal results`;

    const PLAN_PROMPT = `${PERSONA}

Your task: read this blood report and build the ACTION PLAN from it. A colleague is separately writing the marker-by-marker breakdown, so do not repeat it - produce only the forward-looking guidance below.

ANALYSIS REQUIREMENTS

1. FUTURE PREDICTIONS: 2-4 conditions the patient may develop in 3-10 years based on the PATTERN across markers, not individual values. Explain the mechanism clearly.

2. MEDICATION INTERACTIONS: if medications are listed, flag interactions with specific lab values using clinical evidence. Empty array if no medications.

3. SUPPLEMENTS: only where there is clear deficiency or clinical benefit shown by the markers. Include exact dose, form, timing and duration.

4. NUTRITION: every meal suggestion specific to the abnormal markers. Every food item must include WHY it helps.

5. LIFESTYLE: tie every recommendation to a specific marker.

Return ONLY a single valid JSON object. No markdown, no code fences, no extra text:

{
  "futurePredictions": [
    {
      "condition": "Condition name (e.g., Non-alcoholic Fatty Liver Disease)",
      "risk": "low|moderate|elevated|high",
      "timeframe": "e.g., 5-10 years if untreated",
      "reason": "Mechanistic explanation referencing the patient's actual values.",
      "prevention": "The single most effective evidence-based prevention step - be specific."
    }
  ],
  "medicationAlerts": [
    {
      "medication": "Drug name",
      "marker": "Affected lab test name",
      "interaction": "How this drug affects this specific lab value, referencing the patient's actual number.",
      "suggestion": "Specific clinical recommendation."
    }
  ],
  "healthGoals": [
    "Measurable goal tied to a marker (e.g., 'Raise Vitamin D from 18 to 50+ ng/mL in 12 weeks via 4000 IU D3 + K2 daily')",
    "Second measurable goal",
    "Third measurable goal"
  ],
  "nutrition": {
    "focus": "e.g., Anti-inflammatory, Iron-rich and Liver-supportive",
    "breakfast": ["Specific meal + why it helps a specific marker"],
    "lunch": ["Specific meal + why"],
    "dinner": ["Specific meal + why"],
    "snacks": ["Specific snack + why"],
    "avoid": ["Food to avoid + why it worsens a specific marker"]
  },
  "lifestyle": {
    "exercise": "Specific type, frequency and duration tied to markers, with expected effect sizes.",
    "sleep": "Specific sleep recommendation tied to markers.",
    "stress": "Specific stress intervention tied to markers."
  },
  "supplements": [
    {
      "name": "Supplement name + preferred form (e.g., Vitamin D3 as cholecalciferol)",
      "dose": "Specific dose (e.g., 4000 IU daily with a fatty meal)",
      "reason": "Why needed - reference the exact marker value",
      "duration": "e.g., 12 weeks then retest"
    }
  ]
}

CRITICAL RULES:
- futurePredictions: 2-4 items always
- medicationAlerts: [] if no medications provided
- Never use generic phrases like "eat a balanced diet" - always be specific to the markers`;

    // Free readers get a shorter answer, not a worse one: the numbers stay
    // complete and only the prose tightens. Depth is what paying buys.
    const CORE_FREE_BRIEF = `

FREE TIER - LENGTH LIMIT:
Same JSON shape, but concise:
- "tests": still EVERY marker with value, unit, range and flag. This is what the
  reader came for and must never be truncated.
- "explanation": one short sentence per abnormal marker; "" for normal ones.
- "rootCauses" and "advice": one sentence each, not paragraphs.
- "summary": 2-3 sentences, warm and specific to the most notable finding.
Accurate and complete on the numbers, concise on the prose.`;

    const PLAN_FREE_BRIEF = `

FREE TIER - LENGTH LIMIT:
Same JSON shape, but:
- "futurePredictions", "supplements", "medicationAlerts": return [] - these are
  reserved for the full report.
- "nutrition" and "lifestyle": one short item per field.
- "healthGoals": two brief goals.`;

    const corePrompt = isPaid ? CORE_PROMPT : CORE_PROMPT + CORE_FREE_BRIEF;
    const planPrompt = isPaid ? PLAN_PROMPT : PLAN_PROMPT + PLAN_FREE_BRIEF;

    // gpt-4.1 is cheaper than gpt-4o ($2/$8 vs $2.50/$10 per 1M) and newer.
    const parseJson = (text: string) => {
      try {
        return JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch (err) {
        console.error('[API Analyze] JSON parse failed:', err);
        return null;
      }
    };

    const EMPTY_PLAN = {
      futurePredictions: [] as any[],
      medicationAlerts: [] as any[],
      healthGoals: [] as any[],
      nutrition: { focus: '', breakfast: [], lunch: [], dinner: [], snacks: [], avoid: [] },
      lifestyle: { exercise: '', sleep: '', stress: '' },
      supplements: [] as any[],
    };

    console.log(`[API Analyze] Calling OpenAI x2 concurrently (${isPaid ? 'full' : 'free'} tier)...`);
    const startedAt = Date.now();

    // Both requests are issued before either is awaited - that is what makes
    // them concurrent. Awaiting the first here would serialise them and undo
    // the entire point.
    const corePending = getOpenAI().chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: corePrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      // Sized to this call alone rather than the whole report. Measured core
      // output is ~1.6k, so this leaves room for an unusually long marker list.
      max_tokens: isPaid ? 2800 : 1400,
      temperature: 0.1,
    });

    const planPending = getOpenAI().chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: planPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: isPaid ? 1800 : 700,
      temperature: 0.1,
    }).catch((err) => {
      // Swallowed here so a plan failure can never become an unhandled
      // rejection when the core call throws first and nothing ever awaits
      // this. The null is handled where it is consumed.
      console.error('[API Analyze] plan call rejected:', err);
      return null;
    });

    // The core call decides whether this request succeeded at all: without the
    // markers there is no report. Let it reject.
    const coreCompletion = await corePending;
    const core = parseJson(coreCompletion.choices[0]?.message?.content || '{}');

    if (!core || !Array.isArray(core.tests) || core.tests.length === 0) {
      const message = 'We could not read any test results from that file. Try a clearer photo, or upload the PDF instead.';
      await reportRef.update({ status: 'error', error: message });
      return NextResponse.json({ error: message }, { status: 422 });
    }

    // Save the markers the moment they exist, before waiting on the plan. The
    // results page listens with onSnapshot, so anyone already looking at it
    // sees their numbers now rather than after the advice finishes. It also
    // means a plan failure cannot cost the reader the report itself.
    await reportRef.update({
      status: 'partial',
      summary: core.summary ?? '',
      recommendation: core.recommendation ?? '',
      overallScore: core.overallScore ?? 5,
      riskLevel: core.riskLevel ?? 'moderate',
      tests: core.tests,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`[API Analyze] core ready in ${Date.now() - startedAt}ms, ${core.tests.length} markers`);

    // The plan is enrichment. If it fails, the reader still has a complete
    // marker breakdown, which is the part they came for - so this is caught
    // rather than allowed to fail the whole request.
    let plan = EMPTY_PLAN;
    try {
      const planCompletion = await planPending;
      const parsed = planCompletion
        ? parseJson(planCompletion.choices[0]?.message?.content || '{}')
        : null;
      if (parsed) {
        plan = {
          futurePredictions: Array.isArray(parsed.futurePredictions) ? parsed.futurePredictions : [],
          medicationAlerts: Array.isArray(parsed.medicationAlerts) ? parsed.medicationAlerts : [],
          healthGoals: Array.isArray(parsed.healthGoals) ? parsed.healthGoals : [],
          supplements: Array.isArray(parsed.supplements) ? parsed.supplements : [],
          nutrition: parsed.nutrition || EMPTY_PLAN.nutrition,
          lifestyle: parsed.lifestyle || EMPTY_PLAN.lifestyle,
        };
      }
    } catch (planErr) {
      console.error('[API Analyze] plan call failed, keeping core result:', planErr);
    }

    await reportRef.update({
      status: 'complete',
      futurePredictions: plan.futurePredictions,
      medicationAlerts: plan.medicationAlerts,
      healthGoals: plan.healthGoals,
      nutrition: plan.nutrition,
      lifestyle: plan.lifestyle,
      supplements: plan.supplements,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`[API Analyze] complete in ${Date.now() - startedAt}ms`);

    // Spend the free allowance only now, on a report that actually completed.
    // Counting at the start would burn someone's one free look on a blurry
    // photo or an OpenAI timeout — a refund conversation over a free feature.
    // Increment, rather than write used+1, so two requests racing cannot both
    // read 0 and both write 1.
    // Spend the entitlement only now, on a report that actually completed. A
    // blurry photo or an OpenAI timeout must not cost someone a paid credit —
    // that is a refund conversation, and a fair complaint.
    if (usingCredit) {
      await userRef.update({ credits: FieldValue.increment(-1) });
    } else if (usingFree) {
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
