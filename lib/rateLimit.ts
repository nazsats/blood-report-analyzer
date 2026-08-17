/**
 * Per-user rate limiting for the expensive endpoints.
 *
 * Backed by Firestore rather than an in-memory counter because this runs on
 * serverless: each invocation may be a fresh instance, so anything held in
 * process memory resets between requests and limits nothing. Firestore is
 * already a dependency here, which beats adding Redis for a counter.
 *
 * The whole read-modify-write runs inside a transaction. Without one, two
 * requests arriving together both read the old count and both write count+1,
 * so a caller firing in parallel — exactly what an abuser does — slips through
 * the limit they are supposed to hit.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin';

export type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    /** Seconds until the window resets. Send as Retry-After on a 429. */
    retryAfter: number;
};

export type RateLimitOptions = {
    /** Requests permitted per window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
    /** Namespace, so /analyze and /chat get separate budgets. */
    bucket: string;
};

/**
 * Consume one unit of a user's budget.
 *
 * Fails open. If Firestore is unreachable the request is allowed through:
 * a rate limiter that takes the whole product down when its own storage
 * blips is a worse outage than the abuse it prevents. Abuse is bounded by
 * the free-scan limit and by billing alerts; a hard dependency here is not.
 */
export async function consumeRateLimit(
    uid: string,
    { limit, windowMs, bucket }: RateLimitOptions,
): Promise<RateLimitResult> {
    const db = getAdminDb();
    const ref = db.collection('rateLimits').doc(`${bucket}:${uid}`);
    const now = Date.now();

    try {
        return await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.exists ? snap.data() : undefined;

            const windowStart: number = data?.windowStart ?? 0;
            const count: number = data?.count ?? 0;
            const expired = now - windowStart >= windowMs;

            // A fresh window: reset rather than decay, so a burst at the very
            // end of one window cannot borrow against the next.
            const nextCount = expired ? 1 : count + 1;
            const nextStart = expired ? now : windowStart;

            if (nextCount > limit) {
                return {
                    allowed: false,
                    remaining: 0,
                    retryAfter: Math.max(1, Math.ceil((nextStart + windowMs - now) / 1000)),
                };
            }

            tx.set(
                ref,
                { count: nextCount, windowStart: nextStart, updatedAt: FieldValue.serverTimestamp() },
                { merge: true },
            );

            return {
                allowed: true,
                remaining: limit - nextCount,
                retryAfter: 0,
            };
        });
    } catch (err) {
        console.error('[rateLimit] transaction failed, allowing request:', err);
        return { allowed: true, remaining: limit, retryAfter: 0 };
    }
}

/**
 * Analysis is the costly call — an image, a long prompt, and a long answer.
 * Six an hour is generous for someone working through a stack of reports and
 * useless to anyone scripting it.
 */
export const ANALYZE_LIMIT: RateLimitOptions = {
    limit: 6,
    windowMs: 60 * 60 * 1000,
    bucket: 'analyze',
};

/** Chat turns are much cheaper, so the ceiling is higher. */
export const CHAT_LIMIT: RateLimitOptions = {
    limit: 40,
    windowMs: 60 * 60 * 1000,
    bucket: 'chat',
};

/**
 * Meal photos go to gpt-4o with vision, which is the most expensive call in the
 * product per request. Nobody photographs more than a handful of meals in an
 * hour, so this is invisible to real use and caps what a script can spend.
 */
export const MEAL_LIMIT: RateLimitOptions = {
    limit: 15,
    windowMs: 60 * 60 * 1000,
    bucket: 'meal',
};

/**
 * Order creation costs no AI money, but each call writes a Firestore document
 * and an order at Razorpay. Twenty an hour is far more than anyone buying a
 * ₹25 report needs, and stops a loop from filling the orders collection.
 */
export const ORDER_LIMIT: RateLimitOptions = {
    limit: 20,
    windowMs: 60 * 60 * 1000,
    bucket: 'order',
};
