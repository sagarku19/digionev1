export interface InvoiceParty {
  name: string;
  gstin?: string | null;
  address?: string | null;
  stateName?: string | null;
  email?: string | null;
}

export interface InvoiceLine {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceModel {
  type: 'sale' | 'commission';
  title: string;                 // 'Tax Invoice' | 'Bill of Supply'
  invoiceNumber: string;
  invoiceDate: string;           // display date (dd Mon yyyy)
  seller: InvoiceParty;
  buyer: InvoiceParty;
  lines: InvoiceLine[];
  subtotal: number;
  taxLabel?: string | null;
  taxAmount: number;
  total: number;
  note?: string | null;
}
