import type { Metadata } from 'next';
import LinklnLanding from '@/src/components/marketing/linkln/LinklnLanding';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://digione.ai';
const SHORT_DOMAIN = process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || 'linkln.me';

export const metadata: Metadata = {
  title: `${SHORT_DOMAIN} · Short links, big data | by DigiOne`,
  description: `${SHORT_DOMAIN} is the branded link shortener powered by DigiOne. Shorten, brand, and track every link with QR codes, click analytics, and smart targeting.`,
  robots: { index: false, follow: true },
  icons: { icon: [{ url: '/linkln.svg', type: 'image/svg+xml' }] },
};

export default function LinkHome() {
  return <LinklnLanding appUrl={APP_URL} shortDomain={SHORT_DOMAIN} />;
}
