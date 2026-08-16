import Link from 'next/link';
import { BUSINESS } from './LegalPage';

/**
 * Site footer.
 *
 * It exists mainly to link the policy pages. Razorpay does not just check that
 * the URLs resolve during activation — it checks they are reachable from the
 * site, so a page nobody links to reads as a page put up for the reviewer.
 * The medical disclaimer sits here too, because it belongs on every page and
 * not only in the terms.
 */

const LINKS = [
    { href: '/contact', label: 'Contact us' },
    { href: '/terms', label: 'Terms & conditions' },
    { href: '/privacy', label: 'Privacy policy' },
    { href: '/refunds', label: 'Cancellation & refunds' },
    { href: '/shipping', label: 'Shipping & delivery' },
];

export default function Footer() {
    return (
        <footer className="mt-20 border-t border-gray-200 bg-gray-50">
            <div className="mx-auto max-w-5xl px-6 py-10">
                <nav className="flex flex-wrap gap-x-6 gap-y-2">
                    {LINKS.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="text-sm text-gray-600 hover:text-primary-600 hover:underline"
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>

                <p className="mt-6 text-sm text-gray-500">
                    Blood Lab explains what your results say. It is not a diagnosis and does
                    not replace your doctor.
                </p>

                <p className="mt-3 text-xs text-gray-400">
                    © {new Date().getFullYear()} {BUSINESS.name} · {BUSINESS.city} ·{' '}
                    <a className="hover:underline" href={`mailto:${BUSINESS.email}`}>
                        {BUSINESS.email}
                    </a>
                </p>
            </div>
        </footer>
    );
}
