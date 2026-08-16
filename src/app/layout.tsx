import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  // iOS truncates the home-screen label around 11 characters, and she needs
  // to recognise it rather than read it.
  title: "Newborn",
  description: "What needs doing today.",
  applicationName: "Newborn",
  appleWebApp: { capable: true, title: "Newborn", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${plexMono.variable} antialiased`}
    >
      {/* Height is stated in `dvh`, never as a percentage of an ancestor whose
          own height is content-driven — that chain resolves to `auto` and is
          what stopped the tab bar reaching the bottom of the screen. */}
      <body className="bg-bg text-ink flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
