import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

import { 
  LayoutDashboard as DashboardIcon, 
  BookOpen as CoursesIcon, 
  GraduationCap as GradeIcon,
  FileEdit as EditorIcon,
  Library as LibraryIcon,
  User as ProfileIcon,
  Settings as AdminIcon
} from 'lucide-react';

const MobileNav: React.FC = () => {
  const location = useLocation();

  const getNavItems = () => {
    if (location.pathname.includes('/dashboard/teacher')) {
      return [
        { name: 'Inicio', path: '/dashboard/teacher', icon: DashboardIcon },
        { name: 'Cursos', path: '/dashboard/teacher/courses', icon: CoursesIcon },
        { name: 'Notas', path: '/dashboard/teacher/gradebook', icon: GradeIcon },
        { name: 'Gestión', path: '/dashboard/admin', icon: AdminIcon },
      ];
    }
    
    if (location.pathname.includes('/dashboard/admin')) {
      return [
        { name: 'Admin', path: '/dashboard/admin', icon: AdminIcon },
        { name: 'Cursos', path: '/dashboard/teacher/courses', icon: CoursesIcon },
        { name: 'Biblioteca', path: '/dashboard/library', icon: LibraryIcon },
        { name: 'Perfil', path: '/dashboard/profile', icon: ProfileIcon },
      ];
    }

    return [
      { name: 'Inicio', path: '/dashboard', icon: DashboardIcon },
      { name: 'Biblioteca', path: '/dashboard/library', icon: LibraryIcon },
      { name: 'Perfil', path: '/dashboard/profile', icon: ProfileIcon },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 w-full rounded-t-3xl z-50 bg-white/80 backdrop-blur-xl border-t border-outline-variant/10 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] px-4 py-3 pb-safe flex justify-around items-center">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Link
            key={item.name}
            to={item.path}
            className={twMerge(
              "flex flex-col items-center justify-center p-2 transition-all duration-300 rounded-2xl min-w-[64px]",
              isActive ? "bg-primary text-white scale-110 shadow-lg" : "text-slate-400 hover:text-primary"
            )}
          >
            <Icon className={twMerge("w-5 h-5", isActive && "fill-current")} />
            <span className={twMerge(
              "font-label text-[9px] uppercase tracking-widest mt-1 font-bold",
              isActive ? "opacity-100" : "opacity-70"
            )}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
