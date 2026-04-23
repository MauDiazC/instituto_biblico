import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/avatars';

const DashboardHeader: React.FC = () => {
  const { user } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = getInitials(user?.user_metadata?.full_name);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 bg-[#FAF9F6]/80 backdrop-blur-xl z-30 shadow-[0_8px_24px_-4px_rgba(26,28,26,0.06)]">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-secondary-fixed-dim transition-all outline-none" 
              placeholder="Buscar materias..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden lg:flex items-center gap-2 bg-[#1B365D] text-white px-5 py-2 rounded-full font-headline font-bold tracking-tight text-sm active:scale-95 transition-transform">
            Continuar Lección
          </button>
          <div className="flex items-center gap-2">
            <button className="p-2 text-[#1B365D] hover:bg-[#F4F3F1] rounded-full transition-colors">
              <Bell className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 rounded-full border-2 border-primary/10 overflow-hidden shadow-sm flex items-center justify-center bg-primary text-white font-bold text-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
