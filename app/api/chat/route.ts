// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openaiClient';
import { getAdminApp } from '@/lib/firebaseAdmin';
import { consumeRateLimit, CHAT_LIMIT } from '@/lib/rateLimit';

// See the analyze route: without this the platform default can cut off a reply
// that is still generating. 60 is the Hobby-plan ceiling; Pro allows up to 300.
export const maxDuration = 60;
export const runtime = 'nodejs';


/** Enough for a real conversation, far short of a prompt-stuffing budget. */
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;

export async function POST(req: NextRequest) {
  try {
    // This route had no auth of any kind. Two separate problems, both live:
    //
    //  1. It was an open OpenAI proxy. Anyone could POST here from anywhere and
    //     spend our tokens, with no signed-in user to attribute the cost to.
    //  2. Worse, it read any report by id through the Admin SDK, which bypasses
    //     Firestore rules, and put the whole thing in the system prompt. Anyone
    //     holding a report id could ask this endpoint to read out somebody
    //     else's blood results — the same exposure the share page was locked
    //     down to prevent, through a different door.
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Please sign in to use the assistant.' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAdminApp().auth().verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const gate = await consumeRateLimit(uid, CHAT_LIMIT);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: 'You have sent a lot of messages. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } },
      );
    }

    const { reportId, messages } = await req.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
    }

    // The history comes from the client, so its size is the caller's choice
    // until we make it ours. Keep the most recent turns — that is the context
    // that matters — and trim each one.
    // `as const` on the role matters: without it TypeScript widens the ternary
    // to `string`, which matches none of the SDK's message overloads. Anything
    // that is not 'assistant' becomes 'user', so a caller cannot inject a
    // 'system' turn and rewrite the instructions above.
    const trimmed = messages.slice(-MAX_MESSAGES).map((m: any) => ({
      role: (m?.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: String(m?.content ?? '').slice(0, MAX_CHARS_PER_MESSAGE),
    }));

    // Load full report data from Firestore for rich context
    let reportData: any = {};
    if (reportId) {
      const reportDoc = await getAdminApp().firestore().collection('reports').doc(reportId).get();
      if (reportDoc.exists) {
        const data = reportDoc.data() || {};
        // The ownership check the Admin SDK does not do for us. Silently
        // ignoring someone else's report rather than 403-ing also avoids
        // confirming to a prober that a given report id exists.
        if (data.userId === uid) {
          reportData = data;
        } else {
          console.warn('[chat] report access denied', { uid, reportId });
        }
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

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimmed,
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
