import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "DigiOne.ai",
    template: "%s | DigiOne.ai",
  },
  description: "Sell digital products in India. Built for serious creators.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.webp", // optional, add later
  },
  openGraph: {
    title: "DigiOne.ai",
    description: "Sell digital products in India. Built for serious creators.",
    url: "https://digione.ai",
    siteName: "DigiOne.ai",
    images: [{ url: "/og.webp", width: 1500, height: 500 }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiOne.ai",
    description: "Sell digital products in India. Built for serious creators.",
    images: ["/og.webp"],
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
      className={`${inter.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}