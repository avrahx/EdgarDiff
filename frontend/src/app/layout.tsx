import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "EdgarDiff | SEC 10-K Variance & M&A Covenant Intelligence",
  description:
    "Institutional financial intelligence platform for SEC EDGAR filings. Split-screen 10-K narrative variance engine, AI executive shifts, and M&A covenant extraction with click-to-cite verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#080c14] text-slate-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-200`}
      >
        {children}
      </body>
    </html>
  );
}
