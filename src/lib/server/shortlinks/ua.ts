// Lightweight, dependency-free user-agent parsing for click analytics,
// plus a bot skip heuristic. Good-enough fidelity, not a full UA database.

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // no UA → treat as bot/unknown, don't count
  return /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|whatsapp|telegrambot|preview|monitor|curl|wget|python-requests|headless|lighthouse/i.test(ua);
}

function parseDeviceType(ua: string): DeviceType {
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

function parseOs(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod|ios/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export function parseUserAgent(ua: string | null | undefined): {
  deviceType: DeviceType; browser: string; os: string;
} {
  const s = ua ?? '';
  return { deviceType: parseDeviceType(s), browser: parseBrowser(s), os: parseOs(s) };
}
