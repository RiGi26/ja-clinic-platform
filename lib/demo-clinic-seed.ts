import { SupabaseClient } from '@supabase/supabase-js'

const DEMO_CLINIC_SLUG = 'demo-clinic'

/** Step 1: Buat/cari clinic demo — return clinic_id */
export async function getOrCreateDemoClinic(db: SupabaseClient): Promise<string | null> {
  let { data: clinic } = await db
    .from('clinics').select('id').eq('slug', DEMO_CLINIC_SLUG).single()

  if (!clinic) {
    const { data: newClinic, error } = await db.from('clinics').insert({
      name: 'Klinik Demo Platform', slug: DEMO_CLINIC_SLUG,
      address: 'Jl. Sudirman No. 1, Jakarta Pusat', phone: '021-12345678',
      email: 'demo@klinik-platform.com',
      plan: 'trial', is_active: true,
    }).select('id').single()
    if (error) { console.error('[demo-seed] gagal buat clinic:', error.message); return null }
    clinic = newClinic
  }
  return clinic?.id ?? null
}

/** Step 2: Seed semua data demo */
export async function seedDemoData(db: SupabaseClient, clinicId: string) {
  // ── Dokter ──────────────────────────────────────────────────────────────
  const { data: existDoctors } = await db.from('doctors').select('id').eq('clinic_id', clinicId)
  let doctors: { id: string }[] = existDoctors ?? []
  if (doctors.length === 0) {
    const { data: d } = await db.from('doctors').insert([
      { clinic_id: clinicId, full_name: 'Dr. Sarah Putri',  specialty: 'Dokter Umum',             consultation_fee: 150000, is_active: true },
      { clinic_id: clinicId, full_name: 'Dr. Budi Santoso', specialty: 'Spesialis Anak',           consultation_fee: 250000, is_active: true },
      { clinic_id: clinicId, full_name: 'Dr. Ahmad Fauzi',  specialty: 'Spesialis Penyakit Dalam', consultation_fee: 300000, is_active: true },
    ]).select('id')
    doctors = d ?? []
  }

  // ── Jadwal Dokter ────────────────────────────────────────────────────────
  if (doctors[0]) {
    const { count: schedCount } = await db.from('doctor_schedules')
      .select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId)

    if (!schedCount || schedCount === 0) {
      await db.from('doctor_schedules').insert([
        // Dr. Sarah — Senin s/d Jumat pagi
        { clinic_id: clinicId, doctor_id: doctors[0].id, day_of_week: 1, start_time: '08:00', end_time: '14:00', max_patients: 15, is_active: true },
        { clinic_id: clinicId, doctor_id: doctors[0].id, day_of_week: 2, start_time: '08:00', end_time: '14:00', max_patients: 15, is_active: true },
        { clinic_id: clinicId, doctor_id: doctors[0].id, day_of_week: 3, start_time: '08:00', end_time: '14:00', max_patients: 15, is_active: true },
        { clinic_id: clinicId, doctor_id: doctors[0].id, day_of_week: 4, start_time: '08:00', end_time: '14:00', max_patients: 15, is_active: true },
        { clinic_id: clinicId, doctor_id: doctors[0].id, day_of_week: 5, start_time: '08:00', end_time: '12:00', max_patients: 10, is_active: true },
        // Dr. Budi — Senin, Rabu, Jumat sore
        ...(doctors[1] ? [
          { clinic_id: clinicId, doctor_id: doctors[1].id, day_of_week: 1, start_time: '13:00', end_time: '17:00', max_patients: 10, is_active: true },
          { clinic_id: clinicId, doctor_id: doctors[1].id, day_of_week: 3, start_time: '13:00', end_time: '17:00', max_patients: 10, is_active: true },
          { clinic_id: clinicId, doctor_id: doctors[1].id, day_of_week: 5, start_time: '13:00', end_time: '17:00', max_patients: 8,  is_active: true },
        ] : []),
        // Dr. Ahmad — Selasa, Kamis
        ...(doctors[2] ? [
          { clinic_id: clinicId, doctor_id: doctors[2].id, day_of_week: 2, start_time: '09:00', end_time: '15:00', max_patients: 12, is_active: true },
          { clinic_id: clinicId, doctor_id: doctors[2].id, day_of_week: 4, start_time: '09:00', end_time: '15:00', max_patients: 12, is_active: true },
          { clinic_id: clinicId, doctor_id: doctors[2].id, day_of_week: 6, start_time: '08:00', end_time: '12:00', max_patients: 8,  is_active: true },
        ] : []),
      ])
    }
  }

  // ── Pasien ───────────────────────────────────────────────────────────────
  const { data: existPats } = await db.from('patients').select('id').eq('clinic_id', clinicId)
  let patients: { id: string }[] = existPats ?? []
  if (patients.length === 0) {
    const { data: p } = await db.from('patients').insert([
      { clinic_id: clinicId, no_rm: 'RM-2026-0001', full_name: 'Andi Wijaya',    phone: '081234567001', gender: 'male',   blood_type: 'O+',  date_of_birth: '1994-03-15', allergies: 'Penisilin', height: 172, weight: 68 },
      { clinic_id: clinicId, no_rm: 'RM-2026-0002', full_name: 'Siti Nurhaliza', phone: '081234567002', gender: 'female', blood_type: 'A+',  date_of_birth: '1998-07-22', height: 158, weight: 52 },
      { clinic_id: clinicId, no_rm: 'RM-2026-0003', full_name: 'Rudi Hartono',   phone: '081234567003', gender: 'male',   blood_type: 'B+',  date_of_birth: '1979-11-08', height: 168, weight: 75 },
      { clinic_id: clinicId, no_rm: 'RM-2026-0004', full_name: 'Maya Lestari',   phone: '081234567004', gender: 'female', blood_type: 'AB+', date_of_birth: '1991-05-30', height: 160, weight: 55 },
    ]).select('id')
    patients = p ?? []
  }

  if (!doctors[0] || !patients[0]) return

  // ── Appointment hari ini ─────────────────────────────────────────────────
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const { data: existApts } = await db.from('appointments').select('id')
    .eq('clinic_id', clinicId).gte('scheduled_at', todayStart.toISOString())

  if (!existApts || existApts.length === 0) {
    const now = new Date()
    const dt  = (h: number, m: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).toISOString()
    await db.from('appointments').insert([
      { clinic_id: clinicId, patient_id: patients[0].id, doctor_id: doctors[0].id, scheduled_at: dt(9,0),  complaint: 'Demam dan batuk',       status: 'menunggu',  type: 'booking', queue_number: 1 },
      { clinic_id: clinicId, patient_id: patients[1].id, doctor_id: doctors[0].id, scheduled_at: dt(9,30), complaint: 'Sakit kepala',           status: 'dipanggil', type: 'booking', queue_number: 2 },
      { clinic_id: clinicId, patient_id: patients[2].id, doctor_id: doctors[0].id, scheduled_at: dt(10,0), complaint: 'Kontrol tekanan darah',  status: 'diperiksa', type: 'walkin',  queue_number: 3 },
      { clinic_id: clinicId, patient_id: patients[3].id, doctor_id: doctors[0].id, scheduled_at: dt(10,30),complaint: 'Nyeri sendi',            status: 'selesai',   type: 'booking', queue_number: 4 },
    ])
  }

  // ── Medical Records ───────────────────────────────────────────────────────
  if (doctors[0] && patients[0]) {
    const { count: mrCount } = await db.from('medical_records')
      .select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId)

    if (!mrCount || mrCount === 0) {
      const prevMonth = (offset: number) => {
        const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString()
      }
      const { data: mr1 } = await db.from('medical_records').insert({
        clinic_id: clinicId, patient_id: patients[0].id, doctor_id: doctors[0].id,
        blood_pressure_sys: 125, blood_pressure_dia: 82, temperature: 37.2, weight: 68, heart_rate: 78,
        chief_complaint: 'Batuk berdahak 5 hari, demam ringan',
        diagnoses: ['ISPA Ringan', 'Faringitis'],
        treatment: 'Istirahat, banyak minum air putih, kompres demam',
        notes: 'Pasien disarankan kontrol ulang jika tidak membaik dalam 3 hari',
        created_at: prevMonth(10),
      }).select('id').single()

      if (mr1) {
        await db.from('prescriptions').insert([
          { clinic_id: clinicId, medical_record_id: mr1.id, medication_name: 'Paracetamol 500mg', dosage: '500mg', frequency: '3×/hari', duration: '5 hari' },
          { clinic_id: clinicId, medical_record_id: mr1.id, medication_name: 'Ambroxol', dosage: '30mg', frequency: '3×/hari', duration: '5 hari' },
          { clinic_id: clinicId, medical_record_id: mr1.id, medication_name: 'Vitamin C', dosage: '500mg', frequency: '1×/hari', duration: '7 hari' },
        ])
      }

      if (patients[2]) {
        const { data: mr2 } = await db.from('medical_records').insert({
          clinic_id: clinicId, patient_id: patients[2].id, doctor_id: doctors[2] ? doctors[2].id : doctors[0].id,
          blood_pressure_sys: 145, blood_pressure_dia: 92, temperature: 36.8, weight: 75, heart_rate: 82,
          chief_complaint: 'Kontrol tekanan darah rutin, pusing sesekali',
          diagnoses: ['Hipertensi Grade 1'],
          treatment: 'Modifikasi gaya hidup: kurangi garam, olahraga rutin, hindari stres',
          notes: 'Lanjutkan amlodipine. Kontrol ulang 1 bulan',
          created_at: prevMonth(20),
        }).select('id').single()

        if (mr2) {
          await db.from('prescriptions').insert([
            { clinic_id: clinicId, medical_record_id: mr2.id, medication_name: 'Amlodipine 5mg', dosage: '5mg', frequency: '1×/hari (malam)', duration: 'Rutin' },
            { clinic_id: clinicId, medical_record_id: mr2.id, medication_name: 'Captopril 12.5mg', dosage: '12.5mg', frequency: '2×/hari', duration: 'Rutin' },
          ])
        }
      }
    }
  }

  // ── Billing ───────────────────────────────────────────────────────────────
  const { data: existBills } = await db.from('billing').select('id').eq('clinic_id', clinicId)
  if (!existBills || existBills.length === 0) {
    await db.from('billing').insert([
      { clinic_id: clinicId, patient_id: patients[0].id, invoice_number: 'INV-202605-0001', items: JSON.stringify([{name:'Konsultasi Umum',qty:1,price:150000},{name:'Obat',qty:1,price:45000}]),       subtotal:195000, total:195000, status:'paid',    payment_method:'cash',     paid_at: new Date().toISOString() },
      { clinic_id: clinicId, patient_id: patients[1].id, invoice_number: 'INV-202605-0002', items: JSON.stringify([{name:'Konsultasi Umum',qty:1,price:150000}]),                                        subtotal:150000, total:150000, status:'pending'                              },
      { clinic_id: clinicId, patient_id: patients[2].id, invoice_number: 'INV-202605-0003', items: JSON.stringify([{name:'Konsultasi Spesialis',qty:1,price:300000},{name:'Lab Check',qty:1,price:75000}]), subtotal:375000, total:375000, status:'paid', payment_method:'transfer', paid_at: new Date().toISOString() },
      { clinic_id: clinicId, patient_id: patients[3].id, invoice_number: 'INV-202605-0004', items: JSON.stringify([{name:'Konsultasi Umum',qty:1,price:150000}]),                                        subtotal:150000, total:150000, status:'pending'                              },
    ])
  }
}

/** Compatible dengan code lama */
export async function seedDemoClinic(db: SupabaseClient, adminUserId: string) {
  const clinicId = await getOrCreateDemoClinic(db)
  if (!clinicId) return null
  await db.from('users').update({ clinic_id: clinicId }).eq('id', adminUserId)
  await seedDemoData(db, clinicId)
  return clinicId
}
