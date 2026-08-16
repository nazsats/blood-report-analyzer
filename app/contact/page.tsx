import type { Metadata } from 'next';
import LegalPage, { Section, BUSINESS } from '@/components/LegalPage';

export const metadata: Metadata = {
    title: 'Contact Us — Blood Lab',
    description: 'How to reach Blood Lab about your reports, your account, billing, or a refund.',
};

export default function ContactPage() {
    return (
        <LegalPage
            title="Contact us"
            intro="A real person reads these. If something went wrong with a report you paid for, say so and we will sort it out."
        >
            <Section title="Email">
                <p>
                    <a className="underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
                    <br />
                    We reply within 2 working days, usually sooner.
                </p>
            </Section>

            {BUSINESS.phone ? (
                <Section title="Phone">
                    <p>{BUSINESS.phone}</p>
                    <p className="text-sm text-gray-500">Monday to Saturday, 10am to 7pm IST.</p>
                </Section>
            ) : null}

            <Section title="Registered address">
                <p>
                    {BUSINESS.name}
                    {BUSINESS.address ? <><br />{BUSINESS.address}</> : null}
                    <br />
                    {BUSINESS.city}
                </p>
                {!BUSINESS.address ? (
                    <p className="text-sm text-gray-500">
                        Full postal address available on request by email.
                    </p>
                ) : null}
            </Section>

            <Section title="What to include">
                <p>
                    For anything about a specific report, send the email address on your
                    account and roughly when you uploaded it. That is enough for us to find
                    it — please do not email the report itself, since email is not a
                    private channel for health information.
                </p>
            </Section>
        </LegalPage>
    );
}
