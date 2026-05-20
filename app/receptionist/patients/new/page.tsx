'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const INPUT = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL = 'block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5'

export default function NewPatientPage() {
  const router = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [saved,    setSaved]    = useState<{ id: string; no_rm: string; name: string } | null>(null)
  const [error,    setError]    = useState('')
  const [form, setForm] = useState({
    full_name: '', phone: '', date_of_birth: '', gender: '',
    address: '', no_bpjs: '', jenis_penjamin: 'umum',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res  = await fetch('/api/receptionist/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json() as { success?: boolean; patient?: { id: string; no_rm: string; full_name: string }; error?: string }
    if (res.ok && data.patient) {
      setSaved({ id: data.patient.id, no_rm: data.patient.no_rm, name: data.patient.full_name })
    } else {
      setError(data.error ?? 'Gagal mendaftarkan pasien')
    }
    setLoading(false)
  }

  if (saved) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-emerald-600" />
          </div>
          <h2 className="font-black text-secondary text-xl mb-1">Pasien Terdaftar!</h2>
          <p className="text-muted-foreground mb-4">{saved.name}</p>
          <div className="bg-primary/5 rounded-xl p-4 mb-6 inline-block">
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-0.5">No. Rekam Medis</p>
            <p className="text-2xl font-black text-primary">{saved.no_rm}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => {
              setSaved(null)
              setForm({ full_name:'', phone:'', date_of_birth:'', gender:'', address:'', no_bpjs:'', jenis_penjamin:'umum' })
            }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
              Daftar Lagi
            </button>
            <Link href="/receptionist/checkin"
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors text-center">
              Buat Appointment
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-secondary">Daftarkan Pasien Baru</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Isi data pasien untuk membuat rekam medis baru</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-black text-secondary text-base">Data Pasien</h2>
            <p className="text-xs text-muted-foreground">Semua field wajib kecuali yang opsional</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-sm text-red-600 font-medium">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={LABEL}>Nama Lengkap *</label>
              <input required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nama lengkap pasien" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>No. Telepon</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Tanggal Lahir</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Jenis Kelamin</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={INPUT}>
                <option value="">Pilih...</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Jenis Penjamin</label>
              <select value={form.jenis_penjamin} onChange={e => set('jenis_penjamin', e.target.value)} className={INPUT}>
                <option value="umum">Umum / Mandiri</option>
                <option value="bpjs">BPJS Kesehatan</option>
                <option value="asuransi">Asuransi Swasta</option>
              </select>
            </div>
            {form.jenis_penjamin === 'bpjs' && (
              <div>
                <label className={LABEL}>No. Kartu BPJS</label>
                <input value={form.no_bpjs} onChange={e => set('no_bpjs', e.target.value)} placeholder="89xxxxxxxxxxxxxx" className={INPUT} />
              </div>
            )}
            <div className={form.jenis_penjamin === 'bpjs' ? '' : 'col-span-2'}>
              <label className={LABEL}>Alamat</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Alamat lengkap..." className={INPUT} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-primary text-white font-black rounded-xl hover:bg-primary-hover transition-all text-sm shadow-sm disabled:opacity-60">
            {loading ? 'Mendaftarkan...' : '+ Daftarkan Pasien'}
          </button>
        </form>
      </div>
    </div>
  )
}
