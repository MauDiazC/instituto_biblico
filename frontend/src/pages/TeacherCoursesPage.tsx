import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Video, ArrowRight, Users, PlayCircle, Calendar, Search, Filter, Loader2, ChevronRight, ChevronLeft, LayoutGrid, List as ListIcon, MoreVertical, Edit3, ClipboardCheck, Clock, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { twMerge } from 'tailwind-merge';

interface Course {
  id: number;
  name: string;
  cover_image_url: string;
  description: string;
  student_count: number;
  module_count: number;
}

interface Clase {
  id: number;
  title: string;
  video_url: string | null;
  scheduled_at: string;
  status: string;
  bloque: {
    materia: {
      id: number;
      name: string;
    };
  };
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const ITEMS_PER_PAGE_COURSES = 5;
const ITEMS_PER_PAGE_RECORDINGS = 10;

const TeacherCoursesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [recordings, setRecordings] = useState<Clase[]>([]);
  const [nextSessions, setNextSessions] = useState<Clase[]>([]);
  
  // Search & Pagination States
  const [courseSearch, setCourseSearch] = useState('');
  const [recordingSearch, setRecordingSearch] = useState('');
  const [coursePage, setCoursePage] = useState(1);
  const [recordingPage, setRecordingPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
           await fetch(`${VITE_API_URL}/courses/teacher/recordings/sync`, {
             headers: { 'Authorization': `Bearer ${session.access_token}` }
           }).catch(err => console.error('Silent sync failed:', err));
        }

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

        const { data: recordedClases, error: recordedError } = await supabase
          .from('clases')
          .select('id, title, video_url, scheduled_at, status, bloque:bloques(materia:materias(id, name))')
          .eq('status', 'RECORDED')
          .order('scheduled_at', { ascending: false });

        if (recordedError) throw recordedError;
        if (recordedClases) setRecordings(recordedClases as any);

        const { data: upcomingClases, error: upcomingError } = await supabase
          .from('clases')
          .select('id, title, video_url, scheduled_at, status, bloque:bloques(materia:materias(id, name))')
          .in('status', ['SCHEDULED', 'LIVE'])
          .order('scheduled_at', { ascending: true });

        if (upcomingError) throw upcomingError;
        if (upcomingClases) setNextSessions(upcomingClases as any);

      } catch (error) {
        console.error('Error fetching teacher data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered & Paginated Courses
  const filteredCourses = useMemo(() => 
    courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())),
    [courses, courseSearch]
  );
  
  const paginatedCourses = useMemo(() => {
    const start = (coursePage - 1) * ITEMS_PER_PAGE_COURSES;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE_COURSES);
  }, [filteredCourses, coursePage]);

  // Filtered & Paginated Recordings
  const filteredRecordings = useMemo(() => 
    recordings.filter(r => 
      r.title.toLowerCase().includes(recordingSearch.toLowerCase()) || 
      r.bloque?.materia?.name.toLowerCase().includes(recordingSearch.toLowerCase())
    ),
    [recordings, recordingSearch]
  );

  const paginatedRecordings = useMemo(() => {
    const start = (recordingPage - 1) * ITEMS_PER_PAGE_RECORDINGS;
    return filteredRecordings.slice(start, start + ITEMS_PER_PAGE_RECORDINGS);
  }, [filteredRecordings, recordingPage]);

  const totalCoursePages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE_COURSES);
  const totalRecordingPages = Math.ceil(filteredRecordings.length / ITEMS_PER_PAGE_RECORDINGS);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-12 space-y-12 px-2 md:px-0 max-w-full overflow-x-hidden">
      {/* 1. Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-primary font-headline tracking-tighter uppercase leading-none">Mi Academia</h1>
          <p className="text-on-surface-variant font-body text-sm md:text-base">Centro de control para tus clases y material grabado.</p>
        </div>
        <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-[2rem] border border-primary/10">
          <div className="text-right">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Total Materias</p>
            <p className="text-2xl font-black font-headline text-primary mt-1">{courses.length}</p>
          </div>
          <div className="w-px h-8 bg-primary/20 mx-2"></div>
          <div className="text-right pr-2">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Grabaciones</p>
            <p className="text-2xl font-black font-headline text-primary mt-1">{recordings.length}</p>
          </div>
        </div>
      </section>

      {/* 2. Next Sessions Section */}
      {nextSessions.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-6">
             <div className="w-10 h-10 bg-error rounded-2xl flex items-center justify-center shadow-lg shadow-error/20">
                <Clock className="text-white w-5 h-5" />
             </div>
             <h2 className="text-2xl font-headline font-black text-primary tracking-tight">Próximas Sesiones</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nextSessions.map(session => (
              <div key={session.id} className="bg-white p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-black text-primary font-headline text-lg leading-tight uppercase truncate">{session.title}</p>
                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest">{session.bloque?.materia?.name}</p>
                  </div>
                  <div className={twMerge(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    session.status === 'LIVE' ? "bg-error text-white animate-pulse" : "bg-primary/10 text-primary"
                  )}>
                    {session.status === 'LIVE' ? 'En Vivo' : 'Programada'}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold font-label uppercase">
                      {new Date(session.scheduled_at).toLocaleString('es-ES', { 
                        day: '2-digit', month: 'short', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link 
                      to={`/dashboard/courses/${session.bloque?.materia?.id}/lessons/${session.id}`}
                      className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-center shadow-sm hover:bg-primary-container transition-all"
                    >
                      INICIAR CLASE
                    </Link>
                    <Link 
                      to={`/dashboard/teacher/editor?claseId=${session.id}`}
                      className="px-4 bg-surface-container-highest text-primary py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-center hover:bg-outline-variant/20 transition-all flex items-center justify-center"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Assigned Courses Section - Thin Cards Design */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10 pb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/20">
                <BookOpen className="text-white w-5 h-5" />
             </div>
             <h2 className="text-2xl font-headline font-black text-primary tracking-tight">Materias Asignadas</h2>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input 
              type="text" 
              placeholder="Filtrar materias..." 
              value={courseSearch}
              onChange={(e) => {setCourseSearch(e.target.value); setCoursePage(1);}}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant/10 rounded-2xl text-xs font-body focus:ring-2 focus:ring-secondary outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {paginatedCourses.length > 0 ? paginatedCourses.map(course => (
            <div key={course.id} className="bg-white rounded-[2rem] p-4 md:p-6 border border-outline-variant/10 shadow-sm hover:shadow-premium transition-all duration-300 flex flex-col lg:flex-row items-center gap-6 group">
              {/* Thumbnail */}
              <div className="w-full lg:w-32 h-32 rounded-3xl overflow-hidden flex-shrink-0">
                <img src={course.cover_image_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center lg:text-left space-y-2 w-full">
                <h3 className="text-xl font-black font-headline text-primary truncate uppercase tracking-tight">{course.name}</h3>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-on-surface-variant uppercase bg-surface-container-low px-3 py-1.5 rounded-full">
                    <Users className="w-3.5 h-3.5 text-secondary" /> {course.student_count} Estudiantes
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-on-surface-variant uppercase bg-surface-container-low px-3 py-1.5 rounded-full">
                    <BookOpen className="w-3.5 h-3.5 text-secondary" /> {course.module_count} Módulos
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-center gap-3 w-full lg:w-auto">
                <Link 
                  to={`/dashboard/teacher/editor?materiaId=${course.id}`}
                  className="px-6 py-3.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-primary-container transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva Sesión
                </Link>
                <Link 
                  to={`/dashboard/teacher/gradebook?materiaId=${course.id}`}
                  className="px-6 py-3.5 bg-secondary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#5d4201] transition-all shadow-md active:scale-95"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" /> Calificar
                </Link>
              </div>
            </div>
          )) : (
            <div className="text-center py-16 opacity-30">
              <BookOpen className="w-12 h-12 mx-auto mb-4" />
              <p className="font-headline font-bold uppercase tracking-widest text-xs">No se encontraron materias.</p>
            </div>
          )}
        </div>

        {/* Course Pagination */}
        {totalCoursePages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-4">
            <button 
              onClick={() => setCoursePage(p => Math.max(1, p - 1))}
              disabled={coursePage === 1}
              className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-30 hover:bg-primary/5 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
            <span className="text-[10px] font-black text-primary font-headline uppercase tracking-widest">
              Página {coursePage} de {totalCoursePages}
            </span>
            <button 
              onClick={() => setCoursePage(p => Math.min(totalCoursePages, p + 1))}
              disabled={coursePage === totalCoursePages}
              className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-30 hover:bg-primary/5 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </div>
        )}
      </section>

      {/* 4. Recordings Library Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10 pb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Video className="text-white w-5 h-5" />
             </div>
             <h2 className="text-2xl font-headline font-black text-primary tracking-tight">Biblioteca de Grabaciones</h2>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input 
              type="text" 
              placeholder="Buscar grabaciones..." 
              value={recordingSearch}
              onChange={(e) => {setRecordingSearch(e.target.value); setRecordingPage(1);}}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant/10 rounded-2xl text-xs font-body focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>
        
        {/* Mobile: Grid of Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {paginatedRecordings.length > 0 ? paginatedRecordings.map(recording => (
            <div key={recording.id} className="bg-white p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm active:bg-primary/5 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1 min-w-0">
                  <p className="font-black text-primary font-headline text-lg leading-tight uppercase truncate">{recording.title}</p>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest">{recording.bloque?.materia?.name}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-2xl flex-shrink-0">
                  <PlayCircle className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/5">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold font-label uppercase">
                    {new Date(recording.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <Link 
                  to={`/dashboard/courses/${recording.bloque?.materia?.id}/lessons/${recording.id}`}
                  className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm"
                >
                  REPRODUCIR
                </Link>
              </div>
            </div>
          )) : (
            <div className="p-16 text-center bg-surface-container-low/30 rounded-[2.5rem] border-2 border-dashed border-outline-variant/20 opacity-30">
              <Video className="w-12 h-12 mx-auto mb-3" />
              <p className="font-bold text-xs uppercase tracking-widest">Sin grabaciones encontradas</p>
            </div>
          )}
        </div>

        {/* Desktop: Modern Table */}
        <div className="hidden md:block bg-white rounded-[2.5rem] overflow-hidden border border-outline-variant/10 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low/40">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black text-primary font-headline uppercase tracking-[0.2em]">Clase / Título</th>
                  <th className="px-8 py-6 text-[10px] font-black text-primary font-headline uppercase tracking-[0.2em]">Materia Relacionada</th>
                  <th className="px-8 py-6 text-[10px] font-black text-primary font-headline uppercase tracking-[0.2em]">Fecha</th>
                  <th className="px-8 py-6 text-[10px] font-black text-primary font-headline uppercase tracking-[0.2em] text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {paginatedRecordings.length > 0 ? paginatedRecordings.map(recording => (
                  <tr key={recording.id} className="hover:bg-primary/5 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                           <PlayCircle className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-primary font-headline text-sm uppercase tracking-tight">{recording.title}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-1.5 bg-secondary/10 text-secondary text-[9px] font-black rounded-full uppercase tracking-widest">
                        {recording.bloque?.materia?.name}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-on-surface-variant font-body">
                      {new Date(recording.scheduled_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/dashboard/teacher/editor?claseId=${recording.id}`}
                          className="p-2.5 bg-surface-container-highest text-primary rounded-xl hover:bg-outline-variant/20 transition-all shadow-sm"
                          title="Editar sesión"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <Link 
                          to={`/dashboard/courses/${recording.bloque?.materia?.id}/lessons/${recording.id}`}
                          className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-primary-container hover:shadow-lg transition-all"
                        >
                          Ver Repetición <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <Video className="w-16 h-16" />
                        <p className="font-black font-headline uppercase tracking-widest text-xs">No hay grabaciones disponibles.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recording Pagination */}
        {totalRecordingPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-4">
            <button 
              onClick={() => setRecordingPage(p => Math.max(1, p - 1))}
              disabled={recordingPage === 1}
              className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-30 hover:bg-primary/5 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
            <span className="text-[10px] font-black text-primary font-headline uppercase tracking-widest">
              Página {recordingPage} de {totalRecordingPages}
            </span>
            <button 
              onClick={() => setRecordingPage(p => Math.min(totalRecordingPages, p + 1))}
              disabled={recordingPage === totalRecordingPages}
              className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-30 hover:bg-primary/5 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default TeacherCoursesPage;
