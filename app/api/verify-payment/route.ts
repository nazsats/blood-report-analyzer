import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getRazorpay } from '@/lib/razorpayClient';
import { getAdminApp, adminDb } from '@/lib/firebaseAdmin';

/**
 * Confirm a payment and grant the credits.
 *
 * Three things have to be true before anyone gets anything, and each catches a
 * different attack:
 *
 *  1. The HMAC signature matches. Without it a caller could POST any order id
 *     and be granted credits they never paid for.
 *  2. Razorpay itself reports the payment as captured. The signature only
 *     proves the fields were produced by our secret, not that money moved.
 *  3. The order document has not already been credited. Checkout can fire its
 *     handler twice, and users refresh; without this, one payment grants two
 *     packs.
 *
 * The credit count comes from the order we wrote at creation time, never from
 * the request body — otherwise the browser decides how much it bought.
 */

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let uid: string;
        try {
            const decoded = await getAdminApp().auth().verifyIdToken(token);
            uid = decoded.uid;
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const orderId: string = body.razorpay_order_id;
        const paymentId: string = body.razorpay_payment_id;
        const signature: string = body.razorpay_signature;

        if (!orderId || !paymentId || !signature) {
            return NextResponse.json({ error: 'Incomplete payment details' }, { status: 400 });
        }

        // 1 — signature
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        // timingSafeEqual rather than !== : string comparison exits at the first
        // differing byte, which leaks how much of a guess was right.
        const ok =
            expected.length === signature.length &&
            crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

        if (!ok) {
            console.warn('[verify-payment] signature mismatch', { uid, orderId });
            return NextResponse.json({ error: 'Payment could not be verified' }, { status: 400 });
        }

        // 2 — Razorpay's own view of the payment
        const payment = await getRazorpay().payments.fetch(paymentId);
        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return NextResponse.json(
                { error: `Payment is ${payment.status}, not completed.` },
                { status: 400 },
            );
        }

        const orderRef = adminDb.collection('orders').doc(orderId);

        // 3 — credit exactly once, inside a transaction so two handlers racing
        // cannot both see 'created' and both grant the pack.
        const granted = await adminDb.runTransaction(async (tx) => {
            const snap = await tx.get(orderRef);
            if (!snap.exists) throw new Error('order_not_found');

            const order = snap.data()!;
            if (order.uid !== uid) throw new Error('order_owner_mismatch');
            if (order.status === 'paid') return 0; // already credited

            if (Number(payment.amount) !== Number(order.amountPaise)) {
                throw new Error('amount_mismatch');
            }

            tx.update(orderRef, {
                status: 'paid',
                paymentId,
                paidAt: new Date().toISOString(),
            });
            tx.set(
                adminDb.collection('users').doc(uid),
                { credits: FieldValue.increment(order.credits) },
                { merge: true },
            );
            return order.credits as number;
        });

        return NextResponse.json({
            ok: true,
            creditsAdded: granted,
            alreadyProcessed: granted === 0,
        });
    } catch (err: any) {
        const known: Record<string, [string, number]> = {
            order_not_found: ['We could not find that order.', 404],
            order_owner_mismatch: ['That order belongs to another account.', 403],
            amount_mismatch: ['Paid amount did not match the order.', 400],
        };
        const hit = known[err?.message];
        if (hit) return NextResponse.json({ error: hit[0] }, { status: hit[1] });

        console.error('[API verify-payment]', err);
        return NextResponse.json({ error: 'Could not verify the payment.' }, { status: 500 });
    }
}
