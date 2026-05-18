import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SuperAdminUsersPage() {
  const db = createAdminClient()
  const { data: users } = await db
    .from('users')
    .select('id, full_name, email, role, status, clinic_id, created_at, clinics(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-gray-900 mb-2">Pengguna Platform</h1>
      <p className="text-gray-500 text-sm mb-6">{users?.length ?? 0} pengguna terdaftar</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nama', 'Email', 'Role', 'Klinik', 'Status', 'Bergabung'].map(h => (
                  <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-400 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users ?? []).map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-bold text-gray-800">{u.full_name}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                      u.role === 'superadmin' ? 'bg-violet-100 text-violet-700' :
                      u.role === 'admin'      ? 'bg-blue-100 text-blue-700' :
                      u.role === 'doctor'     ? 'bg-green-100 text-green-700' :
                                               'bg-gray-100 text-gray-500'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {(u.clinics as unknown as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(u.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
