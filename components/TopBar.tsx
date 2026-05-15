import { Bell, Search } from 'lucide-react'

interface TopBarProps {
  title     : string
  subtitle? : string
  showSearch?: boolean
}

export default function TopBar({ title, subtitle, showSearch = true }: TopBarProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-8 py-5 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-secondary">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari..."
                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl w-64 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          )}
          <button className="relative p-2.5 hover:bg-gray-50 rounded-xl transition-colors">
            <Bell size={18} className="text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </div>
      </div>
    </div>
  )
}
