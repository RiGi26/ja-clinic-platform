import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

export type PrescriptionData = {
  prescriptionNumber: string
  createdAt: string
  patient: { full_name: string; no_rm: string; date_of_birth: string | null }
  doctor:  { full_name: string; license_number?: string | null }
  clinic:  { name: string; address: string | null; phone: string | null; logo_url: string | null }
  items: { medicine_name: string; quantity: number; unit: string; dosage: string; duration: string | null; notes: string | null }[]
  notes: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, paddingHorizontal: 30, paddingVertical: 28, backgroundColor: '#ffffff' },
  header:      { marginBottom: 12 },
  clinicName:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0891B2', marginBottom: 3 },
  clinicMeta:  { fontSize: 8, color: '#64748b', lineHeight: 1.5 },
  dividerBold: { borderBottom: '2 solid #0891B2', marginVertical: 10 },
  divider:     { borderBottom: '1 solid #e2e8f0', marginVertical: 8 },
  title:       { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e293b', textAlign: 'center', marginBottom: 2 },
  preNo:       { fontSize: 8.5, color: '#64748b', textAlign: 'center', marginBottom: 10 },
  infoGrid:    { flexDirection: 'row', gap: 10, marginBottom: 8 },
  infoCol:     { flex: 1 },
  infoLabel:   { fontSize: 7.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1.5 },
  infoValue:   { fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
  table:       { marginBottom: 14 },
  tableHead:   { flexDirection: 'row', backgroundColor: '#0891B2', paddingVertical: 5, paddingHorizontal: 6 },
  thTxt:       { color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tableRow:    { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '1 solid #f1f5f9' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '1 solid #f1f5f9', backgroundColor: '#f8fafc' },
  cellTxt:     { fontSize: 8.5, color: '#334155' },
  colNo:       { width: '6%' },
  colName:     { width: '30%' },
  colQty:      { width: '12%', textAlign: 'center' },
  colDosage:   { width: '22%' },
  colDuration: { width: '16%' },
  colNotes:    { width: '14%' },
  notesBox:    { backgroundColor: '#f8fafc', border: '1 solid #e2e8f0', borderRadius: 4, padding: 8, marginBottom: 14 },
  notesLabel:  { fontSize: 7.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  notesTxt:    { fontSize: 8.5, color: '#334155' },
  sigBlock:    { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  sigInner:    { alignItems: 'center', width: 150 },
  sigDate:     { fontSize: 9, color: '#475569', marginBottom: 36 },
  sigName:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1e293b', textAlign: 'center' },
  sigSip:      { fontSize: 8, color: '#64748b', textAlign: 'center', marginTop: 2 },
  footer:      { marginTop: 'auto', borderTop: '1 solid #e2e8f0', paddingTop: 8, alignItems: 'center' },
  footerTxt:   { fontSize: 7.5, color: '#94a3b8' },
})

export function PrescriptionDocument({ data }: { data: PrescriptionData }) {
  const { clinic, doctor, patient } = data
  const createdLabel = fmtDate(data.createdAt)

  return (
    <Document>
      <Page size="A5" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          {clinic.logo_url
            ? <Image src={clinic.logo_url} style={{ width: 70, height: 35, objectFit: 'contain', marginBottom: 4 }} />
            : <Text style={s.clinicName}>{clinic.name}</Text>
          }
          {clinic.address && <Text style={s.clinicMeta}>{clinic.address}</Text>}
          {clinic.phone   && <Text style={s.clinicMeta}>Telp: {clinic.phone}</Text>}
        </View>

        <View style={s.dividerBold} />

        <Text style={s.title}>RESEP DOKTER</Text>
        <Text style={s.preNo}>No. {data.prescriptionNumber}</Text>

        {/* Doctor + Patient Info */}
        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Dokter</Text>
            <Text style={s.infoValue}>dr. {doctor.full_name}</Text>
            {doctor.license_number && <Text style={[s.infoLabel, { marginTop: 2 }]}>SIP: {doctor.license_number}</Text>}
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Tanggal</Text>
            <Text style={s.infoValue}>{createdLabel}</Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>Pasien</Text>
            <Text style={s.infoValue}>{patient.full_name}</Text>
          </View>
          <View style={s.infoCol}>
            <Text style={s.infoLabel}>No. RM</Text>
            <Text style={s.infoValue}>{patient.no_rm}</Text>
            {patient.date_of_birth && (
              <>
                <Text style={[s.infoLabel, { marginTop: 2 }]}>Tgl Lahir</Text>
                <Text style={s.infoValue}>{fmtDate(patient.date_of_birth)}</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.divider} />

        {/* Items table */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.thTxt, s.colNo]}>No</Text>
            <Text style={[s.thTxt, s.colName]}>Nama Obat</Text>
            <Text style={[s.thTxt, s.colQty]}>Qty</Text>
            <Text style={[s.thTxt, s.colDosage]}>Aturan Pakai</Text>
            <Text style={[s.thTxt, s.colDuration]}>Durasi</Text>
            <Text style={[s.thTxt, s.colNotes]}>Catatan</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.cellTxt, s.colNo]}>{i + 1}</Text>
              <Text style={[s.cellTxt, s.colName]}>{item.medicine_name}</Text>
              <Text style={[s.cellTxt, s.colQty]}>{item.quantity} {item.unit}</Text>
              <Text style={[s.cellTxt, s.colDosage]}>{item.dosage}</Text>
              <Text style={[s.cellTxt, s.colDuration]}>{item.duration ?? '—'}</Text>
              <Text style={[s.cellTxt, s.colNotes]}>{item.notes ?? '—'}</Text>
            </View>
          ))}
        </View>

        {data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Catatan Dokter</Text>
            <Text style={s.notesTxt}>{data.notes}</Text>
          </View>
        )}

        {/* Signature */}
        <View style={s.sigBlock}>
          <View style={s.sigInner}>
            <Text style={s.sigDate}>{clinic.name}, {createdLabel}</Text>
            <Text style={s.sigDate}>Dokter Pemeriksa,</Text>
            <Text style={s.sigName}>dr. {doctor.full_name}</Text>
            {doctor.license_number && <Text style={s.sigSip}>SIP: {doctor.license_number}</Text>}
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerTxt}>Resep ini dibuat secara elektronik dan sah tanpa tanda tangan basah</Text>
        </View>
      </Page>
    </Document>
  )
}
