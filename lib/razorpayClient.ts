// lib/razorpayClient.ts
import Razorpay from 'razorpay';

let client: Razorpay | null = null;

/**
 * Lazily construct the Razorpay client.
 *
 * Constructing at module scope meant the SDK threw "`key_id` or `oauthToken` is
 * mandatory" while the route module was still being imported. That happens during
 * `next build` page-data collection, so a missing key failed the whole build
 * instead of just the payment routes — and at runtime it produced an opaque HTML
 * 500 rather than a JSON error the client could read.
 *
 * Same reasoning as the lazy proxy in lib/firebaseAdmin.ts.
 */
export function getRazorpay(): Razorpay {
  if (client) return client;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      'Payments are not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    );
  }

  client = new Razorpay({ key_id, key_secret });
  return client;
}
