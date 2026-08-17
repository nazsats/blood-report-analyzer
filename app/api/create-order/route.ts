import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRazorpay } from '@/lib/razorpayClient';
import { getAdminApp, adminDb } from '@/lib/firebaseAdmin';
import { getPack } from '@/lib/packs';
import { consumeRateLimit, ORDER_LIMIT } from '@/lib/rateLimit';

/**
 * Start a one-time payment for a pack of reports.
 *
 * The existing subscription routes create a Razorpay *subscription* against a
 * plan, which bills on a cycle. Charging ₹25 for a single report is a one-off,
 * and that is the Orders API — a subscription with total_count 12 would sign
 * someone up to pay every month for a report they bought once.
 *
 * The client sends a pack id, never an amount. Amounts come from lib/packs.ts
 * on the server, so devtools cannot turn ₹60 into ₹1.
 */

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({ error: 'Please sign in to buy reports.' }, { status: 401 });
        }

        let uid: string;
        try {
            const decoded = await getAdminApp().auth().verifyIdToken(token);
            uid = decoded.uid;
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const gate = await consumeRateLimit(uid, ORDER_LIMIT);
        if (!gate.allowed) {
            return NextResponse.json(
                { error: 'Too many attempts. Please wait a moment and try again.' },
                { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } },
            );
        }

        const { packId } = await req.json().catch(() => ({ packId: null }));
        const pack = getPack(packId);
        if (!pack) {
            return NextResponse.json({ error: 'Unknown pack' }, { status: 400 });
        }

        // A short random receipt keeps Razorpay's 40-character limit while
        // staying unique per attempt. Reusing one across retries makes a
        // genuine second attempt look like a duplicate.
        const receipt = `bl_${uid.slice(0, 8)}_${crypto.randomBytes(6).toString('hex')}`;

        const order = await getRazorpay().orders.create({
            amount: pack.amountPaise,
            currency: 'INR',
            receipt,
            // Recorded on the order itself so the amount and pack can be
            // checked server-side at verification, without trusting anything
            // the browser sends back.
            notes: { uid, packId: pack.id, credits: String(pack.credits) },
        });

        // Written before the user is sent to checkout so a payment that
        // succeeds while the browser dies still has a record to reconcile
        // against — the webhook has something to find.
        await adminDb.collection('orders').doc(order.id).set({
            uid,
            packId: pack.id,
            credits: pack.credits,
            amountPaise: pack.amountPaise,
            status: 'created',
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({
            orderId: order.id,
            amount: pack.amountPaise,
            currency: 'INR',
            // Publishable by design — it identifies the merchant in Checkout.
            // The secret never leaves the server.
            keyId: process.env.RAZORPAY_KEY_ID,
            pack: { id: pack.id, credits: pack.credits, label: pack.label },
        });
    } catch (err: any) {
        console.error('[API create-order]', err);
        const message = /not configured/i.test(err?.message ?? '')
            ? 'Payments are not configured yet.'
            : 'Could not start the payment. Please try again.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
