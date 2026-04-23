import React, { useEffect, useState } from 'react';
import { BookOpen, Video, ArrowRight, Users, PlayCircle, Calendar, Search, Filter, Loader2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';

interface Course {
  id: number;
  name: string;
  cover_image_url: string;
  description: string;
  student_count: number;
  module_count: number;
}

interface Recording {
  id: number;
  title: string;
  video_url: string;
  scheduled_at: string;
  bloque: {
    materia: {
      id: number;
      name: string;
    };
  };
}

const TeacherCoursesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 0. Sync recordings with Daily.co (Silently)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
           await fetch(`${VITE_API_URL}/courses/teacher/recordings/sync`, {
             headers: { 'Authorization': `Bearer ${session.access_token}` }
           }).catch(err => console.error('Silent sync failed:', err));
        }

        // 1. Fetch Materias
        const { data: materias, error: materiasError } = await supabase
          .from('materias')
          .select('*, bloques(count), enrollments(count)');

        if (materiasError) throw materiasError;

        if (materias) {
          const mappedCourses = materias.map((m: any) => ({
            id: m.id,
            name: m.name,
            cover_image_url: m.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=800',
            description: m.description,
            student_count: m.enrollments[0]?.count || 0,
            module_count: m.bloques[0]?.count || 0
          }));
          setCourses(mappedCourses);
        }

        // 2. Fetch Recorded Classes
        const { data: recordedClases, error: recordedError } = await supabase
          .from('clases')
          .select('id, title, video_url, scheduled_at, bloque:bloques(materia:materias(id, name))')
          .eq('status', 'RECORDED')
          .order('scheduled_at', { ascending: false });

        if (recordedError) throw recordedError;
        if (recordedClases) {
          setRecordings(recordedClases as any);
        }

      } catch (error) {
        console.error('Error fetching teacher courses data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-12 space-y-10 px-2 md:px-0 max-w-full overflow-x-hidden">
      {/* Header & Search */}
      <section className="flex flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black text-primary font-headline tracking-tight uppercase">Gestión de Cursos</h1>
          <p className="text-on-surface-variant font-body text-sm md:text-base">Administra tus materias y grabaciones.</p>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de curso..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 md:py-3 bg-white border border-outline-variant/10 rounded-2xl md:rounded-xl font-body text-sm shadow-sm focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
      </section>

      {/* 1. My Courses Grid - Responsive */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <h2 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-3">
            <BookOpen className="text-secondary w-6 h-6" />
            Materias Asignadas
          </h2>
          <span className="text-[10px] font-black text-on-surface-variant font-label uppercase bg-surface-container-low px-2 py-1 rounded-md">{filteredCourses.length}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-premium transition-all duration-300 border border-outline-variant/10 flex flex-col group">
              <div className="h-44 relative overflow-hidden">
                <img src={course.cover_image_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-black font-headline text-lg leading-tight uppercase tracking-tight">{course.name}</h3>
                </div>
              </div>
              <div className="p-6 space-y-6 flex flex-1 flex-col">
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-black uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-lg"><Users className="w-3.5 h-3.5" /> {course.student_count} Alumnos</span>
                  <span className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-lg"><BookOpen className="w-3.5 h-3.5" /> {course.module_count} Bloques</span>
                </div>
                
                <div className="pt-2 flex flex-col sm:flex-row gap-3 mt-auto">
                  <Link 
                    to={`/dashboard/teacher/editor?materiaId=${course.id}`}
                    className="flex-1 bg-primary text-white text-center py-4 md:py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-primary-container transition-all active:scale-95 shadow-md"
                  >
                    Editar Contenido
                  </Link>
                  <Link 
                    to={`/dashboard/teacher/gradebook?materiaId=${course.id}`}
                    className="flex-1 bg-secondary text-white text-center py-4 md:py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-[#5d4201] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
                  >
                    <Filter className="w-3.5 h-3.5" /> Calificaciones
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Recordings Library - Responsive Cards for Mobile */}
      <section className="space-y-6">
        <h2 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-3 border-b border-outline-variant/10 pb-4">
          <Video className="text-secondary w-6 h-6" />
          Biblioteca de Grabaciones
        </h2>
        
        {/* Mobile View: List of Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {recordings.length > 0 ? recordings.map(recording => (
            <div key={recording.id} className="bg-white p-5 rounded-2xl border border-outline-variant/10 shadow-sm active:bg-primary/5 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-1 min-w-0">
                  <p className="font-black text-primary font-headline text-base leading-tight truncate">{recording.title}</p>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">{recording.bloque?.materia?.name}</p>
                </div>
                <div className="bg-primary/5 p-2 rounded-full">
                  <PlayCircle className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold font-label uppercase">
                    {new Date(recording.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <Link 
                  to={`/dashboard/courses/${recording.bloque?.materia?.id}/lessons/${recording.id}`}
                  className="flex items-center gap-1.5 text-secondary font-black text-[10px] uppercase tracking-widest"
                >
                  Ver ahora <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )) : (
            <div className="p-10 text-center bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20 opacity-40">
              <Video className="w-10 h-10 mx-auto mb-2" />
              <p className="font-bold text-xs uppercase tracking-widest">Sin grabaciones</p>
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white rounded-3xl overflow-hidden border border-outline-variant/10 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low/30">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-primary font-headline uppercase tracking-widest">Clase</th>
                  <th className="px-6 py-5 text-[10px] font-black text-primary font-headline uppercase tracking-widest">Materia</th>
                  <th className="px-6 py-5 text-[10px] font-black text-primary font-headline uppercase tracking-widest">Fecha</th>
                  <th className="px-6 py-5 text-[10px] font-black text-primary font-headline uppercase tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {recordings.length > 0 ? recordings.map(recording => (
                  <tr key={recording.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-bold text-primary font-headline text-sm">{recording.title}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-black rounded-full uppercase tracking-tighter">
                        {recording.bloque?.materia?.name}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant font-body">
                      {new Date(recording.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link 
                        to={`/dashboard/courses/${recording.bloque?.materia?.id}/lessons/${recording.id}`}
                        className="inline-flex items-center gap-2 text-secondary font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-transform"
                      >
                        Ver Repetición <PlayCircle className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <Video className="w-12 h-12" />
                        <p className="font-bold font-headline uppercase tracking-widest text-xs">No hay grabaciones disponibles todavía.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeacherCoursesPage;
