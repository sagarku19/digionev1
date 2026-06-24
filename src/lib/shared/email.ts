// Single source of truth for email normalization. Use everywhere an email is
// keyed or compared (checkout, fulfillment, buyer-signup, callback, claim) so a
// guest purchase keyed at checkout always matches the claim at login.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}
