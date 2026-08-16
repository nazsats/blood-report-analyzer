import type { Metadata } from 'next';
import LegalPage, { Section, BUSINESS } from '@/components/LegalPage';

export const metadata: Metadata = {
    title: 'Shipping & Delivery — Blood Lab',
    description: 'Blood Lab delivers digital analysis instantly. Nothing is posted.',
};

// Razorpay asks every merchant for a shipping policy, including ones selling
// only digital goods. Saying plainly that nothing ships — and what "delivery"
// means instead — is what they are checking for.

export default function ShippingPage() {
    return (
        <LegalPage
            title="Shipping and delivery"
            intro="Blood Lab is a digital service. Nothing is posted to you, and there are no shipping charges."
        >
            <Section title="What you receive">
                <p>
                    When you upload a blood report, the analysis is generated and shown to
                    you in your browser. It is saved to your account so you can open it
                    again whenever you want.
                </p>
            </Section>

            <Section title="How long it takes">
                <p>
                    A report is usually ready in about 30 seconds. If your connection drops
                    or something fails on our side, the report is not counted against your
                    balance — you can simply try again.
                </p>
            </Section>

            <Section title="After paying">
                <p>
                    Reports you buy are added to your account the moment the payment is
                    confirmed, normally within a few seconds. If a payment succeeds and your
                    balance has not updated within 15 minutes, email{' '}
                    <a className="underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>{' '}
                    with the payment reference and we will fix it.
                </p>
            </Section>

            <Section title="Shipping charges">
                <p>None. There is nothing to ship.</p>
            </Section>
        </LegalPage>
    );
}
