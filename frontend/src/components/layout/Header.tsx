import React from 'react';
import { LogIn, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Cursos', path: '/#cursos' },
    { name: 'Biblioteca', path: '/dashboard/library' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl shadow-ambient">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-black text-primary font-headline tracking-tight">
            Instituto de Formación Bíblica
          </Link>
          <nav className="hidden md:flex gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`font-headline font-bold transition-colors duration-300 rounded-lg px-3 py-1 ${
                  location.pathname === link.path
                    ? "text-primary border-b-2 border-secondary"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/auth/login"
            className="hidden lg:flex items-center gap-2 px-4 py-2 text-primary font-headline font-bold hover:bg-surface-container-low transition-all rounded-lg"
          >
            <LogIn className="w-5 h-5" />
            Iniciar Sesión
          </Link>
          <Link
            to="/dashboard/courses/1"
            className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-headline font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Explorar Cursos
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
