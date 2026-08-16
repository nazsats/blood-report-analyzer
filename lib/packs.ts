/**
 * What you can buy, defined once on the server.
 *
 * Prices live here rather than in the checkout component because the browser
 * decides which pack to click and the server decides what it costs. If the
 * amount travelled from the client, a user could open devtools and pay ₹1 for
 * three reports — the classic mistake with client-side pricing.
 */

/**
 * Reports a new account gets without paying.
 *
 * Lives here, next to the prices, because the pricing page promises this number
 * and the analyze route enforces it. When it was a local const inside the route
 * the marketing copy could drift from the rule without anything failing.
 */
export const FREE_REPORTS = 1;

export type PackId = 'single' | 'triple';

export type Pack = {
    id: PackId;
    /** Reports granted on successful payment. */
    credits: number;
    /** Price in paise, because Razorpay works in the smallest currency unit. */
    amountPaise: number;
    label: string;
    blurb: string;
};

export const PACKS: Record<PackId, Pack> = {
    single: {
        id: 'single',
        credits: 1,
        amountPaise: 2500, // ₹25
        label: 'One report',
        blurb: 'Full analysis of a single blood report',
    },
    triple: {
        id: 'triple',
        credits: 3,
        amountPaise: 6000, // ₹60 — ₹20 each
        label: 'Three reports',
        blurb: 'Best value. Most people have more than one report to read.',
    },
};

export function getPack(id: unknown): Pack | null {
    if (typeof id !== 'string') return null;
    return PACKS[id as PackId] ?? null;
}

export const rupees = (paise: number) => `₹${(paise / 100).toFixed(0)}`;
