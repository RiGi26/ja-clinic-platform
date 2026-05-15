'use client'

import { useState } from 'react'
import TopBar from '@/components/TopBar'
import { Plus, X } from 'lucide-react'

const PREV_VISITS = [
  { date: '10 Mei 2026', diagnosis: 'Hipertensi Grade 1',  doctor: 'Dr. Sarah Putri' },
  { date: '25 Apr 2026', diagnosis: 'Check-up Rutin',      doctor: 'Dr. Sarah Putri' },
  { date: '15 Mar 2026', diagnosis: 'Flu & Batuk',         doctor: 'Dr. Budi Santoso' },
]

const INPUT_CLS = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all'
const LABEL_CLS = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

export default function MedicalRecordPage() {
  const [diagnoses,   setDiagnoses]   = useState([''])
  const [medications, setMedications] = useState([{ name: '', dosage: '', duration: '' }])

  const addDiagnosis    = () => setDiagnoses(d => [...d, ''])
  const removeDiagnosis = (i: number) => setDiagnoses(d => d.filter((_, idx) => idx !== i))

  const addMedication    = () => setMedications(m => [...m, { name: '', dosage: '', duration: '' }])
  const removeMedication = (i: number) => setMedications(m => m.filter((_, idx) => idx !== i))

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Input Rekam Medis" subtitle="Dokumentasi pemeriksaan pasien" showSearch={false} />

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">

          {/* Left: form (2 cols) */}
          <div className="col-span-2 space-y-5">

            {/* Vital Signs */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className={LABEL_CLS}>Vital Signs</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={LABEL_CLS}>Tekanan Darah</label>
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="120" className={`${INPUT_CLS} text-xl font-black text-center tabular-nums`} />
                    <span className="text-xl font-black text-muted-foreground">/</span>
                    <input type="text" placeholder="80"  className={`${INPUT_CLS} text-xl font-black text-center tabular-nums`} />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">mmHg</span>
                </div>
                <div>
                  <label className={LABEL_CLS}>Suhu Tubuh</label>
                  <input type="text" placeholder="36.5" className={`${INPUT_CLS} text-xl font-black text-center tabular-nums`} />
                  <span className="text-xs text-muted-foreground mt-1 block">°C</span>
                </div>
                <div>
                  <label className={LABEL_CLS}>Berat Badan</label>
                  <input type="text" placeholder="68"   className={`${INPUT_CLS} text-xl font-black text-center tabular-nums`} />
                  <span className="text-xs text-muted-foreground mt-1 block">kg</span>
                </div>
                <div>
                  <label className={LABEL_CLS}>Detak Jantung</label>
                  <input type="text" placeholder="72"   className={`${INPUT_CLS} text-xl font-black text-center tabular-nums`} />
                  <span className="text-xs text-muted-foreground mt-1 block">bpm</span>
                </div>
              </div>
            </div>

            {/* Keluhan */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <label className={LABEL_CLS}>Keluhan Pasien</label>
              <textarea rows={3} placeholder="Tulis keluhan utama pasien..." className={`${INPUT_CLS} resize-none`} />
            </div>

            {/* Diagnosis */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className={LABEL_CLS}>Diagnosis</h3>
                <button onClick={addDiagnosis} className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm">
                  <Plus size={14} /> Tambah
                </button>
              </div>
              <div className="space-y-2">
                {diagnoses.map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" placeholder="Tulis diagnosis..." className={INPUT_CLS} />
                    {diagnoses.length > 1 && (
                      <button onClick={() => removeDiagnosis(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors flex-shrink-0">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Resep */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className={LABEL_CLS}>Resep Obat</h3>
                <button onClick={addMedication} className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors font-bold text-sm">
                  <Plus size={14} /> Tambah Obat
                </button>
              </div>
              <div className="space-y-2">
                {medications.map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" placeholder="Nama obat"  className={`${INPUT_CLS} flex-1`} />
                    <input type="text" placeholder="Dosis"       className="w-28 px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                    <input type="text" placeholder="Durasi"      className="w-28 px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                    {medications.length > 1 && (
                      <button onClick={() => removeMedication(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors flex-shrink-0">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <label className={LABEL_CLS}>Catatan Dokter</label>
              <textarea rows={3} placeholder="Catatan tambahan..." className={`${INPUT_CLS} resize-none`} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 py-3.5 bg-white border border-gray-200 text-secondary rounded-xl hover:bg-gray-50 transition-colors font-bold text-sm">
                Simpan Draft
              </button>
              <button className="flex-1 py-3.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm shadow-sm">
                Simpan & Selesai
              </button>
            </div>
          </div>

          {/* Right: patient card (sticky) */}
          <div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-6">
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  AW
                </div>
                <div>
                  <h3 className="text-lg font-black text-secondary">Andi Wijaya</h3>
                  <p className="text-sm text-muted-foreground font-semibold">RM-2024-001</p>
                </div>
              </div>

              <div className="space-y-4 mb-5">
                {[
                  { label: 'Usia',           value: '32 tahun' },
                  { label: 'Golongan Darah', value: 'O+',      cls: 'text-destructive' },
                  { label: 'Berat / Tinggi', value: '68 kg / 172 cm' },
                ].map(row => (
                  <div key={row.label}>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{row.label}</p>
                    <p className={`text-sm font-bold ${row.cls ?? 'text-secondary'}`}>{row.value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Alergi</p>
                  <span className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold">Penisilin</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Riwayat Kunjungan</p>
                <div className="space-y-3">
                  {PREV_VISITS.map(v => (
                    <div key={v.date} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      <div>
                        <p className="text-xs font-bold text-secondary">{v.diagnosis}</p>
                        <p className="text-[11px] text-muted-foreground">{v.date} · {v.doctor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
