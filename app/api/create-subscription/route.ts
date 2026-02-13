// app/api/create-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getAdminApp } from '@/lib/firebaseAdmin';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  let planId = "";
  let uid = "";
  let planName = "";
  try {
    ({ planId, uid, planName } = await req.json());

    console.log('Creating subscription:', { planId, uid, planName });

    // Auth check
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await getAdminApp().auth().verifyIdToken(token);

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // 12 billing cycles (1 year max)
      customer_notify: 1, // Send SMS/email notifications
      notes: { userId: uid, plan: planName },
    });

    console.log('Subscription created:', subscription.id);

    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (err: any) {
    console.error('Razorpay error details:', err);
    if (err.statusCode === 400 && err.error?.code === 'BAD_REQUEST_ERROR') {
      return NextResponse.json({ error: `Invalid plan ID: ${planId}. Please check dashboard.` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}