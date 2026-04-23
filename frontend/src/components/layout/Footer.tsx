import React from 'react';
import { Share2, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#1B365D] w-full py-12 px-8">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="space-y-4 text-center md:text-left">
          <span className="text-white font-bold text-2xl font-headline block">Instituto de Formación Bíblica</span>
          <p className="text-slate-300 font-body text-sm max-w-sm leading-relaxed">
            © 2026 Instituto de Formación Bíblica. El Archivo Sagrado. Preservando la sana doctrina para las nuevas generaciones.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          <div className="space-y-4">
            <h5 className="text-[#D4AF37] font-bold text-xs uppercase tracking-widest">Recursos</h5>
            <ul className="space-y-2 text-slate-300 font-body text-sm">
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">Biblioteca Virtual</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">Blog Teológico</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">Soporte Académico</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="text-[#D4AF37] font-bold text-xs uppercase tracking-widest">Legal</h5>
            <ul className="space-y-2 text-slate-300 font-body text-sm">
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">Privacidad</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">Términos de Uso</a></li>
              <li><a className="hover:text-[#D4AF37] transition-colors" href="#">Contacto</a></li>
            </ul>
          </div>
        </div>
        <div className="flex gap-4">
          <a className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#D4AF37] hover:text-primary transition-all" href="#">
            <Share2 className="w-5 h-5" />
          </a>
          <a className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#D4AF37] hover:text-primary transition-all" href="#">
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
