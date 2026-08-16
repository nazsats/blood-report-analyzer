import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Public read for a shared report.
 *
 * This exists so the browser never queries the `reports` collection directly.
 * The old share page ran `where('shareId', '==', id)` from the client, which
 * meant the Firestore rules had to permit listing any document carrying a
 * shareId — and the analyze route stamps one on every report. In practice that
 * made every blood test result in the database listable by anyone who pointed
 * a query at the collection. Reading through the Admin SDK here lets the rules
 * go back to owner-only.
 *
 * Only the fields a share needs are returned. A shared link is meant to show
 * someone your results, not hand them the account behind it, so userId, email
 * and the stored file references stay server-side.
 */

export const runtime = 'nodejs';

// A share link is a bearer token: whoever holds it can read the report. Caching
// at the edge is fine — the link is the secret, not the response — but keep it
// short so a deleted report stops resolving quickly.
export const revalidate = 60;

type Params = { params: Promise<{ shareId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { shareId } = await params;

  // Firestore treats an empty or malformed value as a legitimate query, so
  // reject obvious junk before spending a read on it.
  if (!shareId || typeof shareId !== 'string' || shareId.length < 8 || shareId.length > 128) {
    return NextResponse.json({ error: 'Invalid share link' }, { status: 400 });
  }

  try {
    const snap = await adminDb
      .collection('reports')
      .where('shareId', '==', shareId)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Report not found or link expired' }, { status: 404 });
    }

    const d = snap.docs[0].data();

    // An allowlist, not a delete-list. A field added to reports later is then
    // private by default rather than public until somebody notices.
    return NextResponse.json({
      report: {
        summary: d.summary ?? '',
        recommendation: d.recommendation ?? '',
        overallScore: d.overallScore ?? null,
        riskLevel: d.riskLevel ?? null,
        tests: d.tests ?? [],
        futurePredictions: d.futurePredictions ?? [],
        healthGoals: d.healthGoals ?? [],
        nutrition: d.nutrition ?? null,
        lifestyle: d.lifestyle ?? null,
        supplements: d.supplements ?? [],
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[API Share] lookup failed:', err);
    return NextResponse.json({ error: 'Failed to load shared report' }, { status: 500 });
  }
}
