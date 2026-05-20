'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/TopBar'
import { Save, Plus, Trash2, Eye, EyeOff, Send, Bell, RefreshCw } from 'lucide-react'

const INPUT_CLS = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all'
const LABEL_CLS = 'block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5'

type Doctor = { id?: string; full_name: string; specialty: string; consultation_fee: number; is_active: boolean }

type Notification = {
  id: string
  type: string
  recipient: string
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  appointment_reminder:  'Reminder',
  appointment_confirmed: 'Konfirmasi',
  appointment_cancelled: 'Batal',
  billing_invoice:       'Invoice',
  general:               'Umum',
}

function fmtDt(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default function SettingsPage() {
  const [clinic, setClinic]     = useState({ name: '', address: '', phone: '', email: '', fonnte_token: '' })
  const [doctors, setDoctors]   = useState<Doctor[]>([])
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [showToken, setShowToken] = useState(false)

  const [testLoading, setTestLoading]     = useState(false)
  const [testResult, setTestResult]       = useState<string | null>(null)
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [bulkResult, setBulkResult]       = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifsLoading, setNotifsLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    setNotifsLoading(true)
    try {
      const res = await fetch('/api/admin/notifications')
      const data = await res.json() as { notifications: Notification[] }
      setNotifications(data.notifications ?? [])
    } finally {
      setNotifsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/admin/clinic-settings').then(r => r.json()).then((d: { clinic?: typeof clinic; doctors?: Doctor[] }) => {
      if (d.clinic)  setClinic(prev => ({ ...prev, ...(d.clinic as typeof prev) }))
      if (d.doctors) setDoctors(d.doctors)
    })
    loadNotifications()
  }, [loadNotifications])

  function setC(k: string, v: string) { setClinic(c => ({ ...c, [k]: v })) }
  function setD(i: number, k: string, v: string | number | boolean) {
    setDoctors(ds => ds.map((d, idx) => idx === i ? { ...d, [k]: v } : d))
  }
  function addDoctor() { setDoctors(ds => [...ds, { full_name: '', specialty: '', consultation_fee: 150000, is_active: true }]) }
  function removeDoctor(i: number) { setDoctors(ds => ds.filter((_, idx) => idx !== i)) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/admin/clinic-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinic, doctors }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleTestWA() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/notifications/test', { method: 'POST' })
      const data = await res.json() as { success?: boolean; error?: string }
      setTestResult(data.success ? '✅ Pesan test berhasil dikirim!' : `❌ Gagal: ${data.error ?? 'Unknown error'}`)
      if (data.success) loadNotifications()
    } catch {
      setTestResult('❌ Gagal menghubungi server')
    } finally {
      setTestLoading(false)
    }
  }

  async function handleBulkReminder() {
    setBulkLoading(true)
    setBulkResult(null)
    try {
      const res = await fetch('/api/admin/notifications/reminder-bulk', { method: 'POST' })
      const data = await res.json() as { sent?: number; failed?: number; message?: string; error?: string }
      if (data.error) {
        setBulkResult(`❌ ${data.error}`)
      } else {
        setBulkResult(`✅ Terkirim: ${data.sent ?? 0} | Gagal: ${data.failed ?? 0}`)
        loadNotifications()
      }
    } catch {
      setBulkResult('❌ Gagal menghubungi server')
    } finally {
      setBulkLoading(false)
    }
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
                        <input value={doc.full_name} onChange={e => setD(i, 'full_name', e.target.value)} placeholder="Dr. Nama Dokter" className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Biaya Konsultasi</label>
                        <input type="number" value={doc.consultation_fee} onChange={e => setD(i, 'consultation_fee', Number(e.target.value))} className={INPUT_CLS} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className={LABEL_CLS}>Spesialisasi</label>
                        <input value={doc.specialty} onChange={e => setD(i, 'specialty', e.target.value)} placeholder="Dokter Umum / Spesialis..." className={INPUT_CLS} />
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <label className="flex items-center gap-2 text-sm font-bold text-secondary cursor-pointer">
                          <input type="checkbox" checked={doc.is_active} onChange={e => setD(i, 'is_active', e.target.checked)} className="w-4 h-4 accent-primary" />
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

          {/* Notifikasi WhatsApp */}
          <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={18} className="text-primary" />
              <h2 className="font-black text-secondary text-base">Notifikasi WhatsApp</h2>
            </div>

            <div className="mb-4">
              <label className={LABEL_CLS}>Fonnte API Token</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={clinic.fonnte_token}
                  onChange={e => setC('fonnte_token', e.target.value)}
                  placeholder="Masukkan token dari app.fonnte.com"
                  className={INPUT_CLS + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!clinic.fonnte_token && (
                <p className="text-xs text-amber-600 mt-1.5 font-medium">
                  ⚠️ Token belum diisi — notifikasi WA tidak akan berfungsi.
                  Daftar di <a href="https://app.fonnte.com" target="_blank" rel="noopener noreferrer" className="underline">app.fonnte.com</a>.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <button
                type="button"
                onClick={handleTestWA}
                disabled={testLoading || !clinic.fonnte_token}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <Send size={14} />
                {testLoading ? 'Mengirim...' : 'Test Kirim WA'}
              </button>
              <button
                type="button"
                onClick={handleBulkReminder}
                disabled={bulkLoading || !clinic.fonnte_token}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <Bell size={14} />
                {bulkLoading ? 'Mengirim...' : 'Kirim Reminder Besok'}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm font-bold text-blue-700">Reminder Otomatis Aktif</p>
              </div>
              <p className="text-xs text-blue-600">
                WA reminder dikirim otomatis setiap hari pukul 18.00 WIB kepada pasien yang memiliki appointment besok.
              </p>
            </div>

            {testResult && (
              <p className={`text-sm font-medium mb-4 ${testResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {testResult}
              </p>
            )}
            {bulkResult && (
              <p className={`text-sm font-medium mb-4 ${bulkResult.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {bulkResult}
              </p>
            )}

            {/* Recent notifications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">10 Notifikasi Terakhir</p>
                <button type="button" onClick={loadNotifications} className="text-gray-400 hover:text-primary transition-colors" aria-label="Refresh">
                  <RefreshCw size={14} className={notifsLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Belum ada notifikasi terkirim</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Waktu</th>
                        <th className="text-left px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Tipe</th>
                        <th className="text-left px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Nomor</th>
                        <th className="text-center px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {notifications.map(n => (
                        <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-500">{fmtDt(n.created_at)}</td>
                          <td className="px-3 py-2.5 text-gray-700 font-medium">{TYPE_LABEL[n.type] ?? n.type}</td>
                          <td className="px-3 py-2.5 text-gray-500 font-mono">{n.recipient}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              n.status === 'sent'    ? 'bg-green-100 text-green-700' :
                              n.status === 'failed'  ? 'bg-red-100 text-red-600'    :
                                                       'bg-gray-100 text-gray-500'
                            }`}>
                              {n.status === 'sent' ? 'Terkirim' : n.status === 'failed' ? 'Gagal' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
