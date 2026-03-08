// app/api/analyze-meal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { adminDb, getAdminApp } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
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
  try {
    console.log('[analyze-meal] Step 1: Parsing form data');
    let form: FormData;
    try {
      form = await req.formData();
    } catch (e: any) {
      console.error('[analyze-meal] formData parse error:', e.message);
      return NextResponse.json({ error: `Form parse error: ${e.message}` }, { status: 400 });
    }

    const file = form.get('file') as File | null;
    console.log('[analyze-meal] Step 2: file =', file ? `${file.name} (${file.type}, ${file.size} bytes)` : 'null');

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const fileType = file.type || 'image/jpeg';
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are supported' }, { status: 400 });
    }

    // Auth
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[analyze-meal] Step 3: Verifying token');
    let uid: string;
    try {
      const decoded = await getAdminApp().auth().verifyIdToken(token);
      uid = decoded.uid;
      console.log('[analyze-meal] Step 3: Auth OK, uid=', uid);
    } catch (e: any) {
      console.error('[analyze-meal] Token verify error:', e.message);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Process image
    console.log('[analyze-meal] Step 4: Processing image with sharp');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[analyze-meal] Buffer size:', buffer.length);
    const processedImage = await sharp(buffer)
      .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    const base64 = processedImage.toString('base64');
    console.log('[analyze-meal] Step 4: Image processed, base64 length:', base64.length);

    // Call GPT-4o Vision
    console.log('[analyze-meal] Step 5: Calling OpenAI GPT-4o Vision');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' },
            },
            {
              type: 'text',
              text: `You are a registered dietitian and nutrition expert. Analyze this food image and return ONLY valid JSON — no markdown, no code fences, no extra text.

Estimate nutrition based on what you see in the image. Be realistic about portion sizes.

Return this exact JSON structure:
{
  "foodName": "Descriptive name of the food/meal",
  "servingSize": "Estimated portion (e.g., '1 bowl (~350g)')",
  "confidence": "high|medium|low",
  "calories": 480,
  "macros": {
    "protein": 28,
    "carbs": 52,
    "fat": 14,
    "fiber": 6,
    "sugar": 8,
    "saturatedFat": 4
  },
  "micros": [
    { "name": "Iron", "amount": "3.2", "unit": "mg", "percentDV": 18 },
    { "name": "Vitamin C", "amount": "15", "unit": "mg", "percentDV": 17 },
    { "name": "Calcium", "amount": "120", "unit": "mg", "percentDV": 9 },
    { "name": "Potassium", "amount": "480", "unit": "mg", "percentDV": 10 },
    { "name": "Sodium", "amount": "380", "unit": "mg", "percentDV": 17 }
  ],
  "healthScore": 7,
  "verdict": "Brief 1-2 sentence nutrition assessment",
  "pros": ["Good source of protein", "High in fiber"],
  "cons": ["High in sodium", "Low in vegetables"],
  "tips": ["Add a side salad to boost vitamins", "Reduce portion size by 20% to cut 100 calories"],
  "mealType": "breakfast|lunch|dinner|snack"
}

Rules:
- All macro values must be numbers in grams
- calories must be a number
- healthScore is 1-10 (10 = healthiest)
- percentDV should be realistic based on standard daily values
- If the image is unclear or not food, set confidence to "low" and provide best estimates
- micros array: include 4-6 most relevant micronutrients for this food`,
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    console.log('[analyze-meal] Step 5: OpenAI response received');
    const raw = (completion.choices[0]?.message?.content || '{}')
      .replace(/```json|```/g, '')
      .trim();

    let nutritionData: any;
    try {
      nutritionData = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Failed to parse nutrition data' }, { status: 500 });
    }

    // Save meal log to Firestore
    console.log('[analyze-meal] Step 6: Saving to Firestore');
    const entryId = uuidv4();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    await adminDb
      .collection('mealLogs')
      .doc(`${uid}_${today}`)
      .collection('entries')
      .doc(entryId)
      .set({
        entryId,
        userId: uid,
        date: today,
        loggedAt: FieldValue.serverTimestamp(),
        ...nutritionData,
      });

    // Update daily totals document
    const dailyRef = adminDb.collection('mealLogs').doc(`${uid}_${today}`);
    const dailySnap = await dailyRef.get();

    if (dailySnap.exists) {
      await dailyRef.update({
        totalCalories: FieldValue.increment(nutritionData.calories || 0),
        totalProtein:  FieldValue.increment(nutritionData.macros?.protein || 0),
        totalCarbs:    FieldValue.increment(nutritionData.macros?.carbs || 0),
        totalFat:      FieldValue.increment(nutritionData.macros?.fat || 0),
        mealCount:     FieldValue.increment(1),
        updatedAt:     FieldValue.serverTimestamp(),
      });
    } else {
      await dailyRef.set({
        userId: uid,
        date: today,
        totalCalories: nutritionData.calories || 0,
        totalProtein:  nutritionData.macros?.protein || 0,
        totalCarbs:    nutritionData.macros?.carbs || 0,
        totalFat:      nutritionData.macros?.fat || 0,
        mealCount:     1,
        updatedAt:     FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      entryId,
      ...nutritionData,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err: any) {
    console.error('[API analyze-meal] FATAL ERROR:', err.message);
    console.error('[API analyze-meal] Stack:', err.stack);
    return NextResponse.json({ error: `Server error: ${err.message}`, stack: err.stack }, { status: 500 });
  }
}
