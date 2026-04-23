import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Normalizar rol a minúsculas
        const role = data.user.user_metadata?.role?.toLowerCase();
        
        if (role === 'teacher') {
          navigate('/dashboard/teacher');
        } else if (role === 'admin') {
          navigate('/dashboard/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Credenciales inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-[1000px] w-full grid grid-cols-1 md:grid-cols-2 bg-surface-container-low rounded-3xl overflow-hidden shadow-premium">
          {/* Image Side */}
          <div className="hidden md:block relative overflow-hidden">
            <img 
              className="absolute inset-0 w-full h-full object-cover" 
              alt="grand library" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCohlX5Z-rWx5HbEuUEgf4B-5HHg3MPwRjcufIqNShf7wpfPfSUkE2wTYS2w6gylndiTzmn8Qj2a7KJBNi16cAyEncpj9sGqUJzvAbl2zkKmr4mJUa99qHDMq6WpIy4m3osqyTqfiQaIBjS6hTYPlRkcO8wRjUqu_-tudgkkgxX7ZYyn0rFugMfPLdrY11Rp2i5Mhd_ddUjRhvJPF0csTf6riPWWZSYRIosqifiafHFpWc-rV2uGR7ExnZzzss4_nx1n9cD2PoGjLoD" 
            />
            <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]"></div>
            <div className="relative h-full flex flex-col justify-end p-12 z-10">
              <div className="space-y-4">
                <span className="text-secondary-fixed font-headline font-bold tracking-widest text-[10px] uppercase">Instituto Bíblico</span>
                <h2 className="text-white font-headline font-black text-4xl leading-tight">Instituto de Formación Bíblica</h2>
                <p className="text-white/80 font-body text-lg leading-relaxed">Un espacio dedicado a la profundidad académica y espiritual.</p>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="bg-white p-8 md:p-16 flex flex-col justify-center">
            <div className="mb-10">
              <h1 className="font-headline font-black text-3xl text-primary tracking-tight mb-2 uppercase">Bienvenido</h1>
              <p className="text-on-surface-variant font-body">Inicia sesión para continuar tu formación.</p>
            </div>
            
            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-100 mb-6 italic">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-primary font-headline font-bold text-[10px] uppercase tracking-widest mb-2" htmlFor="email">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-5 h-5" />
                  <input 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border-b-2 border-outline-variant focus:border-secondary outline-none transition-all shadow-sm rounded-t-xl" 
                    id="email" 
                    placeholder="nombre@ejemplo.com" 
                    type="email"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-primary font-headline font-bold text-[10px] uppercase tracking-widest" htmlFor="password">Contraseña</label>
                  <a className="text-secondary font-label font-bold text-[10px] uppercase hover:underline" href="#">¿Olvidó su contraseña?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-5 h-5" />
                  <input 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-white border-b-2 border-outline-variant focus:border-secondary outline-none transition-all shadow-sm rounded-t-xl" 
                    id="password" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button 
                disabled={isLoading}
                className="bg-[#002046] w-full py-4 text-white font-black font-headline text-lg rounded-2xl shadow-premium hover:translate-y-[-2px] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8" 
                type="submit"
              >
                {isLoading ? 'Accediendo...' : 'Iniciar Sesión'}
                {!isLoading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>

            <div className="text-center mt-12">
              <p className="text-on-surface-variant font-body text-sm">
                ¿No tiene una cuenta académica? 
                <Link className="text-secondary font-bold hover:underline ml-1" to="/auth/register">Crear Cuenta</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-12 px-12 bg-surface-container-low/50 border-t border-outline-variant/10 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-label text-primary font-bold opacity-60 uppercase tracking-widest">
            © 2026 Instituto Bíblico Bible Institute.
          </p>
          <div className="flex gap-8">
            <Link className="text-on-surface-variant text-xs font-bold hover:text-primary transition-colors uppercase tracking-tighter" to="#">Privacidad</Link>
            <Link className="text-on-surface-variant text-xs font-bold hover:text-primary transition-colors uppercase tracking-tighter" to="#">Términos</Link>
            <Link className="text-on-surface-variant text-xs font-bold hover:text-primary transition-colors uppercase tracking-tighter" to="#">Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
