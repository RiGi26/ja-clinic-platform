import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

export type LetterData = {
  letterNumber: string
  type: 'sakit' | 'sehat' | 'rujukan'
  createdAt: string
  patient: {
    full_name: string; no_rm: string; date_of_birth: string | null
    gender: string | null; address: string | null
  }
  doctor: { full_name: string; license_number: string | null; specialty: string }
  clinic: { name: string; address: string | null; phone: string | null; logo_url: string | null }
  diagnosis: string | null
  notes: string | null
  sickDays: number | null
  sickFrom: string | null
  sickUntil: string | null
  referredTo: string | null
  referralReason: string | null
  purpose: string | null
}

const TITLE_MAP: Record<string, string> = {
  sakit:   'SURAT KETERANGAN SAKIT',
  sehat:   'SURAT KETERANGAN SEHAT',
  rujukan: 'SURAT RUJUKAN',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

const ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
function numberToWords(n: number): string {
  if (n <= 11) return ONES[n] ?? String(n)
  if (n < 20)  return (ONES[n - 10] ?? '') + ' belas'
  if (n < 30)  return 'dua puluh' + (n > 20 ? ' ' + (ONES[n - 20] ?? '') : '')
  if (n < 100) return (ONES[Math.floor(n / 10)] ?? '') + ' puluh' + (n % 10 > 0 ? ' ' + (ONES[n % 10] ?? '') : '')
  return String(n)
}

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9.5, paddingHorizontal: 36, paddingVertical: 32, backgroundColor: '#ffffff' },
  header:      { marginBottom: 10 },
  clinicName:  { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0891B2', marginBottom: 3 },
  clinicMeta:  { fontSize: 8, color: '#64748b', lineHeight: 1.5 },
  dividerBold: { borderBottom: '2 solid #0891B2', marginVertical: 10 },
  divider:     { borderBottom: '1 solid #e2e8f0', marginVertical: 8 },
  titleBlock:  { alignItems: 'center', marginBottom: 14 },
  title:       { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e293b', textAlign: 'center', letterSpacing: 1 },
  letterNo:    { fontSize: 8.5, color: '#64748b', textAlign: 'center', marginTop: 3 },
  row:         { flexDirection: 'row', marginBottom: 3 },
  rowLabel:    { width: 108, fontSize: 9.5, color: '#475569' },
  rowColon:    { width: 12,  fontSize: 9.5, color: '#475569' },
  rowValue:    { flex: 1,    fontSize: 9.5, color: '#1e293b' },
  section:     { marginBottom: 10 },
  sectionLbl:  { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#475569', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  body:        { fontSize: 9.5, color: '#1e293b', lineHeight: 1.7, marginBottom: 6 },
  bold:        { fontFamily: 'Helvetica-Bold' },
  sigBlock:    { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30 },
  sigInner:    { alignItems: 'center', width: 160 },
  sigDate:     { fontSize: 9.5, color: '#475569', marginBottom: 42 },
  sigName:     { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#1e293b', textAlign: 'center' },
  sigSip:      { fontSize: 8.5, color: '#64748b', textAlign: 'center', marginTop: 2 },
  noteBox:     { backgroundColor: '#f8fafc', border: '1 solid #e2e8f0', borderRadius: 4, padding: 8, marginTop: 16 },
  noteText:    { fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowColon}>:</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

export function MedicalLetterDocument({ data }: { data: LetterData }) {
  const { clinic, doctor, patient } = data
  const genderLabel  = patient.gender === 'male' ? 'Laki-laki' : patient.gender === 'female' ? 'Perempuan' : '—'
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

        {/* Judul */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{TITLE_MAP[data.type] ?? 'SURAT KETERANGAN DOKTER'}</Text>
          <Text style={s.letterNo}>No. {data.letterNumber}</Text>
        </View>

        {/* Dokter */}
        <View style={s.section}>
          <Text style={s.sectionLbl}>Yang bertanda tangan di bawah ini:</Text>
          <InfoRow label="Nama Dokter"  value={`dr. ${doctor.full_name}`} />
          <InfoRow label="Nomor SIP"    value={doctor.license_number ?? '-'} />
          <InfoRow label="Spesialisasi" value={doctor.specialty} />
        </View>

        <Text style={[s.body, { marginBottom: 4 }]}>Menerangkan bahwa:</Text>

        {/* Pasien */}
        <View style={s.section}>
          <InfoRow label="Nama"          value={patient.full_name} />
          <InfoRow label="No. RM"        value={patient.no_rm} />
          <InfoRow label="Tgl Lahir"     value={fmtDate(patient.date_of_birth)} />
          <InfoRow label="Jenis Kelamin" value={genderLabel} />
          <InfoRow label="Alamat"        value={patient.address ?? '-'} />
        </View>

        <View style={s.divider} />

        {/* Content per type */}
        {data.type === 'sakit' && (
          <View style={s.section}>
            <Text style={s.body}>
              Berdasarkan pemeriksaan yang telah dilakukan, pasien tersebut didiagnosis:{' '}
              <Text style={s.bold}>{data.diagnosis ?? '—'}</Text>
            </Text>
            <Text style={s.body}>
              dan dianjurkan untuk beristirahat / tidak masuk kerja/sekolah selama{' '}
              <Text style={s.bold}>
                {data.sickDays ?? '—'} ({numberToWords(data.sickDays ?? 0)}) hari
              </Text>
              , terhitung mulai tanggal{' '}
              <Text style={s.bold}>{fmtDate(data.sickFrom)}</Text>
              {' '}s/d{' '}
              <Text style={s.bold}>{fmtDate(data.sickUntil)}</Text>.
            </Text>
          </View>
        )}

        {data.type === 'sehat' && (
          <View style={s.section}>
            <Text style={s.body}>
              Berdasarkan pemeriksaan yang telah dilakukan, pasien tersebut dalam keadaan{' '}
              <Text style={s.bold}>SEHAT</Text>
              {' '}dan mampu untuk{' '}
              <Text style={s.bold}>{data.purpose ?? '—'}</Text>.
            </Text>
          </View>
        )}

        {data.type === 'rujukan' && (
          <View style={s.section}>
            <Text style={[s.body, { marginBottom: 6 }]}>
              Dengan hormat, kami merujuk pasien tersebut kepada:
            </Text>
            <InfoRow label="Fasilitas Kesehatan" value={data.referredTo ?? '—'} />
            <InfoRow label="Diagnosis/Alasan"    value={data.referralReason ?? '—'} />
            <Text style={[s.body, { marginTop: 8 }]}>
              Mohon pemeriksaan dan penanganan lebih lanjut.
            </Text>
          </View>
        )}

        {data.notes && (
          <Text style={[s.body, { color: '#64748b' }]}>Catatan: {data.notes}</Text>
        )}

        {/* Tanda Tangan */}
        <View style={s.sigBlock}>
          <View style={s.sigInner}>
            <Text style={s.sigDate}>{clinic.name}, {createdLabel}</Text>
            <Text style={s.sigDate}>Dokter Pemeriksa,</Text>
            <Text style={s.sigName}>dr. {doctor.full_name}</Text>
            <Text style={s.sigSip}>SIP: {doctor.license_number ?? '-'}</Text>
          </View>
        </View>

        <View style={s.noteBox}>
          <Text style={s.noteText}>Surat ini dibuat berdasarkan hasil pemeriksaan medis</Text>
        </View>

      </Page>
    </Document>
  )
}
