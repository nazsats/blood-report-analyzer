// app/subscribe/page.tsx
import Pricing from "@/components/Pricing";

/**
 * The pricing page.
 *
 * Kept at /subscribe rather than moved to /pricing on purpose: the header, the
 * profile page and any link already shared point here, and a rename would break
 * them for no gain. The word is now the only thing left of the old monthly
 * plan — the page itself sells single reports.
 *
 * It renders the same <Pricing /> the homepage does. One component, so the
 * price cannot be right in one place and stale in the other.
 */

export const metadata = {
    title: "Pricing — Blood Lab",
    description:
        "First blood report free, then ₹25 each. No subscription, no expiry. Pay by UPI, card or netbanking.",
};

export default function SubscribePage() {
    return (
        <div className="pt-10">
            <Pricing />
        </div>
    );
}
