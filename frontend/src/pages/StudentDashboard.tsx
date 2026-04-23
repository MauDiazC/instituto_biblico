import React, { useEffect, useState } from 'react';
import { LayoutGrid, List, Loader2, BookOpen, ArrowRight, CheckCircle, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

interface Course {
  id: number;
  name: string;
  cover_image_url: string;
  description: string;
  is_enrolled?: boolean;
  progress?: number;
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const StudentDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0]);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${VITE_API_URL}/courses/`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allCourses = data.items as Course[];
        
        setMyCourses(allCourses.filter(c => c.is_enrolled));
        setAvailableCourses(allCourses.filter(c => !c.is_enrolled));
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleEnroll = async (materiaId: number) => {
    try {
      setEnrollingId(materiaId);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${VITE_API_URL}/courses/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ materia_id: materiaId })
      });

      if (response.ok) {
        alert('¡Inscripción exitosa! Bienvenido al curso.');
        await fetchDashboardData();
      } else {
        alert('Error al inscribirse.');
      }
    } catch (error) {
      console.error('Enroll error:', error);
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading && myCourses.length === 0 && availableCourses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-28 px-2 md:px-0">
      {/* Hero Welcome Section */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-fixed/30 text-secondary font-label text-[10px] font-black tracking-widest uppercase">
          Portal del Estudiante
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-black text-primary tracking-tight leading-none">
          Hola, <span className="text-secondary">{userName}</span>
        </h1>
        <p className="text-base md:text-lg text-on-surface-variant max-w-xl leading-relaxed font-body">
          Tu formación teológica continúa hoy. Revisa tu progreso o descubre nuevas materias.
        </p>
      </section>

      {/* Mis Cursos Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <h2 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-3">
            <BookOpen className="text-secondary w-6 h-6" />
            Mis Cursos Activos
          </h2>
          <span className="text-[10px] font-black text-on-surface-variant uppercase bg-surface-container-low px-2 py-1 rounded-md">{myCourses.length} Materias</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCourses.length > 0 ? myCourses.map(course => (
            <div key={course.id} className="group bg-white rounded-2xl md:rounded-3xl overflow-hidden hover:shadow-premium transition-all duration-500 border border-outline-variant/10 flex flex-col">
              <div className="relative h-44 md:h-48 overflow-hidden">
                <img 
                  alt={course.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  src={course.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=800'} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute top-4 left-4">
                  <span className="bg-secondary text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Inscrito</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg md:text-xl font-headline font-bold text-primary leading-tight h-14 line-clamp-2 mb-4">{course.name}</h3>
                
                <div className="space-y-3 mt-auto">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter text-on-surface-variant">
                    <span>Progreso del curso</span>
                    <span className="text-primary">{course.progress || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(var(--secondary),0.4)]" 
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>

                  <Link 
                    to={`/dashboard/courses/${course.id}`}
                    className="block w-full py-4 md:py-3.5 bg-primary text-white text-center rounded-2xl font-black text-xs tracking-widest hover:bg-primary-container transition-all shadow-md active:scale-95 mt-4"
                  >
                    CONTINUAR ESTUDIO
                  </Link>
                </div>
              </div>
            </div>
          )) : (
            <div className="md:col-span-2 lg:col-span-3 p-12 bg-surface-container-low/30 border-2 border-dashed border-outline-variant/20 rounded-3xl text-center">
              <p className="text-on-surface-variant font-bold font-headline uppercase text-sm opacity-40 italic">Aún no tienes materias activas.</p>
            </div>
          )}
        </div>
      </section>

      {/* Discover Section - Improved cards for mobile */}
      <section className="space-y-6 pt-6">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <h2 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-3">
            <LayoutGrid className="text-secondary w-6 h-6" />
            Nuevas Materias
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCourses.length > 0 ? availableCourses.map(course => (
            <div key={course.id} className="group bg-white rounded-2xl md:rounded-3xl overflow-hidden hover:shadow-ambient transition-all duration-500 border border-outline-variant/10 flex flex-col">
              <div className="relative h-44 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700">
                <img 
                  alt={course.name} 
                  className="w-full h-full object-cover" 
                  src={course.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=800'} 
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-headline font-bold text-primary leading-tight mb-2">{course.name}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2 font-body mb-6 leading-relaxed">{course.description}</p>
                <button 
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrollingId === course.id}
                  className="w-full mt-auto py-4 border-2 border-secondary/20 text-secondary rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {enrollingId === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  INSCRIBIRME AHORA
                </button>
              </div>
            </div>
          )) : !loading && (
             <div className="md:col-span-2 lg:col-span-3 text-center py-10 opacity-30">
               <p className="font-headline font-bold uppercase tracking-widest text-[10px]">No hay más materias disponibles por ahora.</p>
             </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
