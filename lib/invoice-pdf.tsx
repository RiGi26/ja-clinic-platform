import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

export type BillingItem = {
  name: string
  qty: number
  price: number
  subtotal: number
}

export type InvoiceData = {
  invoiceNumber: string
  createdAt: string
  patient: { full_name: string; no_rm: string }
  clinic: {
    name: string
    address: string | null
    phone: string | null
    bank_name: string | null
    bank_account: string | null
    bank_holder: string | null
    logo_url: string | null
  }
  doctor: { full_name: string } | null
  appointment: { scheduled_at: string } | null
  items: BillingItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string | null
  status: string
}

function fmtRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const PAY_METHOD_LABEL: Record<string, string> = {
  cash: 'Tunai', transfer: 'Transfer Bank', bpjs: 'BPJS', insurance: 'Asuransi',
}

const s = StyleSheet.create({
  page:         { fontFamily: 'Helvetica', fontSize: 9, paddingHorizontal: 30, paddingVertical: 28, backgroundColor: '#ffffff' },

  // Header
  header:       { marginBottom: 14 },
  clinicName:   { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1e3a5f', marginBottom: 3 },
  clinicMeta:   { fontSize: 8, color: '#64748b', lineHeight: 1.5 },
  divider:      { borderBottom: '1 solid #e2e8f0', marginVertical: 10 },
  dividerBold:  { borderBottom: '2 solid #1e3a5f', marginVertical: 10 },

  // Invoice info
  infoGrid:     { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoCol:      { flex: 1 },
  infoLabel:    { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoValue:    { fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica-Bold' },

  // Table
  table:        { marginBottom: 12 },
  tableHead:    { flexDirection: 'row', backgroundColor: '#1e3a5f', paddingVertical: 5, paddingHorizontal: 6 },
  tableHeadTxt: { color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tableRow:     { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '1 solid #f1f5f9' },
  tableRowAlt:  { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '1 solid #f1f5f9', backgroundColor: '#f8fafc' },
  colNo:        { width: '8%' },
  colItem:      { width: '42%' },
  colQty:       { width: '10%', textAlign: 'center' },
  colHarga:     { width: '20%', textAlign: 'right' },
  colSubtotal:  { width: '20%', textAlign: 'right' },
  cellTxt:      { fontSize: 8.5, color: '#334155' },

  // Totals
  totals:       { alignItems: 'flex-end', marginBottom: 14 },
  totalRow:     { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginBottom: 2 },
  totalLabel:   { fontSize: 8.5, color: '#64748b' },
  totalValue:   { fontSize: 8.5, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
  grandRow:     { flexDirection: 'row', width: 200, justifyContent: 'space-between', borderTop: '1 solid #1e3a5f', paddingTop: 4, marginTop: 2 },
  grandLabel:   { fontSize: 10, color: '#1e3a5f', fontFamily: 'Helvetica-Bold' },
  grandValue:   { fontSize: 10, color: '#1e3a5f', fontFamily: 'Helvetica-Bold' },

  // Status badge area
  statusArea:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  badgePaid:    { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#dcfce7', borderRadius: 20 },
  badgePaidTxt: { fontSize: 9, color: '#16a34a', fontFamily: 'Helvetica-Bold' },
  badgePend:    { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fef3c7', borderRadius: 20 },
  badgePendTxt: { fontSize: 9, color: '#d97706', fontFamily: 'Helvetica-Bold' },
  payMethodTxt: { fontSize: 8.5, color: '#64748b' },

  // Bank
  bankBox:      { backgroundColor: '#f8fafc', border: '1 solid #e2e8f0', borderRadius: 6, padding: 8, marginBottom: 14 },
  bankTitle:    { fontSize: 7.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  bankDetail:   { fontSize: 8.5, color: '#334155' },

  // Footer
  footer:       { marginTop: 'auto', borderTop: '1 solid #e2e8f0', paddingTop: 10, alignItems: 'center' },
  footerTxt:    { fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const { clinic } = data
  const isPaid = data.status === 'paid'

  return (
    <Document>
      <Page size="A5" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          {clinic.logo_url ? (
            <Image src={clinic.logo_url} style={{ width: 80, height: 40, objectFit: 'contain', marginBottom: 6 }} />
          ) : (
            <Text style={s.clinicName}>{clinic.name}</Text>
          )}
          {clinic.address && <Text style={s.clinicMeta}>{clinic.address}</Text>}
          {clinic.phone   && <Text style={s.clinicMeta}>Telp: {clinic.phone}</Text>}
        </View>

        <View style={s.dividerBold} />

        {/* Invoice info grid */}
        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>No. Invoice</Text>
            <Text style={s.infoValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Tanggal</Text>
            <Text style={s.infoValue}>{fmtDate(data.createdAt)}</Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Nama Pasien</Text>
            <Text style={s.infoValue}>{data.patient.full_name}</Text>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>No. Rekam Medis</Text>
            <Text style={s.infoValue}>{data.patient.no_rm}</Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          {data.doctor && (
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Dokter</Text>
              <Text style={s.infoValue}>dr. {data.doctor.full_name}</Text>
            </View>
          )}
          {data.appointment && (
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Tanggal Kunjungan</Text>
              <Text style={s.infoValue}>{fmtDateTime(data.appointment.scheduled_at)}</Text>
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* Items table */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadTxt, s.colNo]}>No</Text>
            <Text style={[s.tableHeadTxt, s.colItem]}>Item</Text>
            <Text style={[s.tableHeadTxt, s.colQty]}>Qty</Text>
            <Text style={[s.tableHeadTxt, s.colHarga]}>Harga</Text>
            <Text style={[s.tableHeadTxt, s.colSubtotal]}>Subtotal</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.cellTxt, s.colNo]}>{i + 1}</Text>
              <Text style={[s.cellTxt, s.colItem]}>{item.name}</Text>
              <Text style={[s.cellTxt, s.colQty]}>{item.qty}</Text>
              <Text style={[s.cellTxt, s.colHarga]}>{fmtRupiah(item.price)}</Text>
              <Text style={[s.cellTxt, s.colSubtotal]}>{fmtRupiah(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{fmtRupiah(data.subtotal)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Diskon</Text>
              <Text style={s.totalValue}>- {fmtRupiah(data.discount)}</Text>
            </View>
          )}
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>TOTAL</Text>
            <Text style={s.grandValue}>{fmtRupiah(data.total)}</Text>
          </View>
        </View>

        {/* Status */}
        <View style={s.statusArea}>
          {isPaid ? (
            <View style={s.badgePaid}><Text style={s.badgePaidTxt}>✓ LUNAS</Text></View>
          ) : (
            <View style={s.badgePend}><Text style={s.badgePendTxt}>BELUM LUNAS</Text></View>
          )}
          {data.paymentMethod && (
            <Text style={s.payMethodTxt}>via {PAY_METHOD_LABEL[data.paymentMethod] ?? data.paymentMethod}</Text>
          )}
        </View>

        {/* Bank info */}
        {clinic.bank_name && (
          <View style={s.bankBox}>
            <Text style={s.bankTitle}>Informasi Pembayaran</Text>
            <Text style={s.bankDetail}>{clinic.bank_name} — {clinic.bank_account}</Text>
            {clinic.bank_holder && <Text style={s.bankDetail}>a/n {clinic.bank_holder}</Text>}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>Terima kasih atas kepercayaan Anda</Text>
          <Text style={[s.footerTxt, { marginTop: 2 }]}>{clinic.name}</Text>
        </View>

      </Page>
    </Document>
  )
}
