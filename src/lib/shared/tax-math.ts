// Pure Indian e-commerce tax math — isomorphic executable spec of the rules the
// record_sale_tax Postgres RPC re-computes authoritatively (spec §1.1, §3).
// GST-on-commission is carved OUT of the GST-inclusive 10% fee (not added on top).

export interface TaxRates {
  gstCommissionRate: number;
  tdsRatePan: number;
  tdsRateNoPan: number;
  tcsRate: number;
  tdsThresholdFy: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const finite = (n: number) => Number.isFinite(n);

export function splitCommission(commissionGross: number, gstRate: number): {
  commissionNet: number;
  gstOnCommission: number;
} {
  if (!finite(commissionGross) || commissionGross < 0) throw new RangeError('commissionGross must be a non-negative finite number');
  if (!finite(gstRate) || gstRate < 0) throw new RangeError('gstRate must be a non-negative finite number');
  const gstOnCommission = round2((commissionGross * gstRate) / (1 + gstRate));
  return { commissionNet: round2(commissionGross - gstOnCommission), gstOnCommission };
}

export function accrueSaleTax(input: {
  gross: number;
  fyGrossBefore: number;
  panPresent: boolean;
  registered: boolean;
  rates: TaxRates;
}): { tdsAmount: number; tcsAmount: number } {
  const { gross, fyGrossBefore, panPresent, registered, rates } = input;
  if (!finite(gross) || gross < 0) throw new RangeError('gross must be a non-negative finite number');
  if (!finite(fyGrossBefore) || fyGrossBefore < 0) throw new RangeError('fyGrossBefore must be a non-negative finite number');

  let tdsAmount = 0;
  if (!panPresent) {
    tdsAmount = round2(gross * rates.tdsRateNoPan);
  } else if (fyGrossBefore + gross > rates.tdsThresholdFy) {
    tdsAmount = round2(gross * rates.tdsRatePan);
  }
  const tcsAmount = registered ? round2(gross * rates.tcsRate) : 0;
  return { tdsAmount, tcsAmount };
}
