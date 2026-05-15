'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/TopBar'
import { Save, Plus, Trash2 } from 'lucide-react'

const INPUT_CLS = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL_CLS = 'block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5'

type Doctor = { id?: string; full_name: string; specialty: string; consultation_fee: number; is_active: boolean }

export default function SettingsPage() {
  const [clinic, setClinic]   = useState({ name:'', address:'', phone:'', email:'' })
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    fetch('/api/admin/clinic-settings').then(r => r.json()).then(d => {
      if (d.clinic)  setClinic(d.clinic)
      if (d.doctors) setDoctors(d.doctors)
    })
  }, [])

  function setC(k: string, v: string) { setClinic(c => ({ ...c, [k]: v })) }
  function setD(i: number, k: string, v: string | number | boolean) {
    setDoctors(ds => ds.map((d, idx) => idx === i ? { ...d, [k]: v } : d))
  }
  function addDoctor() { setDoctors(ds => [...ds, { full_name:'', specialty:'', consultation_fee:150000, is_active:true }]) }
  function removeDoctor(i: number) { setDoctors(ds => ds.filter((_, idx) => idx !== i)) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/admin/clinic-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic, doctors }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Pengaturan Klinik" subtitle="Kelola informasi dan dokter klinik" showSearch={false} />
      <div className="p-8 max-w-3xl mx-auto">
        {saved && (
          <div className="bg-success/10 border border-success/20 rounded-2xl p-4 mb-6 text-success font-bold text-sm">
            ✅ Pengaturan berhasil disimpan
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Clinic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
            <h2 className="font-black text-secondary text-base mb-5">Informasi Klinik</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={LABEL_CLS}>Nama Klinik *</label>
                <input required value={clinic.name} onChange={e => setC('name', e.target.value)} placeholder="Nama klinik Anda" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>No. Telepon</label>
                <input value={clinic.phone} onChange={e => setC('phone', e.target.value)} placeholder="021-xxxxxxxx" className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Email</label>
                <input type="email" value={clinic.email} onChange={e => setC('email', e.target.value)} placeholder="info@klinik.com" className={INPUT_CLS} />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Alamat</label>
                <textarea rows={2} value={clinic.address} onChange={e => setC('address', e.target.value)} placeholder="Alamat lengkap klinik" className={`${INPUT_CLS} resize-none`} />
              </div>
            </div>
          </div>

          {/* Doctors */}
          <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-secondary text-base">Daftar Dokter</h2>
              <button type="button" onClick={addDoctor}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm">
                <Plus size={14} /> Tambah Dokter
              </button>
            </div>

            {doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada dokter. Klik &quot;Tambah Dokter&quot; untuk menambahkan.</p>
            ) : (
              <div className="space-y-4">
                {doctors.map((doc, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-2">
                        <label className={LABEL_CLS}>Nama Dokter</label>
                        <input value={doc.full_name} onChange={e => setD(i,'full_name',e.target.value)} placeholder="Dr. Nama Dokter" className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Biaya Konsultasi</label>
                        <input type="number" value={doc.consultation_fee} onChange={e => setD(i,'consultation_fee',Number(e.target.value))} className={INPUT_CLS} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className={LABEL_CLS}>Spesialisasi</label>
                        <input value={doc.specialty} onChange={e => setD(i,'specialty',e.target.value)} placeholder="Dokter Umum / Spesialis..." className={INPUT_CLS} />
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-secondary cursor-pointer">
                          <input type="checkbox" checked={doc.is_active} onChange={e => setD(i,'is_active',e.target.checked)} className="w-4 h-4 accent-primary" />
                          Aktif
                        </label>
                        <button type="button" onClick={() => removeDoctor(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3.5 bg-primary text-white font-black rounded-xl hover:bg-primary-hover transition-all text-sm shadow-sm disabled:opacity-60 flex items-center justify-center gap-2">
            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>
      </div>
    </div>
  )
}
