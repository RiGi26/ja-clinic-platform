'use client'

import { Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react'

export type RomEntry = { joint: string; before: number | null; after: number | null }
export type PhysioRecord = {
  id: string
  created_at: string
  rom_entries: RomEntry[] | null
  vas_pain_before: number | null
  vas_pain_after: number | null
  prescribed_exercises: string | null
  adherence_notes: string | null
  next_visit_target: string | null
  doctors: { full_name: string } | null
}
export type PhysioPhoto = { id: string; phase: string; caption: string | null; created_at: string; url: string | null }

const PHASE_LABEL: Record<string, string> = { before: 'Sebelum', after: 'Sesudah', progress: 'Progres' }
const PHASE_BADGE: Record<string, string> = {
  before: 'bg-amber-100 text-amber-700',
  after: 'bg-emerald-100 text-emerald-700',
  progress: 'bg-blue-100 text-blue-700',
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}
function hasPhysio(r: PhysioRecord) {
  return r.vas_pain_before != null || r.vas_pain_after != null ||
    (r.rom_entries?.length ?? 0) > 0 || !!r.prescribed_exercises || !!r.adherence_notes || !!r.next_visit_target
}
// Warna nyeri: hijau (rendah) → merah (tinggi)
function vasColor(v: number) {
  if (v <= 3) return 'bg-emerald-500'
  if (v <= 6) return 'bg-amber-500'
  return 'bg-red-500'
}

function Delta({ before, after, invert }: { before: number | null; after: number | null; invert?: boolean }) {
  if (before == null || after == null) return null
  const diff = after - before
  // invert=true → naik itu baik (ROM); false → turun itu baik (nyeri)
  const good = invert ? diff > 0 : diff < 0
  const bad = invert ? diff < 0 : diff > 0
  const Icon = diff === 0 ? Minus : diff > 0 ? TrendingUp : TrendingDown
  const cls = diff === 0 ? 'text-gray-400' : good ? 'text-emerald-600' : bad ? 'text-red-500' : 'text-gray-400'
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${cls}`}>
      <Icon size={12} /> {diff > 0 ? '+' : ''}{diff}
    </span>
  )
}

export default function PhysioProgress({ records, photos }: { records: PhysioRecord[]; photos: PhysioPhoto[] }) {
  // API mengirim desc (terbaru dulu) → tampilkan kronologis (lama → baru) untuk tren
  const sessions = records.filter(hasPhysio).slice().reverse()

  if (sessions.length === 0 && photos.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Belum ada data progres fisioterapi.</p>
  }

  const vasSessions = sessions.filter(s => s.vas_pain_before != null || s.vas_pain_after != null)

  return (
    <div className="space-y-8">
      {/* Tren nyeri VAS */}
      {vasSessions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-primary" />
            <h4 className="font-black text-secondary text-sm">Tren Nyeri (VAS 0–10)</h4>
          </div>
          <div className="space-y-3">
            {vasSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground w-24 flex-shrink-0">{fmtDate(s.created_at)}</span>
                <div className="flex-1 space-y-1.5">
                  {([['Pra', s.vas_pain_before], ['Pasca', s.vas_pain_after]] as [string, number | null][]).map(([lbl, v]) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 w-10 flex-shrink-0">{lbl}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        {v != null && <div className={`h-full rounded-full ${vasColor(v)}`} style={{ width: `${v * 10}%` }} />}
                      </div>
                      <span className="text-xs font-bold text-secondary w-6 text-right tabular-nums">{v ?? '—'}</span>
                    </div>
                  ))}
                </div>
                <div className="w-12 flex-shrink-0 text-right">
                  <Delta before={s.vas_pain_before} after={s.vas_pain_after} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail per sesi: ROM + catatan */}
      <div>
        <h4 className="font-black text-secondary text-sm mb-4">Catatan Sesi</h4>
        <div className="space-y-3">
          {sessions.slice().reverse().map(s => (
            <div key={s.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-secondary text-sm">{fmtDate(s.created_at)}</p>
                {s.doctors?.full_name && <p className="text-xs text-gray-400">dr. {s.doctors.full_name}</p>}
              </div>

              {(s.rom_entries?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Range of Motion</p>
                  <div className="space-y-1">
                    {s.rom_entries!.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-secondary flex-1">{r.joint}</span>
                        <span className="text-muted-foreground tabular-nums">{r.before ?? '—'}° → {r.after ?? '—'}°</span>
                        <span className="w-10 text-right"><Delta before={r.before} after={r.after} invert /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {[
                ['Latihan Diresepkan', s.prescribed_exercises],
                ['Kepatuhan', s.adherence_notes],
                ['Target Berikutnya', s.next_visit_target],
              ].map(([lbl, val]) => val && (
                <div key={lbl} className="mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{lbl}</p>
                  <p className="text-xs text-secondary whitespace-pre-wrap">{val}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Galeri foto */}
      {photos.length > 0 && (
        <div>
          <h4 className="font-black text-secondary text-sm mb-4">Galeri Foto</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map(p => (
              <a key={p.id} href={p.url ?? '#'} target="_blank" rel="noreferrer"
                className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 block">
                {p.url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.url} alt={p.caption ?? PHASE_LABEL[p.phase]} className="w-full h-28 object-cover" />
                  : <div className="w-full h-28 flex items-center justify-center text-xs text-gray-400">Gambar</div>}
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${PHASE_BADGE[p.phase] ?? 'bg-gray-100 text-gray-600'}`}>
                  {PHASE_LABEL[p.phase] ?? p.phase}
                </span>
                {p.caption && <p className="px-2 py-1 text-[10px] text-secondary truncate">{p.caption}</p>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
