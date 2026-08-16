import OpenAI from 'openai';

/**
 * Lazily construct the OpenAI client.
 *
 * Three routes each built their own at module scope. The SDK does not throw on
 * a missing key at construction, but the route module still evaluates during
 * `next build` page-data collection, and any client whose key is absent turns
 * the whole build into "Failed to collect page data for /api/chat" — a message
 * that names the wrong problem and stops the build for every other route too.
 *
 * Same pattern as lib/razorpayClient.ts and lib/firebaseAdmin.ts: nothing is
 * constructed until a request actually needs it, so a missing key is a JSON
 * error on one endpoint instead of a failed deploy.
 */

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
    if (client) return client;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set.');
    }

    // 55s against the 60s maxDuration on these routes: the client should give
    // up fractionally before the platform kills the function, so the caller
    // gets a readable timeout rather than an opaque 504.
    client = new OpenAI({ apiKey, timeout: 55000 });
    return client;
}
