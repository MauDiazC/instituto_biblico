import React from 'react';
import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl shadow-ambient">
      <div className="flex justify-between items-center px-6 py-4 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-black text-primary font-headline tracking-tight">
            Instituto de Formación Bíblica
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/auth/login"
            className="flex items-center gap-2 px-4 py-2 text-primary font-headline font-bold hover:bg-surface-container-low transition-all rounded-lg"
          >
            <LogIn className="w-5 h-5" />
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
