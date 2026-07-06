// Issue (number + row via issue_invoice RPC), render from the frozen snapshot,
// cache the PDF in private R2, and return a short-TTL signed URL. Server-only.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import { storage, resolveBucket } from '@/lib/storage';
import { insertFile, findLiveByKey } from '@/lib/storage/files';
import { renderInvoicePdf } from './render';
import type { InvoiceModel } from './types';

type Db = SupabaseClient<Database>;
type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

export interface IssueParams {
  type: 'sale' | 'commission';
  issuer: 'creator' | 'digione';
  creatorId: string;
  orderId?: string | null;
  periodMonth?: string | null;
  fy: string;
  isTaxInvoice: boolean;
  subtotal: number;
  taxAmount: number;
  total: number;
  seriesKey: string;
  prefix: string;
  invoiceDate: string;  // 'YYYY-MM-DD'
  model: InvoiceModel;  // built by the caller; stored as the frozen metadata snapshot
}

const TTL_SECONDS = 600;

export async function issueAndCacheInvoice(
  db: Db, p: IssueParams
): Promise<{ invoice: InvoiceRow; signedUrl: string; ttlSeconds: number }> {
  // issue_invoice has no SQL defaults — every param must be passed explicitly (null, not undefined).
  // p_order_id and p_period_month are typed as `string` in the generated Args (non-nullable) but the
  // Postgres function accepts NULL; cast through unknown to satisfy the generated types at compile time.
  const { data: issued, error } = await db.rpc('issue_invoice', {
    p_type: p.type, p_issuer: p.issuer, p_creator_id: p.creatorId,
    p_order_id: (p.orderId ?? null) as unknown as string,
    p_period_month: (p.periodMonth ?? null) as unknown as string,
    p_fy: p.fy, p_is_tax_invoice: p.isTaxInvoice,
    p_subtotal: p.subtotal, p_tax_amount: p.taxAmount, p_total: p.total,
    p_series_key: p.seriesKey, p_prefix: p.prefix, p_invoice_date: p.invoiceDate,
    p_metadata: p.model as unknown as Json,
  });
  if (error || !issued) throw new Error(`issue_invoice failed: ${error?.message ?? 'no row returned'}`);
  const invoice = issued as unknown as InvoiceRow;

  const cfg = resolveBucket('creator-content');
  const safeNumber = invoice.invoice_number.replace(/\//g, '-');
  const objectKey = `${p.creatorId}/invoices/${safeNumber}.pdf`;

  if (!invoice.storage_file_id) {
    // Render from the STORED snapshot for legal immutability; inject the authoritative number.
    const snapshot = (invoice.metadata ?? p.model) as unknown as InvoiceModel;
    const model: InvoiceModel = { ...snapshot, invoiceNumber: invoice.invoice_number };
    const pdf = await renderInvoicePdf(model);
    await storage.putObject({ bucket: cfg.name, objectKey, body: pdf, contentType: 'application/pdf' });

    let file = await findLiveByKey(db, cfg.name, objectKey);
    if (!file) {
      try {
        file = await insertFile(db, {
          owner_id: p.creatorId, bucket: cfg.name, object_key: objectKey, file_name: `${safeNumber}.pdf`,
          mime_type: 'application/pdf', size: pdf.length, visibility: 'private', kind: 'invoice', product_id: null,
        });
      } catch {
        // concurrent first-download inserted the same (bucket, object_key) first — reuse it
        file = await findLiveByKey(db, cfg.name, objectKey);
        if (!file) throw new Error('invoice file metadata could not be resolved after conflict');
      }
    }
    await db.from('invoices').update({ storage_file_id: file.id }).eq('id', invoice.id);
  }

  const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey, ttlSeconds: TTL_SECONDS });
  return { invoice, signedUrl, ttlSeconds: TTL_SECONDS };
}
