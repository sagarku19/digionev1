import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { StatementModel } from './statement';

// Built-in Helvetica lacks the ₹ glyph — render money as "INR 1,234.00".
const inr = (n: number) => `INR ${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (n: number) => (n < 0 ? `- ${inr(n)}` : inr(n));

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#16130F' },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  sub: { color: '#6b6b6b', marginTop: 2 },
  who: { marginTop: 16 },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: '#6b6b6b' },
  table: { marginTop: 20, borderTopWidth: 1, borderColor: '#dddddd' },
  tr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  note: { marginTop: 24, fontSize: 8, color: '#6b6b6b' },
});

export function StatementDoc({ model }: { model: StatementModel }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Annual Earnings & Tax Statement</Text>
        <Text style={s.sub}>Financial Year {model.fyLabel}</Text>
        <View style={s.who}>
          <Text style={s.bold}>{model.creatorName}</Text>
          {model.creatorGstin ? <Text style={s.muted}>GSTIN: {model.creatorGstin}</Text> : null}
        </View>
        <View style={s.table}>
          {model.rows.map((r, i) => {
            const strong = r.label === 'Net earnings';
            return (
              <View style={s.tr} key={i}>
                <Text style={strong ? s.bold : undefined}>{r.label}</Text>
                <Text style={strong ? s.bold : undefined}>{signed(r.amount)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={s.note}>{model.note}</Text>
      </Page>
    </Document>
  );
}
