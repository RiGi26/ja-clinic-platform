'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/TopBar'
import { UserPlus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Doctor = { id: string; full_name: string; specialty: string }

const INPUT_CLS = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all'
const LABEL_CLS = 'block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5'

export default function WalkInPage() {
  const [doctors, setDoctors]   = useState<Doctor[]>([])
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [form, setForm]         = useState({
    full_name: '', phone: '', gender: '', date_of_birth: '',
    doctor_id: '', complaint: '', time: '', email: '',
  })

  useEffect(() => {
    fetch('/api/admin/clinic-doctors').then(r => r.json()).then(d => setDoctors(d.doctors ?? []))
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res  = await fetch('/api/admin/walkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setSuccess(true)
      setForm({ full_name:'', phone:'', gender:'', date_of_birth:'', doctor_id:'', complaint:'', time:'', email:'' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Daftarkan Pasien Walk-in" subtitle="Pasien datang langsung tanpa booking" showSearch={false} />
      <div className="p-8 max-w-2xl mx-auto">
        <Link href="/admin" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary mb-6 font-bold transition-colors">
          <ArrowLeft size={15} /> Kembali ke Dashboard
        </Link>

        {success && (
          <div className="bg-success/10 border border-success/20 rounded-2xl p-4 mb-6 text-success font-bold text-sm">
            ✅ Pasien berhasil didaftarkan! Nomor antrian diberikan otomatis.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-black text-secondary text-base">Data Pasien Walk-in</h2>
              <p className="text-xs text-muted-foreground">Isi data pasien dan pilih dokter</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={LABEL_CLS}>Nama Lengkap *</label>
                <input required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nama pasien" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>No. HP</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xxxxxxxxxx" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Email (untuk notifikasi)</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="pasien@email.com (opsional)" className={INPUT_CLS} />
                <p className="text-xs text-gray-400 mt-1">Opsional — untuk mengirim konfirmasi appointment via email</p>
              </div>
              <div>
                <label className={LABEL_CLS}>Jenis Kelamin</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={INPUT_CLS}>
                  <option value="">Pilih...</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Tanggal Lahir</label>
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Jam Kunjungan *</label>
                <input required type="time" value={form.time} onChange={e => set('time', e.target.value)} className={INPUT_CLS} />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Pilih Dokter *</label>
                <select required value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)} className={INPUT_CLS}>
                  <option value="">Pilih dokter...</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} — {d.specialty}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Keluhan</label>
                <textarea rows={3} value={form.complaint} onChange={e => set('complaint', e.target.value)} placeholder="Keluhan pasien..." className={`${INPUT_CLS} resize-none`} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-primary text-white font-black rounded-xl hover:bg-primary-hover transition-all text-sm shadow-sm disabled:opacity-60">
              {loading ? 'Mendaftarkan...' : '+ Daftarkan Pasien'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
