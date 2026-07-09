// Thin Resend wrapper. Missing env → warn + no-op (dev-safe). Callers treat
// email as best-effort: failures are logged, never thrown past this module's
// contract (send errors are logged here; network throws propagate and MUST be
// caught by the caller — fulfillment wraps the call in try/catch).
// Server-only.

import { Resend } from 'resend';
import {
  buildPurchaseConfirmation,
  type PurchaseEmailInput,
} from './email-templates/purchase-confirmation';

export type { PurchaseEmailInput };

export async function sendPurchaseConfirmation(input: PurchaseEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY / EMAIL_FROM not configured — skipping purchase confirmation');
    return;
  }

  const { subject, html } = buildPurchaseConfirmation(input);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to: input.to, subject, html });
  if (error) {
    console.error('[email] purchase confirmation send failed:', error.message ?? error);
  }
}
