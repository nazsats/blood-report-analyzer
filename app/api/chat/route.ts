// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAdminApp } from '@/lib/firebaseAdmin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { reportId, messages } = await req.json();

    // Load full report data from Firestore for rich context
    let reportData: any = {};
    if (reportId) {
      const reportDoc = await getAdminApp().firestore().collection('reports').doc(reportId).get();
      if (reportDoc.exists) {
        reportData = reportDoc.data() || {};
      }
    }

    // Build a structured summary of the report for the AI
    const testsSummary = Array.isArray(reportData.tests)
      ? reportData.tests.map((t: any) =>
        `- ${t.test}: ${t.value} ${t.unit} (range: ${t.range}) [${t.flag?.toUpperCase()}]${t.flag !== 'normal' ? ` — ${t.advice || ''}` : ''}`
      ).join('\n')
      : 'No test data available';

    const predictionsSummary = Array.isArray(reportData.futurePredictions)
      ? reportData.futurePredictions.map((p: any) => `- ${p.condition} (${p.risk} risk): ${p.reason}`).join('\n')
      : '';

    const medicationAlerts = Array.isArray(reportData.medicationAlerts) && reportData.medicationAlerts.length > 0
      ? reportData.medicationAlerts.map((m: any) => `- ${m.medication} ↔ ${m.marker}: ${m.interaction}`).join('\n')
      : 'None';

    const supplementsSummary = Array.isArray(reportData.supplements)
      ? reportData.supplements.map((s: any) => `- ${s.name} ${s.dose || ''}: ${s.reason}`).join('\n')
      : '';

    const systemPrompt = `You are Dr. AI, a warm, empathetic medical assistant helping a patient understand their blood report results. You have deep knowledge of functional medicine, nutrition, and preventive health.

═══════════════════════════════════════
PATIENT'S BLOOD REPORT DATA
═══════════════════════════════════════

OVERALL SCORE: ${reportData.overallScore ?? '?'}/10 | RISK LEVEL: ${reportData.riskLevel ?? 'unknown'}

AI SUMMARY:
${reportData.summary || 'Not available'}

ALL TEST RESULTS:
${testsSummary}

FUTURE HEALTH PREDICTIONS:
${predictionsSummary || 'Not available'}

MEDICATION INTERACTIONS:
${medicationAlerts}

SUPPLEMENTS RECOMMENDED:
${supplementsSummary || 'None recommended'}

NUTRITION FOCUS: ${reportData.nutrition?.focus || 'General balanced diet'}

LIFESTYLE RECOMMENDATIONS:
- Exercise: ${reportData.lifestyle?.exercise || 'N/A'}
- Sleep: ${reportData.lifestyle?.sleep || 'N/A'}
- Stress: ${reportData.lifestyle?.stress || 'N/A'}

═══════════════════════════════════════

CONVERSATION GUIDELINES:
1. Reference SPECIFIC VALUES from the report when answering (e.g., "Your Vitamin D is 18 ng/mL, which is deficient...").
2. Be empathetic and reassuring — patients are often anxious about their results.
3. Provide SPECIFIC, ACTIONABLE advice tied to the markers.
4. Do NOT make definitive diagnoses. Always recommend consulting their doctor for medical decisions.
5. If asked about a test not in their report, say "That test wasn't included in your report."
6. Answer follow-up questions with rich detail when asked.
7. Use simple analogies to explain complex values (e.g., "Think of your cholesterol ratio like a traffic jam ratio...").
8. When discussing risks, be honest but balanced — not alarmist.
9. Format responses clearly — use short paragraphs or bullet points for lists.
10. If asked about diet, reference the specific foods already recommended in this report.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    return NextResponse.json({
      response: completion.choices[0]?.message?.content || "I'm not sure how to answer that. Could you rephrase?"
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
