import { SupabaseClient } from '@supabase/supabase-js'

const DEMO_CLINIC_SLUG = 'demo-clinic'

export async function seedDemoClinic(db: SupabaseClient, adminUserId: string) {
  // 1. Cari atau buat clinic demo
  let { data: clinic } = await db.from('clinics').select('id').eq('slug', DEMO_CLINIC_SLUG).single()

  if (!clinic) {
    const { data: newClinic } = await db.from('clinics').insert({
      name: 'Klinik Demo Platform',
      slug: DEMO_CLINIC_SLUG,
      address: 'Jakarta, Indonesia',
      phone: '021-12345678',
      plan: 'trial',
      is_active: true,
    }).select('id').single()
    clinic = newClinic
  }

  if (!clinic) return null
  const clinicId = clinic.id

  // 2. Link admin user ke clinic
  await db.from('users').update({ clinic_id: clinicId }).eq('id', adminUserId)

  // 3. Buat dokter demo jika belum ada
  const { data: existDoctors } = await db.from('doctors').select('id').eq('clinic_id', clinicId)
  if (!existDoctors || existDoctors.length === 0) {
    await db.from('doctors').insert([
      { clinic_id: clinicId, full_name: 'Dr. Sarah Putri',  specialty: 'Dokter Umum',                 consultation_fee: 150000, is_active: true },
      { clinic_id: clinicId, full_name: 'Dr. Budi Santoso', specialty: 'Spesialis Anak',               consultation_fee: 250000, is_active: true },
      { clinic_id: clinicId, full_name: 'Dr. Ahmad Fauzi',  specialty: 'Spesialis Penyakit Dalam',     consultation_fee: 300000, is_active: true },
    ])
  }

  const { data: doctors } = await db.from('doctors').select('id, full_name').eq('clinic_id', clinicId)

  // 4. Buat pasien demo jika belum ada
  const { data: existPatients } = await db.from('patients').select('id').eq('clinic_id', clinicId)
  if (!existPatients || existPatients.length === 0) {
    await db.from('patients').insert([
      { clinic_id: clinicId, no_rm: 'RM-2026-0001', full_name: 'Andi Wijaya',    phone: '081234567001', gender: 'male',   blood_type: 'O+', date_of_birth: '1994-03-15' },
      { clinic_id: clinicId, no_rm: 'RM-2026-0002', full_name: 'Siti Nurhaliza', phone: '081234567002', gender: 'female', blood_type: 'A+', date_of_birth: '1998-07-22' },
      { clinic_id: clinicId, no_rm: 'RM-2026-0003', full_name: 'Rudi Hartono',   phone: '081234567003', gender: 'male',   blood_type: 'B+', date_of_birth: '1979-11-08' },
      { clinic_id: clinicId, no_rm: 'RM-2026-0004', full_name: 'Maya Lestari',   phone: '081234567004', gender: 'female', blood_type: 'AB+',date_of_birth: '1991-05-30' },
    ])
  }

  const { data: patients } = await db.from('patients').select('id').eq('clinic_id', clinicId)

  // 5. Buat appointment hari ini jika belum ada
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const { data: existApts } = await db.from('appointments').select('id').eq('clinic_id', clinicId).gte('scheduled_at', todayStart.toISOString())

  if ((!existApts || existApts.length === 0) && doctors && patients) {
    const doc = doctors[0]?.id
    const now  = new Date()
    await db.from('appointments').insert([
      { clinic_id: clinicId, patient_id: patients[0]?.id, doctor_id: doc, scheduled_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0).toISOString(),  complaint: 'Demam dan batuk',          status: 'menunggu',  type: 'booking', queue_number: 1 },
      { clinic_id: clinicId, patient_id: patients[1]?.id, doctor_id: doc, scheduled_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30).toISOString(), complaint: 'Sakit kepala',             status: 'dipanggil', type: 'booking', queue_number: 2 },
      { clinic_id: clinicId, patient_id: patients[2]?.id, doctor_id: doc, scheduled_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString(), complaint: 'Kontrol tekanan darah',   status: 'diperiksa', type: 'walkin',  queue_number: 3 },
      { clinic_id: clinicId, patient_id: patients[3]?.id, doctor_id: doc, scheduled_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30).toISOString(),complaint: 'Nyeri sendi',             status: 'selesai',   type: 'booking', queue_number: 4 },
    ])
  }

  // 6. Buat billing demo jika belum ada
  const { data: existBills } = await db.from('billing').select('id').eq('clinic_id', clinicId)
  if ((!existBills || existBills.length === 0) && patients) {
    await db.from('billing').insert([
      { clinic_id: clinicId, patient_id: patients[0]?.id, invoice_number: 'INV-202605-0001', items: JSON.stringify([{name:'Konsultasi Umum',qty:1,price:150000}]), subtotal:150000, total:150000, status:'paid',    payment_method:'cash' },
      { clinic_id: clinicId, patient_id: patients[1]?.id, invoice_number: 'INV-202605-0002', items: JSON.stringify([{name:'Konsultasi Umum',qty:1,price:150000}]), subtotal:150000, total:150000, status:'pending' },
      { clinic_id: clinicId, patient_id: patients[2]?.id, invoice_number: 'INV-202605-0003', items: JSON.stringify([{name:'Konsultasi Spesialis',qty:1,price:300000}]), subtotal:300000, total:300000, status:'paid', payment_method:'transfer' },
    ])
  }

  return clinicId
}
