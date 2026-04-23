import React, { useEffect, useState } from 'react';
import { BookOpen, Video, ArrowRight, Users, PlayCircle, Calendar, Search, Filter, Loader2 } from 'lucide-react';
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

        // 1. Fetch Materias (My Courses)
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
    <div className="pb-12 space-y-12">
      {/* Header & Search */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary font-headline tracking-tighter">Gestión de Cursos</h1>
          <p className="text-on-surface-variant font-body">Administra tus materias y revisa las grabaciones de tus clases.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de curso..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-0 rounded-xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
      </section>

      {/* 1. My Courses Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-headline text-primary flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-secondary" />
            Materias Asignadas
          </h2>
          <span className="text-xs font-bold text-on-surface-variant font-label uppercase tracking-widest">{filteredCourses.length} Materias</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient group hover:translate-y-[-4px] transition-all duration-300 border border-outline-variant/10">
              <div className="h-40 relative">
                <img src={course.cover_image_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold font-headline text-lg leading-tight">{course.name}</h3>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-sm text-on-surface-variant font-label">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {course.student_count} Alumnos</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {course.module_count} Bloques</span>
                </div>
                <div className="pt-4 flex gap-2">
                  <Link 
                    to={`/dashboard/teacher/editor?materiaId=${course.id}`}
                    className="flex-1 bg-primary text-white text-center py-2.5 rounded-lg font-bold text-xs hover:bg-primary-container transition-colors"
                  >
                    Editar Contenido
                  </Link>
                  <Link 
                    to={`/dashboard/teacher/gradebook?materiaId=${course.id}`}
                    className="px-3 bg-surface-container-low text-primary flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
                    title="Calificaciones"
                  >
                    <Filter className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Recordings Library */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold font-headline text-primary flex items-center gap-2">
          <Video className="w-6 h-6 text-secondary" />
          Biblioteca de Grabaciones
        </h2>
        
        <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-primary font-headline uppercase tracking-widest">Clase</th>
                  <th className="px-6 py-4 text-xs font-black text-primary font-headline uppercase tracking-widest">Materia</th>
                  <th className="px-6 py-4 text-xs font-black text-primary font-headline uppercase tracking-widest">Fecha</th>
                  <th className="px-6 py-4 text-xs font-black text-primary font-headline uppercase tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {recordings.length > 0 ? recordings.map(recording => (
                  <tr key={recording.id} className="hover:bg-white/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-primary font-headline text-sm">{recording.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary-container/10 text-primary-container text-[10px] font-bold rounded-md uppercase font-label">
                        {recording.bloque?.materia?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant font-body">
                      {new Date(recording.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/dashboard/courses/${recording.bloque?.materia?.id}/lessons/${recording.id}`}
                        className="inline-flex items-center gap-2 text-secondary font-bold text-xs hover:underline"
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
                        <p className="font-bold font-headline">No hay grabaciones disponibles todavía.</p>
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
