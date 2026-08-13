// app/api/activate-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpayClient';
import { getAdminApp } from '@/lib/firebaseAdmin';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId, paymentId, signature } = await req.json();

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await getAdminApp().auth().verifyIdToken(token);
    const uid = decoded.uid;

    // Verify signature (prevents tampering)
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature – possible tampering' }, { status: 400 });
    }

    // Verify subscription is active
    const sub = await getRazorpay().subscriptions.fetch(subscriptionId);
    if (sub.status !== 'active' && sub.status !== 'authenticated') {
      return NextResponse.json({ error: 'Subscription not active' }, { status: 400 });
    }

    if (sub.notes?.userId !== uid) {
      return NextResponse.json({ error: 'User mismatch' }, { status: 403 });
    }

    // Activate Pro in Firestore
    const adminDb = getAdminApp().firestore();
    await adminDb.collection('users').doc(uid).set(
      {
        pro: true,
        plan: sub.notes.plan,
        subId: subscriptionId,
        subStart: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Activation error:', err);
    return NextResponse.json({ error: 'Failed to activate subscription' }, { status: 500 });
  }
}