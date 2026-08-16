import type { Metadata } from 'next';
import LegalPage, { Section, BUSINESS } from '@/components/LegalPage';

export const metadata: Metadata = {
    title: 'Terms & Conditions — Blood Lab',
    description: 'The terms you agree to when using Blood Lab.',
};

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms and conditions"
            intro={`By using ${BUSINESS.trading} you agree to what follows. It is written to be understood rather than to be impressive.`}
        >
            <Section title="What Blood Lab does">
                <p>
                    You upload a photo or PDF of a blood test. We read it using an AI model
                    and explain what the markers mean in plain English. That is the whole
                    service.
                </p>
            </Section>

            <Section title="This is not medical advice">
                <p className="font-medium">
                    Blood Lab explains what your results say. It does not diagnose, treat,
                    prescribe, or replace a doctor.
                </p>
                <p>
                    AI models get things wrong, including confidently. Nothing here should be
                    used to start, stop or change a medication, delay seeing a doctor, or
                    decide you are fine. Take decisions about your health with a qualified
                    clinician who can see your full history.
                </p>
                <p>
                    If you think you are having a medical emergency, contact emergency
                    services — not this website.
                </p>
            </Section>

            <Section title="Who can use it">
                <p>
                    You must be 18 or older. Upload only your own reports, or reports you
                    have clear permission to upload. Someone else's blood test is their
                    private health information.
                </p>
            </Section>

            <Section title="Your account">
                <p>
                    You are responsible for what happens under your account, so keep your
                    sign-in details to yourself. Tell us if you think someone else has
                    access.
                </p>
            </Section>

            <Section title="Paying">
                <p>
                    Your first report is free. After that, reports are bought individually or
                    in packs at the prices shown at checkout, in Indian Rupees. Payments are
                    handled by Razorpay; we never see or store your card or UPI details.
                </p>
                <p>
                    Refunds are covered by our{' '}
                    <a className="underline" href="/refunds">cancellation and refund policy</a>.
                </p>
            </Section>

            <Section title="Fair use">
                <p>Please do not:</p>
                <ul className="list-disc space-y-1 pl-5">
                    <li>Script or automate uploads, or try to get around rate limits.</li>
                    <li>Resell the analysis as your own product.</li>
                    <li>Upload anything that is not a medical test report.</li>
                    <li>Attempt to break, overload, or probe the service.</li>
                </ul>
                <p>
                    We may suspend an account doing any of these. Where it is honest error
                    rather than abuse, we will say so first.
                </p>
            </Section>

            <Section title="Your data">
                <p>
                    What we collect and where it goes is set out in our{' '}
                    <a className="underline" href="/privacy">privacy policy</a>. Your reports
                    remain yours; we do not sell them and we do not use them to advertise to
                    you.
                </p>
            </Section>

            <Section title="Availability">
                <p>
                    We aim to keep Blood Lab running, but it depends on services we do not
                    control, and it may be unavailable at times. It is provided as-is.
                </p>
            </Section>

            <Section title="Liability">
                <p>
                    To the extent the law allows, our liability for any claim connected to
                    Blood Lab is limited to what you paid us in the twelve months before it
                    arose. Nothing here limits liability that cannot lawfully be limited.
                </p>
            </Section>

            <Section title="Changes and governing law">
                <p>
                    We may update these terms; the date at the top will change and continued
                    use means you accept the new version. These terms are governed by the
                    laws of India, and the courts of Mumbai have jurisdiction.
                </p>
            </Section>
        </LegalPage>
    );
}
