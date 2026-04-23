import React, { useEffect, useState } from 'react';
import { UserCheck, ListTodo, ArrowRight, Users, BookOpen, Video, Filter, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { parseUTC } from '../utils/date';

interface Course {
  id: number;
  name: string;
  cover_image_url: string;
  description: string;
  student_count: number;
  module_count: number;
}

interface LiveClass {
  id: number;
  title: string;
  scheduled_at: string;
  status?: string;
  bloque?: {
    materia_id: number;
  } | {
    materia_id: number;
  }[];
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, '');
};

const VITE_API_URL = getApiUrl();

const TeacherDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('...');
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [nextClass, setNextClass] = useState<LiveClass | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: '00', mins: '00', secs: '00' });
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Docente');
        }

        // 1. Fetch Materias and related data
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
          setTotalStudents(mappedCourses.reduce((acc, curr) => acc + curr.student_count, 0));
        }

        // 2. Fetch Pending Submissions count
        const { count: submissionCount } = await supabase
          .from('entregas')
          .select('*', { count: 'exact', head: true })
          .is('grade', null);
        
        setPendingSubmissions(submissionCount || 0);

        // 3. Fetch Next Live Class (accounting for timezone differences)
        // We look for classes scheduled from 12 hours ago until future
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        
        const { data: clases, error: clasesError } = await supabase
          .from('clases')
          .select('id, title, scheduled_at, status, bloque:bloques(materia_id)')
          .gt('scheduled_at', twelveHoursAgo)
          .order('scheduled_at', { ascending: true });

        if (clasesError) throw clasesError;
        if (clases && clases.length > 0) {
          // Prioritize: LIVE > upcoming SCHEDULED > most recent RECORDED
          const liveClass = clases.find(c => c.status === 'LIVE');
          const nextScheduled = clases.find(c => c.status === 'SCHEDULED' && parseUTC(c.scheduled_at).getTime() > Date.now());
          
          const selected = liveClass || nextScheduled || clases[clases.length - 1];
          setNextClass(selected);
          
          const startTime = parseUTC(selected.scheduled_at).getTime();
          const now = Date.now();
          
          if (selected.status === 'LIVE' || (selected.status === 'SCHEDULED' && startTime <= now)) {
            setIsLive(true);
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Timer Effect
  useEffect(() => {
    if (!nextClass) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const target = parseUTC(nextClass.scheduled_at).getTime();
      const diff = target - now;

      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ hours: '00', mins: '00', secs: '00' });
        setIsLive(true);
        return;
      }

      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: h.toString().padStart(2, '0'),
        mins: m.toString().padStart(2, '0'),
        secs: s.toString().padStart(2, '0')
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [nextClass]);

  const handleStartClass = async () => {
    if (!nextClass) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
      }

      const targetUrl = `${VITE_API_URL}/courses/classes/${nextClass.id}/room`;
      
      console.log('--- DEBUG START CLASS ---');
      console.log('Base VITE_API_URL:', VITE_API_URL);
      console.log('Full targetUrl:', targetUrl);
      console.log('Class ID:', nextClass.id);
      console.log('Auth Token exists:', !!session.access_token);
      console.log('--- END DEBUG ---');

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error del servidor (${response.status})`);
      }
      
      const materiaId = (nextClass as any).bloque?.materia_id || 1;
      navigate(`/dashboard/courses/${materiaId}/lessons/${nextClass.id}`);
    } catch (error) {
      console.error('CRITICAL: handleStartClass failed:', error);
      alert(`Error al iniciar la clase: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nRevisa la consola (F12) para más detalles.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-12 space-y-12">
      {/* 1. Welcome Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black text-primary font-headline tracking-tighter leading-none mb-2 text-balance">Bienvenido,</h1>
            <p className="text-3xl font-light text-secondary font-body">Prof. {userName}</p>
          </div>
          <div className="text-right">
            <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest">Año 2026</p>
            <p className="text-primary font-bold font-headline">Estado: Docente</p>
          </div>
        </div>
      </section>

      {/* 2. Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient group hover:translate-y-[-4px] transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-surface-container-low p-3 rounded-lg">
              <UserCheck className="w-6 h-6 text-primary-container" />
            </div>
            <span className="text-xs font-bold text-secondary bg-secondary-fixed px-2 py-1 rounded-full">Sincronizado</span>
          </div>
          <p className="text-on-surface-variant text-sm font-label mb-1 uppercase tracking-wider">Estudiantes Activos</p>
          <p className="text-4xl font-black text-primary font-headline">{totalStudents.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient group hover:translate-y-[-4px] transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-secondary-fixed-dim p-3 rounded-lg text-secondary">
              <ListTodo className="w-6 h-6" />
            </div>
            {pendingSubmissions > 0 && (
              <span className="text-xs font-bold text-error bg-error-container px-2 py-1 rounded-full uppercase tracking-tighter">
                Pendientes
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-sm font-label mb-1 uppercase tracking-wider">Entregas por Calificar</p>
          <p className="text-4xl font-black text-primary font-headline">{pendingSubmissions}</p>
        </div>      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. My Courses Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-headline text-primary">Mis Cursos Activos</h2>
            <Link to="/dashboard/teacher/courses" className="text-secondary font-bold text-sm font-label flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {courses.length > 0 ? courses.map(course => (
              <div key={course.id} className="bg-surface-container-lowest p-4 rounded-xl flex flex-col sm:flex-row items-center gap-6 shadow-ambient border-l-4 border-secondary transition-all hover:bg-surface-container-low">
                <div className="w-full sm:w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img className="w-full h-full object-cover" src={course.cover_image_url} alt={course.name} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-bold text-primary text-lg font-headline leading-tight">{course.name}</h3>
                  <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-on-surface-variant mt-1">
                    <span className="flex items-center gap-1 font-label"><Users className="w-3 h-3" /> {course.student_count} Alumnos</span>
                    <span className="flex items-center gap-1 font-label"><BookOpen className="w-3 h-3" /> {course.module_count} Bloques</span>
                  </div>
                </div>
                <Link 
                  to={`/dashboard/teacher/editor?materiaId=${course.id}`}
                  className="bg-primary-container text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-transform active:scale-95 hover:bg-primary whitespace-nowrap"
                >
                  Gestionar
                </Link>
              </div>
            )) : (
              <div className="bg-surface-container-low/50 p-12 rounded-xl text-center border-2 border-dashed border-outline-variant/30">
                <BookOpen className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
                <p className="text-on-surface-variant font-bold">No tienes cursos asignados todavía.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-8">
          {/* 4. Live Session Hub */}
          <div className="bg-primary p-6 rounded-2xl text-white relative overflow-hidden shadow-premium">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <p className="text-secondary-fixed-dim text-xs uppercase tracking-widest font-bold mb-2">
                {isLive ? 'Transmisión en Curso' : 'Próxima Clase en Vivo'}
              </p>
              <h3 className="text-xl font-bold font-headline mb-4">{nextClass ? nextClass.title : 'No hay transmisiones'}</h3>
              
              {isLive ? (
                <div className="bg-white/10 rounded-xl p-6 mb-6 flex flex-col items-center justify-center backdrop-blur-md border border-white/10 animate-pulse">
                  <div className="flex items-center gap-2 text-secondary mb-1">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    <p className="text-xs font-black uppercase tracking-widest font-headline">En Vivo</p>
                  </div>
                  <p className="text-sm font-body text-white/80">La clase ya ha comenzado</p>
                </div>
              ) : (
                <div className="bg-white/10 rounded-xl p-4 mb-6 flex justify-around backdrop-blur-md border border-white/10">
                  <div className="text-center font-headline">
                    <p className="text-2xl font-black">{timeLeft.hours}</p>
                    <p className="text-[10px] uppercase font-label">Horas</p>
                  </div>
                  <div className="text-2xl font-black">:</div>
                  <div className="text-center font-headline">
                    <p className="text-2xl font-black">{timeLeft.mins}</p>
                    <p className="text-[10px] uppercase font-label">Mins</p>
                  </div>
                  <div className="text-2xl font-black">:</div>
                  <div className="text-center font-headline">
                    <p className="text-2xl font-black">{timeLeft.secs}</p>
                    <p className="text-[10px] uppercase font-label">Segs</p>
                  </div>
                </div>
              )}

              <button 
                disabled={!nextClass || (nextClass as any).status === 'RECORDED'}
                onClick={handleStartClass}
                className={`w-full ${nextClass && (nextClass as any).status !== 'RECORDED' ? 'bg-secondary' : 'bg-white/10 cursor-not-allowed'} text-white py-3 rounded-xl font-black font-headline tracking-tight transition-all hover:bg-on-secondary-container active:scale-95 flex items-center justify-center gap-2`}
              >
                <Video className="w-5 h-5" />
                {nextClass ? (
                  (nextClass as any).status === 'RECORDED' ? 'TRANSMISIÓN TERMINADA' :
                  (isLive ? 'UNIRSE AHORA' : 'INICIAR TRANSMISIÓN')
                ) : 'SIN DIRECTOS'}
              </button>
            </div>
          </div>

          {/* 5. Recent Submissions Quick View */}
          <div className="bg-surface-container-low p-6 rounded-2xl shadow-sm">
            <h3 className="text-primary font-bold font-headline mb-4 flex items-center justify-between">
              Entregas Recientes
              <Filter className="w-4 h-4 text-on-surface-variant" />
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-on-surface-variant font-body italic text-center py-4">
                El centro de calificaciones estará disponible próximamente.
              </p>
              <button className="w-full py-2 text-primary/40 cursor-not-allowed font-bold text-sm font-label border border-primary/10 rounded-lg">
                Centro de Calificaciones
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
