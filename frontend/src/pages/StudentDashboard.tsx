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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
      
      // Fetch ALL courses with enrollment status and progress
      const response = await fetch(`${API_URL}/courses/`, {
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
      
      const response = await fetch(`${API_URL}/courses/enroll`, {
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
    <div className="space-y-12 pb-20">
      {/* Hero Welcome Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-fixed/30 text-secondary font-label text-xs font-bold tracking-widest uppercase">
            Panel del Estudiante
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-primary tracking-tight">
            Bienvenido, <span className="text-secondary">{userName}</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl leading-relaxed">
            Tu camino de formación teológica continúa hoy. Explora tus materias o descubre nuevos conocimientos en nuestro catálogo.
          </p>
        </div>
      </section>

      {/* Scripture Highlight */}
      <section className="bg-surface-container-highest rounded-xl p-8 border-l-4 border-secondary shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16"></div>
        <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
          <div className="flex-1 space-y-2">
            <p className="font-body text-xl italic text-primary leading-relaxed">
              "Lámpara es a mis pies tu palabra, y lumbrera a mi camino."
            </p>
            <p className="font-label font-bold text-secondary text-sm">Salmos 119:105</p>
          </div>
        </div>
      </section>

      {/* Mis Cursos Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
            <BookOpen className="text-secondary" />
            Mis Cursos Activos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {myCourses.length > 0 ? myCourses.map(course => (
            <div key={course.id} className="group bg-surface-container-lowest rounded-2xl overflow-hidden hover:shadow-premium transition-all duration-500 border border-outline-variant/10">
              <div className="relative h-48">
                <img 
                  alt={course.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  src={course.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=800'} 
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-secondary text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Inscrito</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-headline font-bold text-primary leading-tight h-14 line-clamp-2">{course.name}</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-on-surface-variant">
                    <span>Progreso</span>
                    <span>{course.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary transition-all duration-1000 ease-out rounded-full" 
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                <Link 
                  to={`/dashboard/courses/${course.id}`}
                  className="block w-full py-3 bg-primary text-white text-center rounded-xl font-black text-xs tracking-widest hover:bg-primary-container transition-all shadow-md active:scale-95"
                >
                  CONTINUAR ESTUDIO
                </Link>
              </div>
            </div>
          )) : (
            <div className="md:col-span-2 lg:col-span-3 p-12 bg-surface-container-low/30 border-2 border-dashed border-outline-variant/20 rounded-2xl text-center">
              <p className="text-on-surface-variant font-medium italic">Aún no te has inscrito en ninguna materia.</p>
            </div>
          )}
        </div>
      </section>

      {/* Discover Section */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-12">
          <h2 className="text-2xl font-headline font-bold text-primary flex items-center gap-2">
            <LayoutGrid className="text-secondary" />
            Explorar Nuevas Materias
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {availableCourses.length > 0 ? availableCourses.map(course => (
            <div key={course.id} className="group bg-white rounded-2xl overflow-hidden hover:shadow-ambient transition-all duration-500 border border-outline-variant/10">
              <div className="relative h-48 grayscale group-hover:grayscale-0 transition-all duration-700">
                <img 
                  alt={course.name} 
                  className="w-full h-full object-cover" 
                  src={course.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=800'} 
                />
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-headline font-bold text-primary leading-tight h-14 line-clamp-2">{course.name}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2 font-body">{course.description}</p>
                <button 
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrollingId === course.id}
                  className="w-full py-3 border-2 border-secondary text-secondary rounded-xl font-black text-xs tracking-widest hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {enrollingId === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  INSCRIBIRME AHORA
                </button>
              </div>
            </div>
          )) : availableCourses.length === 0 && !loading && (
             <div className="md:col-span-2 lg:col-span-3 text-center py-10 opacity-50">
               <p className="font-headline font-bold uppercase tracking-widest text-xs">No hay más materias disponibles por el momento.</p>
             </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
