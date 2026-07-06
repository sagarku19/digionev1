// DigiOne's own seller identity for the commission tax invoice (server-only).
// Populate in .env.local. DIGIONE_GSTIN is required to issue a commission invoice.
export interface DigioneIdentity {
  legalName: string;
  gstin: string;
  pan: string;
  address: string;
  state: string;
  stateCode: string;
}

export function getDigioneIdentity(): DigioneIdentity {
  const gstin = process.env.DIGIONE_GSTIN;
  if (!gstin) {
    throw new Error('DIGIONE_GSTIN is not configured — cannot issue a commission tax invoice.');
  }
  return {
    legalName: process.env.DIGIONE_LEGAL_NAME ?? 'DigiOne',
    gstin,
    pan: process.env.DIGIONE_PAN ?? '',
    address: process.env.DIGIONE_ADDRESS ?? '',
    state: process.env.DIGIONE_STATE ?? '',
    stateCode: process.env.DIGIONE_STATE_CODE ?? '',
  };
}
