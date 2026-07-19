import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://digione.ai"
  ),
  manifest: "/manifest.json",
  title: {
    default: "DigiOne.ai",
    template: "%s | DigiOne.ai",
  },
  description: "Built for Digital Creators.",
  other: {
    // Tell the Dark Reader extension not to rewrite our DOM — the app owns its
    // own light/dark theming. Without this the extension mutates SVG fills and
    // breaks React hydration on light pages.
    "darkreader-lock": "true",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: {
    title: "DigiOne.ai",
    description: "Built for Digital Creators.",
    url: "https://digione.ai",
    siteName: "DigiOne.ai",
    images: [
      { url: "/og-square.webp", width: 1200, height: 1200, type: "image/webp" },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiOne.ai",
    description: "Built for Digital Creators.",
    images: ["/og-square.webp"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bricolage.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
