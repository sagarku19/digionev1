import type { InvoiceModel, InvoiceLine } from './types';
import type { DigioneIdentity } from './digione-identity';

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function fyOf(dateIso: string): string {
  const d = new Date(dateIso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

export interface SaleInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  creator: { legalName: string; gstin?: string | null; address?: string | null; state?: string | null };
  buyer: { name?: string | null; email?: string | null };
  items: { name: string; price: number }[];
  total: number;
}

export function buildSaleInvoiceModel(input: SaleInvoiceInput): InvoiceModel {
  const lines: InvoiceLine[] = input.items.map((i) => ({
    description: i.name, qty: 1, unitPrice: round2(i.price), amount: round2(i.price),
  }));
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  return {
    type: 'sale',
    title: 'Bill of Supply', // 6a: registered-creator GST Tax Invoice deferred (spec §6)
    invoiceNumber: input.invoiceNumber,
    invoiceDate: fmtDate(input.invoiceDate),
    seller: {
      name: input.creator.legalName, gstin: input.creator.gstin ?? null,
      address: input.creator.address ?? null, stateName: input.creator.state ?? null,
    },
    buyer: { name: input.buyer.name || 'Customer', email: input.buyer.email ?? null },
    lines,
    subtotal,
    taxLabel: null,
    taxAmount: 0,
    total: round2(input.total),
    note: 'This is a Bill of Supply. No GST is charged on this sale.',
  };
}

export interface CommissionInvoiceInput {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  periodLabel: string;
  salesCount: number;
  digione: DigioneIdentity;
  creator: { legalName: string; gstin?: string | null; address?: string | null; state?: string | null };
  commissionNet: number;
  gstOnCommission: number;
}

export function buildCommissionInvoiceModel(input: CommissionInvoiceInput): InvoiceModel {
  const net = round2(input.commissionNet);
  const gst = round2(input.gstOnCommission);
  return {
    type: 'commission',
    title: 'Tax Invoice',
    invoiceNumber: input.invoiceNumber,
    invoiceDate: fmtDate(input.invoiceDate),
    seller: {
      name: input.digione.legalName, gstin: input.digione.gstin,
      address: input.digione.address, stateName: input.digione.state,
    },
    buyer: {
      name: input.creator.legalName, gstin: input.creator.gstin ?? null,
      address: input.creator.address ?? null, stateName: input.creator.state ?? null,
    },
    lines: [{
      description: `Platform commission — ${input.periodLabel} (${input.salesCount} sale${input.salesCount === 1 ? '' : 's'})`,
      qty: 1, unitPrice: net, amount: net,
    }],
    subtotal: net,
    taxLabel: 'GST @ 18%',
    taxAmount: gst,
    total: round2(net + gst),
    note: `DigiOne GSTIN: ${input.digione.gstin}. GST charged on platform commission for facilitation services.`,
  };
}
