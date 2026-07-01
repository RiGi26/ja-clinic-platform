'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, X, Loader2, AlertTriangle } from 'lucide-react'

const INPUT = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white'
const LABEL = 'text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2'

type Phase = 'before' | 'after' | 'progress'
type Photo = { id: string; phase: string; caption: string | null; created_at: string; url: string | null }

const PHASE_LABEL: Record<string, string> = { before: 'Sebelum', after: 'Sesudah', progress: 'Progres' }
const PHASE_BADGE: Record<string, string> = {
  before: 'bg-amber-100 text-amber-700',
  after: 'bg-emerald-100 text-emerald-700',
  progress: 'bg-blue-100 text-blue-700',
}

export default function SessionPhotoUpload({ appointmentId, patientId }: {
  appointmentId: string
  patientId: string
}) {
  const [photos, setPhotos]   = useState<Photo[]>([])
  const [phase, setPhase]     = useState<Phase>('before')
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Muat foto yang sudah ada untuk kunjungan ini
  useEffect(() => {
    fetch(`/api/doctor/records/photos?appointment_id=${appointmentId}`)
      .then(r => r.json())
      .then((d: { photos?: Photo[] }) => setPhotos(d.photos ?? []))
      .catch(() => {})
  }, [appointmentId])

  const onPick = useCallback(async (file: File) => {
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format harus JPG, PNG, atau WEBP'); return
    }
    if (file.size > 5 * 1024 * 1024) { setError('Ukuran maksimal 5 MB'); return }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('appointment_id', appointmentId)
    fd.append('patient_id', patientId)
    fd.append('phase', phase)
    fd.append('caption', caption)
    try {
      const res = await fetch('/api/doctor/records/photos', { method: 'POST', body: fd })
      const data = await res.json() as { photo?: Photo; error?: string }
      if (res.ok && data.photo) {
        setPhotos(p => [...p, data.photo!])
        setCaption('')
      } else {
        setError(data.error ?? 'Gagal mengunggah foto')
      }
    } catch {
      setError('Gagal mengunggah foto')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [appointmentId, patientId, phase, caption])

  async function remove(id: string) {
    const prev = photos
    setPhotos(p => p.filter(x => x.id !== id))
    const res = await fetch(`/api/doctor/records/photos?id=${id}`, { method: 'DELETE' })
    if (!res.ok) setPhotos(prev) // gagal → kembalikan
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Tahap Foto</label>
          <select value={phase} onChange={e => setPhase(e.target.value as Phase)} className={INPUT}>
            <option value="before">Sebelum</option>
            <option value="after">Sesudah</option>
            <option value="progress">Progres</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Keterangan (opsional)</label>
          <input value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="mis. postur berdiri, area lutut kanan" className={INPUT} />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f) }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {uploading ? 'Mengunggah...' : 'Ambil / Pilih Foto'}
      </button>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(ph => (
            <div key={ph.id} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              {ph.url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={ph.url} alt={ph.caption ?? PHASE_LABEL[ph.phase]} className="w-full h-32 object-cover" />
                : <div className="w-full h-32 flex items-center justify-center text-xs text-gray-400">Gambar</div>}
              <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${PHASE_BADGE[ph.phase] ?? 'bg-gray-100 text-gray-600'}`}>
                {PHASE_LABEL[ph.phase] ?? ph.phase}
              </span>
              <button
                type="button"
                onClick={() => remove(ph.id)}
                className="absolute top-2 right-2 p-1 bg-white/90 rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Hapus foto"
              >
                <X size={13} />
              </button>
              {ph.caption && <p className="px-2 py-1 text-[11px] text-secondary truncate">{ph.caption}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
