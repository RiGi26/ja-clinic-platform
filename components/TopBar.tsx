import { Bell, Search } from 'lucide-react'

interface TopBarProps {
  title     : string
  subtitle? : string
  showSearch?: boolean
}

export default function TopBar({ title, subtitle, showSearch = true }: TopBarProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-black/[0.04] px-5 md:px-8 py-4 md:py-5 sticky top-0 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Title Section */}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl sf-display-heavy tracking-tight text-[#1D1D1F] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[#86868B] text-xs md:text-sm mt-0.5 sf-display truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {showSearch && (
            <div className="relative hidden sm:block group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#0071E3] transition-colors" />
              <input
                type="text"
                placeholder="Cari sesuatu..."
                className="pl-10 pr-4 py-2 bg-[#F5F5F7] border border-transparent rounded-full w-48 md:w-64 text-sm sf-display text-[#1D1D1F] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#0071E3]/30 focus:ring-4 focus:ring-[#0071E3]/10 transition-all duration-300"
              />
            </div>
          )}
          
          {/* Mobile Search Icon (Shows only on small screens) */}
          {showSearch && (
            <button aria-label="Cari" className="sm:hidden p-2.5 text-gray-500 hover:text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E8E8ED] rounded-full transition-colors active:scale-95">
              <Search size={18} />
            </button>
          )}

          <button aria-label="Notifikasi" className="relative p-2.5 text-gray-500 hover:text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E8E8ED] rounded-full transition-colors active:scale-95">
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#FF3B30] border-2 border-[#F5F5F7] rounded-full animate-pulse" />
          </button>
        </div>
      </div>
    </div>
  )
}
