// Pure annual earnings & tax statement model + FY window helper (isomorphic, testable).
// Reuses the Phase 6a PDF engine for rendering; this module is data-only.

export interface StatementRow {
  label: string;
  amount: number; // negative = a deduction from gross
}

export interface StatementModel {
  fyLabel: string;
  creatorName: string;
  creatorGstin?: string | null;
  rows: StatementRow[];
  netEarnings: number;
  note: string;
}

export interface FyBounds {
  fyStart: string; // 'YYYY-MM-DD' inclusive
  fyEnd: string;   // 'YYYY-MM-DD' exclusive
}

// Indian FY label '2026-27' → [2026-04-01, 2027-04-01).
export function fyBounds(fy: string): FyBounds {
  const m = /^(\d{4})-(\d{2})$/.exec(fy);
  if (!m) throw new RangeError('fy must look like 2026-27');
  const startYear = Number(m[1]);
  return { fyStart: `${startYear}-04-01`, fyEnd: `${startYear + 1}-04-01` };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface AnnualStatementInput {
  fyLabel: string;
  creator: { legalName: string; gstin?: string | null };
  grossSales: number;
  commission: number;        // GST-inclusive platform fee (commission_gross)
  gstOnCommission: number;
  tdsWithheld: number;
  tcsWithheld: number;
}

export function buildAnnualStatementModel(input: AnnualStatementInput): StatementModel {
  const gross = round2(input.grossSales);
  const commission = round2(input.commission);
  const gst = round2(input.gstOnCommission);
  const commissionNet = round2(commission - gst);
  const netEarnings = round2(gross - commission);
  const tds = round2(input.tdsWithheld);
  const tcs = round2(input.tcsWithheld);
  return {
    fyLabel: input.fyLabel,
    creatorName: input.creator.legalName,
    creatorGstin: input.creator.gstin ?? null,
    rows: [
      { label: 'Gross sales', amount: gross },
      { label: 'Platform commission', amount: -commissionNet },
      { label: 'GST on commission (18%)', amount: -gst },
      { label: 'Net earnings', amount: netEarnings },
      { label: 'TDS withheld (Sec 194-O)', amount: -tds },
      { label: 'TCS withheld (GST Sec 52)', amount: -tcs },
    ],
    netEarnings,
    note:
      'Informational statement. Earnings are shown on a sale-date basis; TDS/TCS on a payout-date basis. ' +
      'The statutory Form 16A (TDS certificate) is issued via the Income-Tax TRACES portal after 26Q filing.',
  };
}
