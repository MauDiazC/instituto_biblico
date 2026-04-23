import React from 'react';
import { LayoutDashboard, BookOpen, Library, LogOut, Settings, Video, ShieldCheck, Edit3, ListTodo, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/avatars';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = getInitials(user?.user_metadata?.full_name);
  console.log('DEBUG: Sidebar - Current Role:', role);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login');
  };

  const getNavItems = () => {
    // 1. Admin Items
    if (role === 'admin') {
      return [
        { name: 'Panel Admin', path: '/dashboard/admin', icon: ShieldCheck },
        { name: 'Gestión de Materias', path: '/dashboard/admin', icon: BookOpen },
        { name: 'Biblioteca', path: '/dashboard/library', icon: Library },
      ];
    }
    
    // 2. Teacher Items
    if (role === 'teacher') {
      return [
        { name: 'Inicio', path: '/dashboard/teacher', icon: LayoutDashboard },
        { name: 'Mis Cursos', path: '/dashboard/teacher/courses', icon: Video },
        { name: 'Gestión de Materias', path: '/dashboard/admin', icon: BookOpen },
        { name: 'Calificaciones', path: '/dashboard/teacher/gradebook', icon: ListTodo },
        { name: 'Biblioteca', path: '/dashboard/library', icon: Library },
      ];
    }

    // 3. Student Items (Default)
    return [
      { name: 'Mi Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Biblioteca', path: '/dashboard/library', icon: Library },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="h-screen w-64 hidden md:flex flex-col bg-surface-container-low border-r-0 fixed left-0 top-0 z-40 transition-all duration-200">
      <div className="flex flex-col p-6 space-y-8 h-full">
        <div className="px-2">
          <h2 className="text-xl font-black text-primary font-headline uppercase tracking-tighter leading-none">Instituto <br/> Bíblico</h2>
          <p className="text-[10px] text-secondary font-black uppercase tracking-[0.3em] mt-2">Formación Teológica</p>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-xl font-label text-sm ${
                  isActive 
                    ? "bg-white text-primary shadow-sm font-bold" 
                    : "text-on-surface-variant hover:bg-white hover:translate-x-1 font-medium"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "opacity-40"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-outline-variant/10">
          <div className="space-y-1">
            <Link
              to="/dashboard/profile"
              className={`flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-white rounded-lg font-label font-medium text-sm transition-all ${
                location.pathname === '/dashboard/profile' ? "bg-white text-primary shadow-sm" : ""
              }`}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden border border-primary/20 flex items-center justify-center bg-primary text-white text-[10px] font-bold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              Mi Perfil
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-white rounded-lg font-label font-medium text-sm transition-all text-left"
            >
              <LogOut className="w-5 h-5 opacity-40" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
