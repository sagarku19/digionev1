// Shared INR currency formatting for the dashboard.
// formatINR reproduces the 11 duplicated local definitions; formatINRCompact
// is the lakh/thousand shortener previously local to the earnings page.
// NOTE: timeAgo is intentionally NOT here — the page-local variants differ in
// output and unifying them would change behavior.

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

export function formatINRCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
}
