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
        {/* Light by default, matching the Android app. Not "system": following
            the OS meant anyone with dark mode on their laptop got a dark medical
            site and never saw the light one, which is the design. The header
            toggle still works for anyone who prefers dark. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Header /><main className="min-h-screen">{children}</main><Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}