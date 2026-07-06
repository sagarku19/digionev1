import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceModel, InvoiceParty } from './types';

// Built-in Helvetica lacks the ₹ glyph — render money as "INR 1,234.00".
const inr = (n: number) => `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#16130F' },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  right: { textAlign: 'right' },
  muted: { color: '#6b6b6b' },
  bold: { fontFamily: 'Helvetica-Bold' },
  parties: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  party: { width: '48%' },
  label: { fontSize: 8, color: '#6b6b6b', marginBottom: 3 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#dddddd', paddingBottom: 4, marginTop: 20, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  cDesc: { width: '70%' },
  cAmt: { width: '30%', textAlign: 'right' },
  totals: { marginTop: 12, alignSelf: 'flex-end', width: '45%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderColor: '#dddddd', marginTop: 4, paddingTop: 4 },
  note: { marginTop: 24, fontSize: 8, color: '#6b6b6b' },
});

function Party({ label, p }: { label: string; p: InvoiceParty }) {
  return (
    <View style={s.party}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.bold}>{p.name}</Text>
      {p.gstin ? <Text style={s.muted}>GSTIN: {p.gstin}</Text> : null}
      {p.address ? <Text style={s.muted}>{p.address}</Text> : null}
      {p.stateName ? <Text style={s.muted}>{p.stateName}</Text> : null}
      {p.email ? <Text style={s.muted}>{p.email}</Text> : null}
    </View>
  );
}

export function InvoiceDoc({ model }: { model: InvoiceModel }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <Text style={s.h1}>{model.title}</Text>
          <View style={s.right}>
            <Text style={s.bold}>{model.invoiceNumber}</Text>
            <Text style={s.muted}>{model.invoiceDate}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <Party label="FROM" p={model.seller} />
          <Party label="BILL TO" p={model.buyer} />
        </View>

        <View style={s.tableHead}>
          <Text style={s.cDesc}>Description</Text>
          <Text style={s.cAmt}>Amount</Text>
        </View>
        {model.lines.map((l, i) => (
          <View style={s.tr} key={i}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cAmt}>{inr(l.amount)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Subtotal</Text><Text>{inr(model.subtotal)}</Text></View>
          {model.taxAmount > 0 ? (
            <View style={s.totalRow}><Text>{model.taxLabel}</Text><Text>{inr(model.taxAmount)}</Text></View>
          ) : null}
          <View style={[s.totalRow, s.grand]}><Text>Total</Text><Text>{inr(model.total)}</Text></View>
        </View>

        {model.note ? <Text style={s.note}>{model.note}</Text> : null}
      </Page>
    </Document>
  );
}
