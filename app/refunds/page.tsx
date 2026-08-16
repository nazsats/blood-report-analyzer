import type { Metadata } from 'next';
import LegalPage, { Section, BUSINESS } from '@/components/LegalPage';

export const metadata: Metadata = {
    title: 'Cancellation & Refund Policy — Blood Lab',
    description: 'When Blood Lab refunds a payment, and how to ask for one.',
};

export default function RefundsPage() {
    return (
        <LegalPage
            title="Cancellation and refunds"
            intro="You get one report free before paying anything, so you can see exactly what you are buying first. That is deliberate — it means nobody should be paying for something they turn out not to want."
        >
            <Section title="When we refund in full">
                <p>We will refund, no argument, if:</p>
                <ul className="list-disc space-y-1 pl-5">
                    <li>You were charged but no reports were added to your account.</li>
                    <li>You were charged twice for the same purchase.</li>
                    <li>
                        The analysis failed to generate, or came back visibly broken — empty,
                        garbled, or clearly not about your report.
                    </li>
                    <li>You have paid but not yet used any of the reports you bought.</li>
                </ul>
            </Section>

            <Section title="When we cannot refund">
                <p>
                    Once a report has been generated and shown to you, it has been delivered
                    and we have already paid the cost of producing it. We cannot refund a
                    report you have read simply because you disagree with what it says.
                </p>
                <p>
                    If the analysis was wrong — not unwelcome, but wrong — tell us. That is a
                    fault, and it is covered above.
                </p>
            </Section>

            <Section title="Unused reports">
                <p>
                    Reports you have bought do not expire. If you want a refund on unused
                    ones, ask within 30 days of purchase and we will refund them in full.
                </p>
            </Section>

            <Section title="How to ask">
                <p>
                    Email{' '}
                    <a className="underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>{' '}
                    with the email address on your account and the payment reference. You do
                    not need to explain yourself for any of the cases listed above.
                </p>
                <p>
                    We respond within 2 working days. Approved refunds are issued to the
                    original payment method and typically appear within 5 to 7 working days,
                    depending on your bank.
                </p>
            </Section>

            <Section title="Cancelling your account">
                <p>
                    You can ask us to delete your account and everything in it at any time,
                    by email. There is nothing to cancel in the recurring sense — Blood Lab
                    charges per report, so not buying is cancelling.
                </p>
            </Section>
        </LegalPage>
    );
}
