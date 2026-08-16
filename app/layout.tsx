// app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Blood Lab — Understand Your Blood Test",
  description: "Photograph or upload your blood report and get every marker explained in plain English. First report free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.className} antialiased`}>
        {/* Dark by default until the light pass lands. The pages were built
            dark-first — several still hardcode text-white with no dark: variant
            — so defaulting to light renders white text on a white background.
            enableSystem stays off so the default is deterministic rather than
            depending on whose laptop is in dark mode; the header toggle works. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Header /><main className="min-h-screen">{children}</main><Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}