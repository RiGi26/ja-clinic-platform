import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

async function getAdminClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db.from('users').select('clinic_id, role').eq('id', user.id).single()
  if (!data?.clinic_id || data.role !== 'admin') return null
  return data.clinic_id as string
}

function escapeCSV(val: string | number | null | undefined): string {
  const str = String(val ?? '')
  return (str.includes(',') || str.includes('"') || str.includes('\n'))
    ? `"${str.replace(/"/g, '""')}"` : str
}

function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  return [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\r\n')
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}
function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
function fmtRupiah(n: number | null) {
  return n ? 'Rp ' + n.toLocaleString('id-ID') : ''
}

export async function GET(request: Request) {
  const clinicId = await getAdminClinicId()
  if (!clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'excel'
  const mode   = searchParams.get('mode') ?? 'month'
  const type   = searchParams.get('type') ?? 'all'

  const now   = new Date()
  let dateFrom: string
  let dateTo:   string

  if (mode === 'today') {
    dateFrom = dateTo = now.toISOString().split('T')[0]
  } else if (mode === 'custom') {
    dateFrom = searchParams.get('date_from') ?? now.toISOString().split('T')[0]
    dateTo   = searchParams.get('date_to')   ?? now.toISOString().split('T')[0]
  } else {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    dateTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  }

  const from = dateFrom + 'T00:00:00.000Z'
  const to   = dateTo   + 'T23:59:59.999Z'

  const db = createAdminClient()
  const include = (t: string) => type === 'all' || type === t

  const [apptRes, revenueRes, medRes, shiftRes] = await Promise.all([
    include('appointments') ? db.from('appointments')
      .select('scheduled_at, status, type, complaint, queue_number, jenis_kunjungan, patients(full_name, no_rm, jenis_penjamin), doctors(full_name)')
      .eq('clinic_id', clinicId).gte('scheduled_at', from).lte('scheduled_at', to).order('scheduled_at') : Promise.resolve({ data: null }),
    include('revenue') ? db.from('billing')
      .select('created_at, invoice_number, total, status, payment_method, patients(full_name, no_rm)')
      .eq('clinic_id', clinicId).gte('created_at', from).lte('created_at', to).order('created_at') : Promise.resolve({ data: null }),
    include('medicines') ? db.from('medicine_transactions')
      .select('created_at, type, quantity, stock_before, stock_after, reference, notes, medicines(name, unit)')
      .eq('clinic_id', clinicId).gte('created_at', from).lte('created_at', to).order('created_at') : Promise.resolve({ data: null }),
    include('shifts') ? db.from('staff_shifts')
      .select('date, shift, status, notes, users(full_name, role)')
      .eq('clinic_id', clinicId).gte('date', dateFrom).lte('date', dateTo).order('date') : Promise.resolve({ data: null }),
  ])

  const apptRows    = (apptRes.data ?? []) as any[]
  const revenueRows = (revenueRes.data ?? []) as any[]
  const medRows     = (medRes.data ?? []) as any[]
  const shiftRows   = (shiftRes.data ?? []) as any[]

  const fileDate = `${dateFrom}_${dateTo}`

  if (format === 'csv') {
    const single = type !== 'all'
    let csvContent = ''
    let filename   = `laporan-${type}-${fileDate}.csv`

    if (include('appointments')) {
      const header = ['Tanggal', 'Jam', 'Nama Pasien', 'No.RM', 'Dokter', 'Status', 'Jenis', 'Penjamin', 'Keluhan']
      const rows   = apptRows.map(a => [
        fmtDate(a.scheduled_at), fmtTime(a.scheduled_at),
        (a.patients as any)?.full_name, (a.patients as any)?.no_rm,
        (a.doctors as any)?.full_name, a.status, a.type,
        (a.patients as any)?.jenis_penjamin, a.complaint,
      ])
      csvContent += (single ? '' : 'Appointment\r\n') + toCSV(header, rows) + '\r\n\r\n'
      if (single) filename = `laporan-appointments-${fileDate}.csv`
    }
    if (include('revenue')) {
      const header = ['Tanggal', 'No.Invoice', 'Nama Pasien', 'No.RM', 'Total', 'Status', 'Metode Bayar']
      const rows   = revenueRows.map(b => [
        fmtDate(b.created_at), b.invoice_number,
        (b.patients as any)?.full_name, (b.patients as any)?.no_rm,
        b.total, b.status, b.payment_method,
      ])
      csvContent += (single ? '' : 'Pendapatan\r\n') + toCSV(header, rows) + '\r\n\r\n'
    }
    if (include('medicines')) {
      const header = ['Tanggal', 'Nama Obat', 'Tipe', 'Qty', 'Stok Sebelum', 'Stok Sesudah', 'Referensi', 'Catatan']
      const rows   = medRows.map(m => [
        fmtDate(m.created_at), (m.medicines as any)?.name, m.type, m.quantity,
        m.stock_before, m.stock_after, m.reference, m.notes,
      ])
      csvContent += (single ? '' : 'Stok Obat\r\n') + toCSV(header, rows) + '\r\n\r\n'
    }
    if (include('shifts')) {
      const header = ['Tanggal', 'Nama Staf', 'Role', 'Shift', 'Status', 'Catatan']
      const rows   = shiftRows.map(s => [
        s.date, (s.users as any)?.full_name, (s.users as any)?.role, s.shift, s.status, s.notes,
      ])
      csvContent += (single ? '' : 'Absensi\r\n') + toCSV(header, rows)
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // Excel
  const wb = XLSX.utils.book_new()

  if (include('appointments') && apptRows.length >= 0) {
    const rows = apptRows.map(a => ({
      'Tanggal':   fmtDate(a.scheduled_at),
      'Jam':       fmtTime(a.scheduled_at),
      'Nama Pasien': (a.patients as any)?.full_name ?? '',
      'No.RM':     (a.patients as any)?.no_rm ?? '',
      'Dokter':    (a.doctors as any)?.full_name ?? '',
      'Status':    a.status,
      'Jenis':     a.type,
      'Penjamin':  (a.patients as any)?.jenis_penjamin ?? 'umum',
      'Keluhan':   a.complaint ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Appointment')
  }

  if (include('revenue') && revenueRows.length >= 0) {
    const rows = revenueRows.map(b => ({
      'Tanggal':     fmtDate(b.created_at),
      'No.Invoice':  b.invoice_number,
      'Nama Pasien': (b.patients as any)?.full_name ?? '',
      'No.RM':       (b.patients as any)?.no_rm ?? '',
      'Total':       b.total ?? 0,
      'Status':      b.status,
      'Metode Bayar': b.payment_method ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Pendapatan')
  }

  if (include('medicines') && medRows.length >= 0) {
    const rows = medRows.map(m => ({
      'Tanggal':      fmtDate(m.created_at),
      'Nama Obat':    (m.medicines as any)?.name ?? '',
      'Tipe':         m.type,
      'Qty':          m.quantity,
      'Stok Sebelum': m.stock_before,
      'Stok Sesudah': m.stock_after,
      'Referensi':    m.reference ?? '',
      'Catatan':      m.notes ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Stok Obat')
  }

  if (include('shifts') && shiftRows.length >= 0) {
    const rows = shiftRows.map(s => ({
      'Tanggal':   s.date,
      'Nama Staf': (s.users as any)?.full_name ?? '',
      'Role':      (s.users as any)?.role ?? '',
      'Shift':     s.shift,
      'Status':    s.status,
      'Catatan':   s.notes ?? '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Absensi')
  }

  // Ensure at least one sheet
  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), 'Laporan')
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="laporan-${fileDate}.xlsx"`,
    },
  })
}
