import React, { useEffect, useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  List, 
  Loader2, 
  BookOpen, 
  ArrowRight, 
  CheckCircle, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  TrendingUp,
  Video,
  Calendar,
  Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { twMerge } from 'tailwind-merge';
import { parseUTC, formatToLocal } from '../utils/date';

interface Course {
  id: number;
  name: string;
  cover_image_url: string;
  description: string;
  is_enrolled?: boolean;
  progress?: number;
}

interface UpcomingSession {
  id: number;
  title: string;
  scheduled_at: string;
  status: string;
  bloque: {
    materia: {
      id: number;
      name: string;
    }
  }
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const ITEMS_PER_PAGE = 6;

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  
  // Search and Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [myPage, setMyPage] = useState(1);
  const [availPage, setAvailablePage] = useState(1);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0]);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Fetch Courses
      const response = await fetch(`${VITE_API_URL}/courses/`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allCourses = data.items as Course[];
        
        const enrolled = allCourses.filter(c => c.is_enrolled);
        setMyCourses(enrolled);
        setAvailableCourses(allCourses.filter(c => !c.is_enrolled));

        // 2. Fetch Upcoming Sessions for enrolled courses
        if (enrolled.length > 0) {
          const enrolledIds = enrolled.map(c => c.id);
          const { data: sessions, error: sessionsError } = await supabase
            .from('clases')
            .select('id, title, scheduled_at, status, bloque:bloques(materia:materias(id, name))')
            .in('status', ['SCHEDULED', 'LIVE'])
            .in('bloques.materia_id', enrolledIds)
            .order('scheduled_at', { ascending: true })
            .limit(5);

          if (!sessionsError && sessions) {
             // Filter sessions where bloque.materia is correctly joined
             setUpcomingSessions(sessions.filter(s => s.bloque) as any);
          }
        }
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
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Enroll error:', error);
    } finally {
      setEnrollingId(null);
    }
  };

  // Memoized Filtered Lists
  const filteredMyCourses = useMemo(() => 
    myCourses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [myCourses, searchQuery]
  );

  const filteredAvailCourses = useMemo(() => 
    availableCourses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [availableCourses, searchQuery]
  );

  // Paginated Slices
  const pagedMyCourses = filteredMyCourses.slice((myPage - 1) * ITEMS_PER_PAGE, myPage * ITEMS_PER_PAGE);
  const pagedAvailCourses = filteredAvailCourses.slice((availPage - 1) * ITEMS_PER_PAGE, availPage * ITEMS_PER_PAGE);

  const myTotalPages = Math.ceil(filteredMyCourses.length / ITEMS_PER_PAGE);
  const availTotalPages = Math.ceil(filteredAvailCourses.length / ITEMS_PER_PAGE);

  if (loading && myCourses.length === 0 && availableCourses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-28 px-2 md:px-0 max-w-full overflow-x-hidden">
      {/* 1. Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-primary rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white font-label text-[10px] font-black tracking-widest uppercase border border-white/10">
            Panel de Estudiante
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-black tracking-tighter leading-none">
            Hola, <span className="text-secondary">{userName}</span>
          </h1>
          <p className="text-white/70 text-sm md:text-lg max-w-xl leading-relaxed font-body">
            Tu formación espiritual continúa. {myCourses.length > 0 ? `Tienes ${myCourses.length} cursos activos.` : 'Explora las nuevas materias disponibles.'}
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
             <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
                   <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase opacity-60">Promedio General</p>
                   <p className="text-xl font-black font-headline">Pendiente</p>
                </div>
             </div>
          </div>
        </div>
        {/* Abstract background shapes */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-secondary/5 rounded-full blur-3xl"></div>
      </section>

      {/* 2. Upcoming Sessions Section */}
      {upcomingSessions.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
            <h2 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-3 tracking-tight">
              <Video className="text-secondary w-6 h-6" />
              Próximas Sesiones
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingSessions.map(session => (
              <div key={session.id} className="bg-white p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[9px] font-black text-secondary uppercase tracking-widest">{session.bloque?.materia?.name}</p>
                    <h3 className="font-black text-primary font-headline text-lg leading-tight uppercase truncate">{session.title}</h3>
                  </div>
                  {session.status === 'LIVE' ? (
                    <div className="bg-error/10 p-2 rounded-xl animate-pulse">
                      <div className="w-2 h-2 bg-error rounded-full" />
                    </div>
                  ) : (
                    <Calendar className="w-5 h-5 text-outline opacity-40" />
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold font-label uppercase">
                        {formatToLocal(session.scheduled_at)}
                      </span>
                    </div>
                  </div>
                  <Link 
                    to={`/dashboard/courses/${session.bloque?.materia?.id}/lessons/${session.id}`}
                    className={twMerge(
                      "px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                      session.status === 'LIVE' 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                        : "bg-surface-container-high text-primary hover:bg-primary hover:text-white"
                    )}
                  >
                    {session.status === 'LIVE' ? 'EN VIVO' : 'DETALLES'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Global Search and Filters */}
      <section className="sticky top-0 z-30 py-4 bg-surface/80 backdrop-blur-lg -mx-4 px-4 md:mx-0 md:px-0">
        <div className="relative group max-w-4xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de materia..." 
            value={searchQuery}
            onChange={(e) => {setSearchQuery(e.target.value); setMyPage(1); setAvailablePage(1);}}
            className="w-full pl-12 pr-4 py-4 bg-white border border-outline-variant/10 rounded-[1.5rem] font-body text-sm shadow-sm focus:ring-2 focus:ring-secondary transition-all outline-none"
          />
        </div>
      </section>

      {/* 4. My Active Courses - Thin/Compact Layout */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <h2 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-3 tracking-tight">
            <GraduationCap className="text-secondary w-6 h-6" />
            Mis Estudios
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-on-surface-variant uppercase bg-surface-container-low px-2 py-1 rounded-md">{filteredMyCourses.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedMyCourses.length > 0 ? pagedMyCourses.map(course => (
            <div key={course.id} className="bg-white rounded-[2rem] overflow-hidden border border-outline-variant/10 hover:shadow-premium transition-all duration-500 group flex flex-col sm:flex-row h-full">
              <div className="w-full sm:w-32 h-40 sm:h-auto overflow-hidden flex-shrink-0">
                <img 
                  alt={course.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  src={course.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=800'} 
                />
              </div>
              <div className="p-5 flex flex-col flex-1 min-w-0">
                <h3 className="text-lg font-headline font-bold text-primary leading-tight line-clamp-1 mb-2 uppercase tracking-tight">{course.name}</h3>
                <div className="space-y-3 mt-auto">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    <span>Progreso</span>
                    <span className="text-secondary font-black">{course.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(var(--secondary),0.4)]" 
                      style={{ width: `${course.progress || 0}%` }}
                    ></div>
                  </div>
                  <Link 
                    to={`/dashboard/courses/${course.id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-container transition-all active:scale-95 shadow-md"
                  >
                    CONTINUAR <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )) : (
            <div className="md:col-span-2 p-12 bg-surface-container-low/30 border-2 border-dashed border-outline-variant/20 rounded-[2.5rem] text-center">
              <p className="text-on-surface-variant font-bold font-headline uppercase text-xs opacity-40 italic">
                {searchQuery ? 'No se encontraron materias que coincidan.' : 'Aún no tienes materias activas.'}
              </p>
            </div>
          )}
        </div>

        {/* My Courses Pagination */}
        {myTotalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-2">
            <button onClick={() => setMyPage(p => Math.max(1, p - 1))} disabled={myPage === 1} className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-20 hover:bg-primary/5 transition-all"><ChevronLeft className="w-5 h-5 text-primary" /></button>
            <span className="text-[10px] font-black text-primary font-headline uppercase">Pág. {myPage} de {myTotalPages}</span>
            <button onClick={() => setMyPage(p => Math.min(myTotalPages, p + 1))} disabled={myPage === myTotalPages} className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-20 hover:bg-primary/5 transition-all"><ChevronRight className="w-5 h-5 text-primary" /></button>
          </div>
        )}
      </section>

      {/* 5. Discover New Subjects - Compact Grid */}
      <section className="space-y-6 pt-6">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <h2 className="text-xl md:text-2xl font-headline font-bold text-primary flex items-center gap-3 tracking-tight">
            <LayoutGrid className="text-secondary w-6 h-6" />
            Oferta Académica
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pagedAvailCourses.length > 0 ? pagedAvailCourses.map(course => (
            <div key={course.id} className="bg-white rounded-[2rem] overflow-hidden border border-outline-variant/10 hover:shadow-ambient transition-all duration-500 group flex flex-col">
              <div className="relative h-40 overflow-hidden grayscale-[50%] group-hover:grayscale-0 transition-all duration-700">
                <img src={course.cover_image_url} alt={course.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors"></div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-base font-headline font-bold text-primary mb-2 line-clamp-1 uppercase tracking-tight">{course.name}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2 font-body mb-6 leading-relaxed opacity-70">{course.description}</p>
                <button 
                  onClick={() => handleEnroll(course.id)}
                  disabled={enrollingId === course.id}
                  className="w-full mt-auto py-3.5 border-2 border-secondary/20 text-secondary rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {enrollingId === course.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  INSCRIBIRME
                </button>
              </div>
            </div>
          )) : !loading && (
             <div className="col-span-full text-center py-10 opacity-30">
               <p className="font-headline font-bold uppercase tracking-widest text-[10px]">No hay más ofertas disponibles.</p>
             </div>
          )}
        </div>

        {/* Available Pagination */}
        {availTotalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-4">
            <button onClick={() => setAvailablePage(p => Math.max(1, p - 1))} disabled={availPage === 1} className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-20 hover:bg-primary/5 transition-all"><ChevronLeft className="w-5 h-5 text-primary" /></button>
            <span className="text-[10px] font-black text-primary font-headline uppercase">Pág. {availPage} de {availTotalPages}</span>
            <button onClick={() => setAvailablePage(p => Math.min(availTotalPages, p + 1))} disabled={availPage === availTotalPages} className="p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-20 hover:bg-primary/5 transition-all"><ChevronRight className="w-5 h-5 text-primary" /></button>
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentDashboard;
