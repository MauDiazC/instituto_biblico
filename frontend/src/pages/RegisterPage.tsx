import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Award, ArrowRight, Mail, Lock, User, HelpCircle, UserCircle, Eye, EyeOff } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../utils/supabase';

const HERITAGE_IMAGE = "/assets/register-hero.png";

const RegisterPage: React.FC = () => {
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        alert("¡Registro exitoso! Por favor, revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.");
        navigate('/auth/login');
      }
    } catch (err: any) {
      console.error("Error registration:", err);
      setErrorMsg(err.message || "Error al registrar usuario");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background font-body text-on-surface antialiased min-h-screen flex flex-col">
      <header className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md shadow-sm">
        <div className="flex justify-between items-center px-8 py-4 w-full">
          <Link to="/" className="text-2xl font-black tracking-tight text-primary font-headline">Instituto Bíblico</Link>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-8">
              <Link className="text-primary font-bold border-b-2 border-primary" to="/">Inicio</Link>
              <Link className="text-on-surface-variant font-medium hover:text-primary" to="/dashboard/courses">Cursos</Link>
            </nav>
            <UserCircle className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      <main className="flex-grow pt-24 pb-12 flex items-center justify-center px-4">
        <div className="w-full max-w-6xl flex flex-col md:flex-row overflow-hidden rounded-3xl bg-white shadow-premium">
          <div className="w-full md:w-1/2 relative min-h-[300px] md:min-h-[700px] overflow-hidden bg-primary">
            <img alt="Heritage" className="absolute inset-0 w-full h-full object-cover" src={HERITAGE_IMAGE} />
            <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] flex items-center justify-center p-12 text-center">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl font-black text-white font-headline leading-tight tracking-tighter">Únete al Legado</h1>
                <p className="text-white/90 text-lg font-light max-w-md mx-auto">Inicia tu formación teológica en nuestra comunidad académica.</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-surface-container-low/30">
            <div className="max-w-md mx-auto w-full space-y-8">
              <div>
                <h2 className="text-3xl font-black text-primary font-headline mb-2 uppercase">Crear Cuenta</h2>
                <p className="text-on-surface-variant font-body">Completa tus datos para comenzar.</p>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold border border-red-100 italic">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant font-headline">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-5 h-5" />
                    <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-b-2 border-outline-variant focus:border-secondary outline-none shadow-sm" placeholder="Ej. Juan Pérez" type="text" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant font-headline">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-5 h-5" />
                    <input required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border-b-2 border-outline-variant focus:border-secondary outline-none shadow-sm" placeholder="nombre@ejemplo.com" type="email" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant font-headline">Tipo de Usuario</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div onClick={() => setRole('student')} className={twMerge("flex flex-col items-center p-4 rounded-2xl bg-white cursor-pointer border-2 shadow-sm transition-all", role === 'student' ? "border-secondary ring-4 ring-secondary/5" : "border-transparent opacity-60")}>
                      <GraduationCap className={twMerge("w-8 h-8 mb-2", role === 'student' ? "text-secondary" : "text-outline-variant")} />
                      <span className={twMerge("text-xs font-black uppercase", role === 'student' ? "text-primary" : "text-on-surface-variant")}>Estudiante</span>
                    </div>
                    <div onClick={() => setRole('teacher')} className={twMerge("flex flex-col items-center p-4 rounded-2xl bg-white cursor-pointer border-2 shadow-sm transition-all", role === 'teacher' ? "border-secondary ring-4 ring-secondary/5" : "border-transparent opacity-60")}>
                      <Award className={twMerge("w-8 h-8 mb-2", role === 'teacher' ? "text-secondary" : "text-outline-variant")} />
                      <span className={twMerge("text-xs font-black uppercase", role === 'teacher' ? "text-primary" : "text-on-surface-variant")}>Instructor</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant font-headline">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-4 h-4" />
                      <input required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-9 pr-10 py-3 rounded-xl bg-white border-b-2 border-outline-variant focus:border-secondary outline-none text-sm" placeholder="••••••••" type={showPassword ? "text" : "password"} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant font-headline">Confirmar</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant w-4 h-4" />
                      <input required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-9 pr-10 py-3 rounded-xl bg-white border-b-2 border-outline-variant focus:border-secondary outline-none text-sm" placeholder="••••••••" type={showConfirmPassword ? "text" : "password"} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={isLoading} 
                  className="w-full bg-[#002046] text-white py-4 px-6 rounded-2xl font-black font-headline text-lg hover:translate-y-[-2px] transition-all shadow-premium flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span className={isLoading ? "animate-pulse" : ""}>{isLoading ? 'Creando Cuenta...' : 'Crear Cuenta'}</span>
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>

              <div className="pt-6 text-center">
                <p className="text-on-surface-variant font-body text-sm">¿Ya tienes una cuenta? <Link className="text-secondary font-bold hover:underline ml-1" to="/auth/login">Inicia Sesión</Link></p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
