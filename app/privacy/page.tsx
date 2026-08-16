import type { Metadata } from 'next';
import LegalPage, { Section, BUSINESS } from '@/components/LegalPage';

export const metadata: Metadata = {
    title: 'Privacy Policy — Blood Lab',
    description:
        'What Blood Lab collects when you upload a blood report, where it goes, how long it is kept, and how to delete it.',
};

export default function PrivacyPage() {
    return (
        <LegalPage
            title="Privacy policy"
            intro="Blood Lab reads a photo or PDF of a blood test and explains it in plain English. Doing that means handling health information, so here is exactly what is collected, where it goes, and how to get rid of it."
        >
            <Section title="What we collect">
                <ul className="list-disc space-y-2 pl-5">
                    <li>
                        <strong>The report you upload</strong> — the file itself, and the marker
                        names, values and reference ranges read from it.
                    </li>
                    <li>
                        <strong>Your account</strong> — the email address you sign in with.
                    </li>
                    <li>
                        <strong>Optional details you enter</strong> — age, blood type,
                        medications, existing conditions. These make the explanation more
                        accurate and can be left blank.
                    </li>
                    <li>
                        <strong>Payment records</strong> — which pack you bought and when.
                        Razorpay handles the payment itself; we never see your card or UPI
                        details.
                    </li>
                    <li>
                        <strong>Basic technical data</strong> — error logs, and counts of
                        reports analysed, which is how the free allowance and rate limits work.
                    </li>
                </ul>
            </Section>

            <Section title="What we do not collect">
                <ul className="list-disc space-y-2 pl-5">
                    <li>Your location.</li>
                    <li>Your card, UPI or bank details.</li>
                    <li>Advertising identifiers. There are no ad or analytics trackers.</li>
                </ul>
                <p>We do not sell your data, and we do not share it with advertisers.</p>
            </Section>

            <Section title="Where your report goes">
                <p>
                    The report is sent to <strong>OpenAI</strong>, which performs the analysis
                    and returns the explanation. That transfer is the product — without it
                    there is nothing to show you. OpenAI processes it as a service provider
                    and, under its API terms, does not use content submitted through the API
                    to train its models.
                </p>
                <p>
                    Your report and its analysis are stored in <strong>Google Firebase</strong>{' '}
                    so you can open them again. Payments go through <strong>Razorpay</strong>.
                    Those three, plus our hosting provider, are the only third parties
                    involved. OpenAI and Google process data outside India.
                </p>
            </Section>

            <Section title="Sharing a report">
                <p>
                    If you create a share link, anyone holding that link can view that report
                    without signing in. That is the point of the feature, but it means the
                    link is the only thing protecting it — treat it like the report itself.
                </p>
            </Section>

            <Section title="How long we keep it">
                <p>
                    Reports are kept until you delete them, so your history stays available.
                    Delete a report and it is removed. Ask us to delete your account and
                    everything tied to it goes — uploaded files and analyses included — within
                    30 days of your request.
                </p>
            </Section>

            <Section title="Your choices">
                <ul className="list-disc space-y-2 pl-5">
                    <li>Leave the optional health details blank.</li>
                    <li>Delete any report at any time.</li>
                    <li>Ask for your account and all associated data to be deleted.</li>
                    <li>Ask for a copy of what we hold about you.</li>
                </ul>
                <p>
                    Email{' '}
                    <a className="underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>{' '}
                    for any of these.
                </p>
            </Section>

            <Section title="Children">
                <p>
                    Blood Lab is not intended for anyone under 18 and we do not knowingly
                    collect data from children. Contact us if you believe a child has used it
                    and we will delete the account.
                </p>
            </Section>

            <Section title="Security">
                <p>
                    Traffic is encrypted in transit. Reports are readable only by the account
                    that created them, enforced by database rules rather than by the website
                    alone. No system is perfect, and we will tell affected users promptly if
                    we ever discover a breach involving health data.
                </p>
            </Section>

            <Section title="Changes">
                <p>
                    If this policy changes we will update the date at the top, and we will
                    tell you before any change that materially affects how your health data
                    is handled.
                </p>
            </Section>
        </LegalPage>
    );
}
