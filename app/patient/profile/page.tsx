'use client'

import { useState, useEffect } from 'react'
import TopBar from '@/components/TopBar'
import { Loader2, CheckCircle, User, Phone, Calendar, Droplets, Shield } from 'lucide-react'

const INPUT_CLS = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL_CLS = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

export default function PatientProfilePage() {
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [profile,  setProfile]  = useState<any>(null)

  useEffect(() => {
    fetch('/api/patient/profile')
      .then(r => r.json())
      .then(d => { setProfile(d.patient ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true); setSaved(false)
    const res = await fetch('/api/patient/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Profil Saya" subtitle="" showSearch={false} />
        <div className="p-8 text-center text-muted-foreground">Data pasien tidak ditemukan.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Profil Saya" subtitle={`No. RM: ${profile.no_rm ?? '—'}`} showSearch={false} />

      {saved && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm">
          <CheckCircle size={18} /> Profil berhasil diperbarui!
        </div>
      )}

      <div className="p-8 max-w-2xl mx-auto">

        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-2xl">
            {(profile.full_name ?? '').split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-black text-secondary">{profile.full_name}</h2>
            <p className="text-sm text-muted-foreground font-semibold">No. RM: {profile.no_rm ?? '—'}</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Info Pribadi */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
              <h3 className="font-black text-secondary">Informasi Pribadi</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={LABEL_CLS}>Nama Lengkap</label>
                <input type="text" value={profile.full_name ?? ''} readOnly
                  className={`${INPUT_CLS} bg-gray-50 cursor-not-allowed`} />
              </div>
              <div>
                <label className={LABEL_CLS}>Tanggal Lahir</label>
                <input type="date" value={profile.date_of_birth ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, date_of_birth: e.target.value }))}
                  className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Jenis Kelamin</label>
                <select value={profile.gender ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, gender: e.target.value }))}
                  className={INPUT_CLS}>
                  <option value="">-- Pilih --</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Alamat</label>
                <textarea value={profile.address ?? ''} rows={2}
                  onChange={e => setProfile((p:any) => ({ ...p, address: e.target.value }))}
                  className={`${INPUT_CLS} resize-none`} placeholder="Alamat lengkap..." />
              </div>
            </div>
          </div>

          {/* Kontak */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <Phone size={16} className="text-primary" />
              </div>
              <h3 className="font-black text-secondary">Kontak & Darurat</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>No. Telepon</label>
                <input type="tel" value={profile.phone ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, phone: e.target.value }))}
                  className={INPUT_CLS} placeholder="08xxxxxxxxxx" />
              </div>
              <div>
                <label className={LABEL_CLS}>Kontak Darurat</label>
                <input type="text" value={profile.emergency_contact ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, emergency_contact: e.target.value }))}
                  className={INPUT_CLS} placeholder="Nama kontak darurat" />
              </div>
              <div>
                <label className={LABEL_CLS}>Telepon Darurat</label>
                <input type="tel" value={profile.emergency_phone ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, emergency_phone: e.target.value }))}
                  className={INPUT_CLS} placeholder="08xxxxxxxxxx" />
              </div>
            </div>
          </div>

          {/* Data Medis */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                <Droplets size={16} className="text-red-500" />
              </div>
              <h3 className="font-black text-secondary">Data Medis</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Golongan Darah</label>
                <select value={profile.blood_type ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, blood_type: e.target.value }))}
                  className={INPUT_CLS}>
                  <option value="">-- Pilih --</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Alergi</label>
                <input type="text" value={profile.allergies ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, allergies: e.target.value }))}
                  className={INPUT_CLS} placeholder="Obat / makanan alergi..." />
              </div>
              <div>
                <label className={LABEL_CLS}>Tinggi Badan (cm)</label>
                <input type="number" value={profile.height ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, height: parseFloat(e.target.value) || null }))}
                  className={INPUT_CLS} placeholder="170" />
              </div>
              <div>
                <label className={LABEL_CLS}>Berat Badan (kg)</label>
                <input type="number" value={profile.weight ?? ''}
                  onChange={e => setProfile((p:any) => ({ ...p, weight: parseFloat(e.target.value) || null }))}
                  className={INPUT_CLS} placeholder="65" />
              </div>
            </div>
          </div>

          {/* Info Penjamin */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-cyan-50 rounded-xl flex items-center justify-center">
                <Shield size={16} className="text-cyan-600" />
              </div>
              <h3 className="font-black text-secondary">Info Penjamin</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Jenis Penjamin</label>
                <select value={profile.jenis_penjamin ?? 'umum'}
                  onChange={e => setProfile((p: any) => ({ ...p, jenis_penjamin: e.target.value }))}
                  className={INPUT_CLS}>
                  <option value="umum">Umum / Mandiri</option>
                  <option value="bpjs">BPJS Kesehatan</option>
                  <option value="asuransi">Asuransi Swasta</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>No. Kartu BPJS</label>
                <input type="text" value={profile.no_bpjs ?? ''}
                  onChange={e => setProfile((p: any) => ({ ...p, no_bpjs: e.target.value }))}
                  disabled={profile.jenis_penjamin !== 'bpjs'}
                  placeholder="89xxxxxxxxxxxxxx"
                  className={`${INPUT_CLS} disabled:bg-gray-50 disabled:cursor-not-allowed`} />
              </div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}
