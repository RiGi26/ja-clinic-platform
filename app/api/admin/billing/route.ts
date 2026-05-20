import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getClinicPlanStatus } from '@/lib/plan-guard'
import { sendAndLog } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id').eq('id', user.id).single()
  return data?.clinic_id ?? null
}

type BillingItem = { name: string; qty: number; price: number; subtotal: number }

function fmtRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const VALID_PAY_METHODS = ['cash', 'transfer', 'bpjs', 'insurance']

export async function POST(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { isExpired } = await getClinicPlanStatus(clinicId)
  if (isExpired) {
    return NextResponse.json(
      { error: 'Masa aktif klinik telah berakhir. Hubungi tim kami.' },
      { status: 403 }
    )
  }

  const body = await request.json() as {
    patient_id      : string
    appointment_id? : string
    items           : BillingItem[]
    discount?       : number
    payment_method? : string
    status?         : string
    notes?          : string
  }

  if (!body.patient_id) {
    return NextResponse.json({ error: 'patient_id wajib diisi' }, { status: 400 })
  }
  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: 'Minimal 1 item tagihan' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: invData } = await db.rpc('generate_invoice_number', { p_clinic_id: clinicId })
  const invoiceNumber = invData as string | null
  if (!invoiceNumber) {
    return NextResponse.json({ error: 'Gagal generate nomor invoice' }, { status: 500 })
  }

  const subtotal = body.items.reduce((sum, item) => sum + item.qty * item.price, 0)
  const discount = body.discount ?? 0
  const total    = subtotal - discount

  // Terima payment_method & status dari body (default: pending)
  const payMethod   = body.payment_method && VALID_PAY_METHODS.includes(body.payment_method)
    ? body.payment_method : null
  const billStatus  = body.status === 'paid' && payMethod ? 'paid' : 'pending'
  const paidAt      = billStatus === 'paid' ? new Date().toISOString() : null

  const { data: bill, error } = await db
    .from('billing')
    .insert({
      clinic_id      : clinicId,
      patient_id     : body.patient_id,
      appointment_id : body.appointment_id || null,
      invoice_number : invoiceNumber,
      items          : body.items,
      subtotal,
      discount,
      total,
      notes          : body.notes?.trim() || null,
      status         : billStatus,
      payment_method : payMethod,
      paid_at        : paidAt,
    })
    .select('id, invoice_number')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // WA invoice ke pasien — non-blocking
  if (billStatus === 'paid') {
    Promise.allSettled([
      (async () => {
        // Ambil data pasien (no HP)
        const { data: patient } = await db
          .from('patients')
          .select('full_name, phone')
          .eq('id', body.patient_id)
          .single()

        if (!patient?.phone) return

        // Ambil nama klinik + fonnte token
        const { data: clinic } = await db
          .from('clinics')
          .select('name, fonnte_token')
          .eq('id', clinicId)
          .single()

        if (!clinic?.fonnte_token) return

        // Ambil nama dokter dari appointment (opsional)
        let doctorName = ''
        if (body.appointment_id) {
          const { data: apt } = await db
            .from('appointments')
            .select('doctors(full_name)')
            .eq('id', body.appointment_id)
            .single()
          doctorName = (apt?.doctors as any)?.full_name ?? ''
        }

        const tgl = new Intl.DateTimeFormat('id-ID', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }).format(new Date())

        // Format rincian items
        const rincian = body.items.map(i =>
          `  • ${i.name}: ${fmtRupiah(i.qty * i.price)}`
        ).join('\n')

        const payLabel: Record<string, string> = {
          cash: 'Tunai', transfer: 'Transfer Bank',
          bpjs: 'BPJS', insurance: 'Asuransi',
        }

        const msg =
          `🧾 *Bukti Pembayaran — ${clinic.name}*\n\n` +
          `Pasien: ${patient.full_name}\n` +
          `Tanggal: ${tgl}\n` +
          (doctorName ? `Dokter: dr. ${doctorName}\n` : '') +
          `\nRincian:\n${rincian}` +
          (discount > 0 ? `\n  • Diskon: -${fmtRupiah(discount)}` : '') +
          `\n${'─'.repeat(24)}\n` +
          `*Total: ${fmtRupiah(total)}*\n` +
          `Metode: ${payLabel[payMethod ?? ''] ?? payMethod}\n\n` +
          `Terima kasih telah mempercayakan kesehatan Anda kepada kami. 🙏`

        await sendAndLog(db, clinicId, {
          type     : 'billing_invoice',
          recipient: patient.full_name,
          message  : msg,
          phone    : patient.phone,
          token    : clinic.fonnte_token,
        })
      })(),
    ]).catch(err => console.error('[billing] WA patient error:', err))
  }

  return NextResponse.json({
    success : true,
    bill,
    wa_sent : billStatus === 'paid',
  }, { status: 201 })
}

export async function GET(request: Request) {
  const clinicId = await getClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')
  const status = searchParams.get('status')

  const db = createAdminClient()
  let q = db.from('billing')
    .select(`
      id, invoice_number, total, subtotal, discount, status,
      payment_method, paid_at, created_at, appointment_id, notes,
      patients(id, full_name, no_rm)
    `)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })

  if (from)   q = q.gte('created_at', from)
  if (to)     q = q.lt('created_at', to)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bills: data ?? [] })
}
