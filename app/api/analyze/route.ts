// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { adminDb, getAdminApp } from '@/lib/firebaseAdmin';
import sharp from 'sharp';
import { FieldValue } from 'firebase-admin/firestore';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
});

export async function POST(req: NextRequest) {
  const reportId = uuidv4();

  try {
    console.log('STEP 1: Request received');

    const form = await req.formData();
    const file = form.get('file') as File;
    if (!file) {
      console.log('ERROR: No file');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('ERROR: No token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAdminApp().auth().verifyIdToken(token);
      uid = decoded.uid;
      console.log('STEP 2: TOKEN VERIFIED → UID:', uid);
    } catch (e: any) {
      console.error('TOKEN ERROR:', e.message);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('STEP 3: Writing to Firestore...');
    const reportRef = adminDb.collection('reports').doc(reportId);
    await reportRef.set({
      userId: uid,
      fileName: file.name,
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log('STEP 4: Firestore write OK');

    console.log('STEP 5: Processing image with sharp...');
    const buffer = Buffer.from(await file.arrayBuffer());
    const processedImage = await sharp(buffer)
      .resize({ width: 800, fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
    console.log('STEP 6: Image processed');

    const base64 = processedImage.toString('base64');
    console.log('STEP 7: Sending to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      // Inside the openai.chat.completions.create call
messages: [
  {
    role: 'system',
    content: `You are a helpful blood test analyzer. Extract EVERY test you see, even if partial.
Be very lenient with formatting. If a test name or value is unclear, still include it with best guess.
Always return at least 3-10 tests if any are visible.

Return ONLY valid JSON with these fields:
{
  "summary": "Detailed friendly summary (2-4 sentences)",
  "recommendation": "One overall suggestion",
  "overallScore": number between 1-10,
  "tests": array of objects, each with:
    - "test": string (name)
    - "value": number
    - "unit": string or ""
    - "range": string or ""
    - "flag": "normal"|"high"|"low"
    - "explanation": short simple explanation
    - "advice": short tip if abnormal
  "dietTips": array of 4-6 strings
  "dailySchedule": array of 5-7 strings
}

If no tests are detected, return an empty tests array and explain in summary.`
  },
  // ... rest of your messages
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this blood report image thoughtfully.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = (completion.choices[0]?.message?.content || '{}')
      .replace(/```json|```/g, '')
      .trim();

    console.log('STEP 8: OpenAI response:', raw);

    let aiResult: any = { 
      summary: 'Whoops, analysis took a detour!', 
      recommendation: '', 
      overallScore: 5, 
      tests: [], 
      dietTips: [],
      dailySchedule: []
    };
    try {
      aiResult = JSON.parse(raw);
      if (!Array.isArray(aiResult.tests)) aiResult.tests = [];
      if (!Array.isArray(aiResult.dietTips)) aiResult.dietTips = [];
      if (!Array.isArray(aiResult.dailySchedule)) aiResult.dailySchedule = [];
    } catch (e) {
      console.error('JSON Parse failed:', e);
    }

    console.log('STEP 9: Updating Firestore...');
    await reportRef.update({
      status: 'complete',
      summary: aiResult.summary,
      recommendation: aiResult.recommendation,
      overallScore: aiResult.overallScore,
      tests: aiResult.tests,
      dietTips: aiResult.dietTips,
      dailySchedule: aiResult.dailySchedule,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('STEP 10: SUCCESS!');

    // After reportRef.update
const shareId = uuidv4().slice(0, 8); // Short unique ID
await reportRef.update({ shareId });

return NextResponse.json({ success: true, reportId, shareUrl: `https://your-app.com/share/${shareId}` });


  } catch (err: any) {
    console.error('FATAL ERROR:', err.message);
    console.error('STACK:', err.stack);

    try {
      await adminDb.collection('reports').doc(reportId).update({
        status: 'error',
        error: err.message,
      });
    } catch {}

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Remove the generateDietAndSchedule function entirely, as AI now handles it