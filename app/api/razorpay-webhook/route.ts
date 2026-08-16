import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Razorpay's server telling us a payment happened.
 *
 * /api/verify-payment only runs if the user's browser is still alive to call
 * it. It very often is not: people pay by UPI, switch to their bank app,
 * approve, and never come back to the tab. The money moved and the credits
 * were never granted — the single worst bug a payment system can have, because
 * the user has paid and has nothing to show for it.
 *
 * This route is the safety net. Razorpay POSTs here from its own servers, so it
 * does not care what the browser did. Both paths converge on the same
 * transaction keyed by order id, so whichever arrives first grants the credits
 * and the other becomes a no-op.
 *
 * Setup: Razorpay Dashboard → Settings → Webhooks → add
 *   https://bloodlab.in/api/razorpay-webhook
 * with the `payment.captured` event, and put the signing secret it gives you in
 * RAZORPAY_WEBHOOK_SECRET. That secret is NOT the API key secret.
 */

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set');
        // 500 so Razorpay retries once it is configured, rather than treating
        // the event as delivered and dropping it.
        return NextResponse.json({ error: 'not_configured' }, { status: 500 });
    }

    // The signature is over the exact bytes Razorpay sent. Parsing to an object
    // and re-stringifying reorders keys and changes the hash, so the raw text
    // has to be read first and parsed second.
    const raw = await req.text();
    const signature = req.headers.get('x-razorpay-signature') ?? '';

    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const valid =
        expected.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

    if (!valid) {
        // Anyone can POST here; without this check they could mint credits.
        console.warn('[razorpay-webhook] bad signature');
        return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }

    let event: any;
    try {
        event = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'bad_payload' }, { status: 400 });
    }

    if (event?.event !== 'payment.captured') {
        // Acknowledged so Razorpay stops retrying events we do not act on.
        return NextResponse.json({ ok: true, ignored: event?.event ?? 'unknown' });
    }

    const payment = event?.payload?.payment?.entity;
    const orderId: string | undefined = payment?.order_id;
    const paymentId: string | undefined = payment?.id;

    if (!orderId || !paymentId) {
        return NextResponse.json({ ok: true, ignored: 'no_order_id' });
    }

    try {
        const orderRef = adminDb.collection('orders').doc(orderId);

        const granted = await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(orderRef);
            // An order we never created — a different integration on the same
            // Razorpay account, say. Not an error worth retrying.
            if (!snap.exists) return -1;

            const order = snap.data()!;
            if (order.status === 'paid') return 0;

            if (Number(payment.amount) !== Number(order.amountPaise)) {
                console.warn('[razorpay-webhook] amount mismatch', { orderId });
                return -1;
            }

            tx.update(orderRef, {
                status: 'paid',
                paymentId,
                paidAt: new Date().toISOString(),
                creditedBy: 'webhook',
            });
            tx.set(
                adminDb.collection('users').doc(order.uid),
                { credits: FieldValue.increment(order.credits) },
                { merge: true },
            );
            return order.credits as number;
        });

        return NextResponse.json({ ok: true, creditsAdded: Math.max(0, granted) });
    } catch (err) {
        console.error('[razorpay-webhook]', err);
        // 500 makes Razorpay retry, which is what we want for a transient
        // Firestore failure — the alternative is a paid user with no credits.
        return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
    }
}
