// Thin Resend wrapper. Missing env → skipped (dev-safe). Never throws: the send
// outcome is returned as a discriminated result so callers can persist it
// (see order-email.ts → orders.confirmation_email_*). Server-only.

import { Resend } from 'resend';
import {
  buildPurchaseConfirmation,
  type PurchaseEmailInput,
} from './email-templates/purchase-confirmation';

export type { PurchaseEmailInput };

export type EmailSendResult =
  | { status: 'sent'; id: string | null }
  | { status: 'failed'; error: string }
  | { status: 'skipped'; reason: string };

export async function sendPurchaseConfirmation(input: PurchaseEmailInput): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY / EMAIL_FROM not configured — skipping purchase confirmation');
    return { status: 'skipped', reason: 'email_not_configured' };
  }

  const { subject, html } = buildPurchaseConfirmation(input);
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from, to: input.to, subject, html });
    if (error) {
      const msg = error.message ?? String(error);
      console.error('[email] purchase confirmation send failed:', msg);
      return { status: 'failed', error: msg };
    }
    return { status: 'sent', id: data?.id ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] purchase confirmation threw:', msg);
    return { status: 'failed', error: msg };
  }
}
