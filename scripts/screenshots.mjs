/**
 * Regenerate the README screenshots.
 *
 *   node scripts/screenshots.mjs            # public pages, headless
 *   node scripts/screenshots.mjs --login    # opens a real browser first
 *
 * Why the two modes: the landing, pricing and upload pages render fine to a
 * logged-out visitor, so a headless run captures them. The results screens do
 * not exist until a real account has analysed a real report, and no script can
 * conjure that. `--login` opens a visible browser, waits while you sign in and
 * navigate to a report, and then captures whatever is on screen.
 *
 * The committed screenshots went stale once already — they showed the old
 * violet BloodAI theme and a GPT-4o badge long after both had changed — which
 * is the reason this is a script in the repo rather than a note to remember to
 * take some screenshots.
 *
 * Requires playwright, which is deliberately not a dependency of the app:
 *   npm i -D playwright && npx playwright install chromium
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.SHOT_BASE ?? 'https://www.bloodlab.in';
const OUT = 'docs/screenshots';
const LOGIN = process.argv.includes('--login');

const VIEWPORT = { width: 1400, height: 900 };

/** Pages that render without an account. */
const PUBLIC_SHOTS = [
    { name: 'landing-hero', path: '/', theme: 'light' },
    { name: 'landing-full', path: '/', theme: 'light', full: true },
    { name: 'landing-dark', path: '/', theme: 'dark' },
    { name: 'pricing', path: '/subscribe', theme: 'light' },
    { name: 'upload', path: '/upload', theme: 'light' },
];

mkdirSync(OUT, { recursive: true });

async function settle(page, full) {
    // Framer Motion reveals most sections on scroll. Capturing immediately
    // catches half of them still at opacity 0.
    await page.waitForTimeout(2500);
    if (!full) return;
    await page.evaluate(async () => {
        await new Promise((done) => {
            let y = 0;
            const step = setInterval(() => {
                window.scrollBy(0, 600);
                y += 600;
                if (y >= document.body.scrollHeight) { clearInterval(step); done(); }
            }, 100);
        });
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ headless: !LOGIN });

if (!LOGIN) {
    for (const shot of PUBLIC_SHOTS) {
        const ctx = await browser.newContext({
            viewport: VIEWPORT,
            deviceScaleFactor: 2,       // keeps the images sharp on GitHub
            colorScheme: shot.theme,
        });
        const page = await ctx.newPage();
        try {
            await page.goto(BASE + shot.path, { waitUntil: 'networkidle', timeout: 60000 });
            // next-themes runs with enableSystem={false}, so the OS colour
            // scheme does not drive it — the choice lives in localStorage and
            // has to be set and reloaded, or every shot comes out light.
            await page.evaluate((t) => localStorage.setItem('theme', t), shot.theme);
            await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
            await settle(page, shot.full);
            await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: !!shot.full });
            console.log('captured', shot.name);
        } catch (err) {
            console.log('FAILED', shot.name, err.message.split('\n')[0]);
        } finally {
            await ctx.close();
        }
    }
} else {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });

    console.log(`
  A browser window is open.

  1. Sign in and open a report you have already analysed.
  2. Scroll to the section you want to capture.
  3. Press Enter here to save it.

  Suggested names, matching what the README expects:
    results-summary, results-tests, results-visuals,
    results-predictions, results-nutrition, results-lifestyle,
    results-medications

  Leave the name blank and press Enter to finish.
`);

    const ask = (q) => new Promise((res) => {
        process.stdout.write(q);
        process.stdin.once('data', (d) => res(d.toString().trim()));
    });

    for (;;) {
        const name = await ask('  filename (blank to quit): ');
        if (!name) break;
        await page.screenshot({ path: `${OUT}/${name}.png` });
        console.log('  saved', `${OUT}/${name}.png`);
    }
    await ctx.close();
}

await browser.close();
console.log('done');
