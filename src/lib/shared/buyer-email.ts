// Client-only: remembers the last email a buyer used so repeat purchases and the
// auth modal can prefill it. NEVER takes priority over a live session email —
// see the prefill priority in checkout and the modal.

const KEY = 'digione-buyer-email';

export function rememberBuyerEmail(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, email.trim().toLowerCase());
  } catch {
    /* storage may be unavailable (private mode) — non-critical */
  }
}

export function getRememberedBuyerEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}
