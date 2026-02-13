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
    const form = await req.formData();
    const file = form.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are supported (JPG, PNG, etc.)' }, { status: 400 });
    }

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    let decoded: any;
    try {
      decoded = await getAdminApp().auth().verifyIdToken(token);
      uid = decoded.uid;
    } catch (e: any) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check user doc and pro/free limit
    const userRef = adminDb.collection('users').doc(uid);
    let userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        freeUploadsUsed: 0,
        pro: false,
        email: decoded.email,
        createdAt: FieldValue.serverTimestamp(),
      });
      userDoc = await userRef.get(); // Refresh
    }
    const userData = userDoc.data() || { freeUploadsUsed: 0, pro: false };

    if (!userData.pro && userData.freeUploadsUsed >= 1) {
      return NextResponse.json({ error: 'Upgrade to Pro for more uploads' }, { status: 403 });
    }

    // Proceed with report creation
    const reportRef = adminDb.collection('reports').doc(reportId);
    await reportRef.set({
      userId: uid,
      fileName: file.name,
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const processedImage = await sharp(buffer)
      .resize({ width: 800, fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = processedImage.toString('base64');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a top-tier functional medicine doctor and nutritionist. Analyze this blood report.
          
EXTRACT ALL TESTS. Be precise.

Then, create a highly personalized "Wellness Protocol" based SPECIFICALLY on the abnormal markers.
If Vitamin D is low, recommend sunshine/supplements. If LDL is high, recommend fiber/oats. Be specific.

Return ONLY valid JSON in this format:
{
  "summary": "Warm, encouraging, but professional summary (3-4 sentences).",
  "recommendation": "The single most impactful thing they can do based on this report.",
  "overallScore": number 1-10,
  "tests": [
    { "test": "Test Name", "value": "Value", "unit": "Unit", "range": "Range", "flag": "normal"|"high"|"low", "explanation": "Simple explanation", "advice": "Specific actionable tip" }
  ],
  "healthGoals": ["Goal 1", "Goal 2", "Goal 3"],
  "nutrition": {
    "focus": "e.g. Anti-inflammatory & Low Sugar",
    "breakfast": ["Option 1", "Option 2"],
    "lunch": ["Option 1", "Option 2"],
    "dinner": ["Option 1", "Option 2"],
    "snacks": ["Option 1"],
    "avoid": ["Food A", "Food B"]
  },
  "lifestyle": {
    "exercise": "Specific workout recommendation (e.g. 'Zone 2 Cardio for heart health')",
    "sleep": "Sleep hygiene tip",
    "stress": "Stress management tip"
  },
  "supplements": [
    { "name": "Supplement Name", "reason": "Why needed (based on X marker)" }
  ]
}
`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this blood report and give me a detailed protocol.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 3000,
      temperature: 0.4,
    });

    const raw = (completion.choices[0]?.message?.content || '{}')
      .replace(/```json|```/g, '')
      .trim();

    let aiResult: any = {
      summary: 'Analysis failed to generate structure.',
      recommendation: '',
      overallScore: 5,
      tests: [],
      healthGoals: [],
      nutrition: { breakfast: [], lunch: [], dinner: [], snacks: [], avoid: [] },
      lifestyle: { exercise: '', sleep: '', stress: '' },
      supplements: []
    };
    try {
      aiResult = JSON.parse(raw);
      // Safety checks for new structure
      if (!aiResult.nutrition) aiResult.nutrition = { breakfast: [], lunch: [], dinner: [], snacks: [], avoid: [] };
      if (!aiResult.lifestyle) aiResult.lifestyle = { exercise: '', sleep: '', stress: '' };
      if (!Array.isArray(aiResult.supplements)) aiResult.supplements = [];
      if (!Array.isArray(aiResult.healthGoals)) aiResult.healthGoals = [];
    } catch (e) { }

    await reportRef.update({
      status: 'complete',
      summary: aiResult.summary,
      recommendation: aiResult.recommendation,
      overallScore: aiResult.overallScore,
      tests: aiResult.tests,
      healthGoals: aiResult.healthGoals,
      nutrition: aiResult.nutrition,
      lifestyle: aiResult.lifestyle,
      supplements: aiResult.supplements,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const shareId = uuidv4();
    await reportRef.update({ shareId });

    // Increment free upload count if not pro (transactional)
    if (!userData.pro) {
      await adminDb.runTransaction(async (transaction) => {
        const freshUserDoc = await transaction.get(userRef);
        const freshData = freshUserDoc.data() || { freeUploadsUsed: 0 };
        transaction.update(userRef, { freeUploadsUsed: freshData.freeUploadsUsed + 1 });
      });
    }

    return NextResponse.json({ success: true, reportId, shareUrl: `https://your-app.com/share/${shareId}` });

  } catch (err: any) {
    try {
      await adminDb.collection('reports').doc(reportId).update({
        status: 'error',
        error: err.message,
      });
    } catch { }

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}