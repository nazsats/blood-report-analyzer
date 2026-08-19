import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getAdminApp } from '@/lib/firebaseAdmin';
import { FREE_REPORTS } from '@/lib/packs';

/**
 * How many reports the signed-in user has left.
 *
 * This exists so the credit count can sit in the header on every page without
 * dragging the Firestore SDK along with it. Reading the same document from the
 * browser costs ~465 KB of JavaScript on every route — the exact weight that
 * was just removed from the bundle. A few hundred bytes of JSON does the same
 * job for a number that changes a handful of times per session.
 *
 * Returns only what the header renders. The user document also holds profile
 * data and billing fields, and none of that needs to travel to display a count.
 */

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    try {
        uid = (await getAdminApp().auth().verifyIdToken(token)).uid;
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        const snap = await adminDb.collection('users').doc(uid).get();
        const d = snap.exists ? snap.data()! : {};

        const free = Math.max(0, FREE_REPORTS - (d.freeUploadsUsed ?? 0));
        const credits: number = d.credits ?? 0;
        const pro = d.pro === true;

        return NextResponse.json(
            { free, credits, pro, total: pro ? null : free + credits },
            // Never cached: a stale balance right after a purchase is the one
            // moment this number really has to be right.
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (err) {
        console.error('[API balance]', err);
        return NextResponse.json({ error: 'Could not read balance' }, { status: 500 });
    }
}
