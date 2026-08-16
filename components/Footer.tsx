import Link from 'next/link';

/**
 * Site footer.
 *
 * The policy links are the load-bearing part: Razorpay checks they are
 * reachable from the site during activation, not merely that the URLs resolve.
 *
 * No operator name or email here. Both belong on /contact, where someone
 * looking for them will go, and putting a personal email in the footer of every
 * page is how it ends up scraped. The disclaimer stays because it should be on
 * every page, not only in the terms.
 */

const LINKS = [
    { href: '/contact', label: 'Contact' },
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/refunds', label: 'Refunds' },
    { href: '/shipping', label: 'Delivery' },
];

export default function Footer() {
    return (
        <footer className="mt-24 border-t border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="mx-auto max-w-5xl px-6 py-10">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <span className="text-sm font-bold tracking-tight text-primary-600 dark:text-primary-400">
                        Blood Lab
                    </span>

                    <nav className="flex flex-wrap gap-x-6 gap-y-2">
                        {LINKS.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="text-sm text-gray-600 hover:text-primary-600 hover:underline dark:text-gray-400 dark:hover:text-primary-400"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <p className="mt-8 max-w-2xl text-sm text-gray-500 dark:text-gray-500">
                    Blood Lab explains what your results say. It is not a diagnosis and does
                    not replace your doctor.
                </p>

                <p className="mt-4 text-xs text-gray-400 dark:text-gray-600">
                    © {new Date().getFullYear()} Blood Lab
                </p>
            </div>
        </footer>
    );
}
