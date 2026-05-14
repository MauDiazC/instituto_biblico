import React, { useEffect, useState, useMemo } from 'react';
import { 
  BookOpen, 
  Video, 
  ArrowRight, 
  Users, 
  PlayCircle, 
  Calendar, 
  Search, 
  Filter, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  LayoutGrid, 
  List as ListIcon, 
  MoreVertical, 
  Edit3, 
  ClipboardCheck, 
  Clock, 
  Plus, 
  Trash2,
  X,
  Eye
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { twMerge } from 'tailwind-merge';
import { getInitials } from '../utils/avatars';
import { parseUTC } from '../utils/date';

interface Course {
  id: number;
  name: string;
  cover_image_url: string;
  description: string;
  student_count: number;
  module_count: number;
}

interface StudentInMateria {
  id: number;
  user: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  created_at: string;
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

const TeacherCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [nextSessions, setNextSessions] = useState<Clase[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Search & Pagination States
  const [courseSearch, setCourseSearch] = useState('');
  const [coursePage, setCoursePage] = useState(1);

  // Students Modal State
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedMateria, setSelectedMateria] = useState<Course | null>(null);
  const [studentsInMateria, setStudentsInMateria] = useState<StudentInMateria[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  const handleShowStudents = async (materia: Course) => {
    setSelectedMateria(materia);
    setShowStudentsModal(true);
    setLoadingStudents(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/${materia.id}/students`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentsInMateria(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDeleteMateria = async (materiaId: number, name: string) => {
    if (!window.confirm(`¿Estás COMPLETAMENTE seguro de eliminar "${name}"?\n\nEsta acción eliminará permanentemente:\n- Todos los módulos\n- Todas las clases y grabaciones\n- Todas las tareas y entregas de alumnos\n- Todas las inscripciones\n\nESTA ACCIÓN NO SE PUEDE DESHACER.`)) return;

    try {
      setDeletingId(materiaId);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${VITE_API_URL}/courses/${materiaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(errorData.detail || 'No se pudo eliminar la materia');
      }

      setCourses(courses.filter(c => c.id !== materiaId));
      setNextSessions(nextSessions.filter(s => s.bloque?.materia?.id !== materiaId));
      
      alert('Materia eliminada con éxito');
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered & Paginated Courses
  const filteredCourses = useMemo(() => 
    courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())),
    [courses, courseSearch]
  );
  
  const paginatedCourses = useMemo(() => {
    const start = (coursePage - 1) * ITEMS_PER_PAGE_COURSES;
    return filteredCourses.slice(start, start + ITEMS_PER_PAGE_COURSES);
  }, [filteredCourses, coursePage]);

  const totalCoursePages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE_COURSES);

  if (loading && courses.length === 0) {
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
          <p className="text-on-surface-variant font-body text-sm md:text-base">Gestione sus materias y el contenido de sus clases.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <Link 
            to="/dashboard/teacher/editor"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-secondary text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-[#5d4201] transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nueva Materia
          </Link>
          <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-[2rem] border border-primary/10 w-full sm:w-auto px-8">
            <div className="text-right">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Total Materias</p>
              <p className="text-2xl font-black font-headline text-primary mt-1">{courses.length}</p>
            </div>
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
                      {parseUTC(session.scheduled_at).toLocaleString('es-ES', { 
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
                      {session.status === 'LIVE' ? 'ENTRAR A LA CLASE' : 'PREPARAR CLASE'}
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
                <button 
                  onClick={() => navigate(`/dashboard/courses/${course.id}`)}
                  className="px-6 py-3.5 bg-primary/10 text-primary rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver Contenido
                </button>
                <button 
                  onClick={() => handleShowStudents(course)}
                  className="px-6 py-3.5 bg-surface-container-high text-primary rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-outline-variant/20 transition-all shadow-sm active:scale-95"
                >
                  <Users className="w-3.5 h-3.5" /> Alumnos
                </button>
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
                <button 
                  onClick={() => handleDeleteMateria(course.id, course.name)}
                  disabled={deletingId === course.id}
                  className="px-4 py-3.5 bg-error/10 text-error rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-error/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {deletingId === course.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
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

      {/* Students Modal */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowStudentsModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-primary font-headline tracking-tight uppercase">Estudiantes Inscritos</h3>
                <p className="text-[10px] md:text-xs font-black text-secondary uppercase tracking-widest">{selectedMateria?.name}</p>
              </div>
              <button onClick={() => setShowStudentsModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto scrollbar-none">
              {loadingStudents ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : studentsInMateria.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {studentsInMateria.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-surface-container-low/40 rounded-2xl border border-outline-variant/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden text-white font-bold shadow-sm flex-shrink-0">
                          {student.user.avatar_url ? (
                            <img src={student.user.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-xs md:text-sm">{getInitials(student.user.full_name)}</span>
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-bold text-primary font-headline text-sm truncate uppercase tracking-tight">{student.user.full_name}</p>
                          <p className="text-[10px] text-on-surface-variant font-body truncate">{student.user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-outline uppercase">Inscrito</p>
                         <p className="text-[10px] font-bold text-primary">{new Date(student.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 opacity-40">
                  <Users className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-bold font-headline uppercase tracking-widest text-xs">Sin alumnos inscritos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherCoursesPage;
