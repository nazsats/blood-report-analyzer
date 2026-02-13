// app/api/check-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await getAdminApp().auth().verifyIdToken(token);
    if (decoded.uid !== uid) return NextResponse.json({ error: 'User mismatch' }, { status: 403 });

    const adminDb = getAdminApp().firestore();
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    return NextResponse.json({ active: !!userData?.pro });
  } catch (err: any) {
    console.error('Check sub error:', err);
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
  }
}