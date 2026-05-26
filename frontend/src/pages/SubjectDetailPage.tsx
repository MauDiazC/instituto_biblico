import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, PlayCircle, Video, Clock, Lock, FileText, Table, Library, Download, ExternalLink, Quote, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { formatToLocal } from '../utils/date';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

interface Clase {
  id: number;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'RECORDED' | 'PROCESSING' | 'PLANNED';
  scheduled_at: string;
  video_url?: string | null;
}

interface Bloque {
  id: number;
  name: string;
  clases: Clase[];
}

interface Materia {
  id: number;
  name: string;
  description: string;
  progress?: number;
  bloques: Bloque[];
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const SubjectDetailPage: React.FC = () => {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [materia, setMateria] = useState<Materia | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());

  const isTeacher = role === 'teacher' || role === 'admin';

  const syncRecordings = async () => {
    if (!isTeacher) return;
    try {
      setIsSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${VITE_API_URL}/courses/teacher/recordings/sync`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      console.log('SYNC-COMPLETE: Recordings synchronized');
    } catch (err) {
      console.error('SYNC-ERROR: Failed to sync recordings:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchMateria = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${VITE_API_URL}/courses/${id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Error fetching materia');
      
      const data = await response.json();
      setMateria(data);
      setLastUpdate(new Date().toLocaleTimeString());
      
      if (silent) {
        console.log(`POLLING: Data refreshed at ${new Date().toLocaleTimeString()}`);
      }
    } catch (error) {
      console.error('Error fetching materia:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      const initFetch = async () => {
        if (isTeacher) {
          await syncRecordings();
        }
        await fetchMateria();
      };
      
      initFetch();

      const channel = supabase
        .channel(`course-realtime-${id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'clases'
        }, (payload) => {
          console.log('REALTIME-DETECTED: Class change in table', payload);
          fetchMateria(true);
        })
        .subscribe((status) => {
          console.log(`REALTIME-STATUS: ${status}`);
        });

      const interval = setInterval(() => {
        fetchMateria(true);
      }, 3000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [id, fetchMateria, isTeacher]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!materia) {
    return <div className="text-center py-20 font-headline font-bold text-primary uppercase tracking-widest">Materia no encontrada</div>;
  }

  return (
    <div className="overflow-x-hidden">
      {/* Hero Header */}
      <div className="mb-10 md:mb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <nav className="flex items-center gap-2 text-on-surface-variant text-[10px] font-label uppercase tracking-widest">
            <span>Mis Cursos</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-black truncate max-w-[150px] md:max-w-none">{materia.name}</span>
          </nav>
          {isTeacher && (
            <button 
              onClick={async () => {
                await syncRecordings();
                await fetchMateria(true);
              }}
              disabled={isSyncing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-high text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl min-w-0">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black font-headline text-primary mb-4 leading-none uppercase tracking-tight break-words">{materia.name}</h1>
            <p className="text-on-surface-variant text-sm md:text-lg max-w-xl leading-relaxed opacity-80">{materia.description}</p>
            <p className="text-[8px] text-outline mt-3 font-mono opacity-40 uppercase tracking-tighter italic">Sincronización activa: {lastUpdate}</p>
          </div>
          {!isTeacher && (
            <div className="bg-white p-6 rounded-[2rem] shadow-ambient w-full md:w-72 border border-outline-variant/10">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tu Progreso</span>
                <span className="text-2xl font-black font-headline text-primary">{materia.progress || 0}%</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary transition-all duration-1000 ease-out" style={{ width: `${materia.progress || 0}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-12">
        <div className="lg:col-span-8 space-y-6">
          {materia.bloques.map((bloque, idx) => (
            <div key={bloque.id} className="bg-white rounded-[2rem] overflow-hidden border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between p-5 md:p-6 bg-surface-container-low/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black font-headline text-sm shadow-md">
                    {(idx + 1).toString().padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-primary uppercase text-sm md:text-base tracking-tight">{bloque.name}</h3>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{bloque.clases.length} Clases</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 md:p-6 space-y-3">
                {bloque.clases.map(clase => (
                  <div 
                    key={clase.id} 
                    className={twMerge(
                      "flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl transition-all border",
                      clase.status === 'LIVE' 
                      ? 'bg-primary/5 border-primary/20 ring-4 ring-primary/5' 
                      : 'bg-surface-container-low/40 border-transparent hover:border-outline-variant/10 hover:bg-white hover:shadow-md'
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={twMerge(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        clase.status === 'LIVE' ? 'bg-primary text-white shadow-lg' : 'bg-white text-primary border border-outline-variant/10'
                      )}>
                        {clase.status === 'LIVE' ? <Video className="w-6 h-6 animate-pulse" /> : <PlayCircle className="w-6 h-6 opacity-40" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-xs md:text-sm text-primary uppercase tracking-tight truncate">{clase.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {clase.status === 'LIVE' && (
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                              </span>
                              <span className="text-[8px] font-black text-error uppercase tracking-widest">EN VIVO</span>
                            </div>
                          )}
                          {clase.status === 'RECORDED' && (
                            <span className={twMerge(
                              "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                              clase.video_url ? "bg-secondary/10 text-secondary" : "bg-surface-container-highest text-outline"
                            )}>
                              {clase.video_url ? 'GRABADA' : 'FINALIZADA'}
                            </span>
                          )}
                          {clase.status === 'PROCESSING' && (
                            <span className="text-[8px] font-black bg-surface-container-highest text-outline px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">PROCESANDO</span>
                          )}
                          {(clase.status === 'SCHEDULED' || clase.status === 'PLANNED') && (
                            <span className="text-[8px] font-black bg-surface-container-highest text-outline px-2 py-0.5 rounded-full uppercase tracking-widest">PROGRAMADA</span>
                          )}
                          <span className="text-[8px] md:text-[9px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">
                            {clase.status === 'LIVE' ? '¡Únete ahora!' : formatToLocal(clase.scheduled_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto">
                      {clase.status === 'LIVE' ? (
                        <button 
                          onClick={() => navigate(`/dashboard/courses/${materia.id}/lessons/${clase.id}`)}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-container active:scale-95"
                        >
                          ENTRAR
                        </button>
                      ) : clase.status === 'RECORDED' ? (
                        <button 
                          onClick={() => navigate(`/dashboard/courses/${materia.id}/lessons/${clase.id}`)}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-white text-primary border border-primary/10 hover:bg-primary/5 active:scale-95 shadow-sm"
                        >
                          {clase.video_url ? 'VER CLASE' : 'VER DETALLES'}
                        </button>
                      ) : clase.status === 'PROCESSING' ? (
                        <button 
                          disabled
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-outline opacity-50 cursor-not-allowed flex items-center justify-center gap-2 bg-surface-container"
                        >
                          <Clock className="w-3 h-3" />
                          PROCESANDO
                        </button>
                      ) : isTeacher && (clase.status === 'SCHEDULED' || clase.status === 'PLANNED') ? (
                        <button 
                          onClick={() => navigate(`/dashboard/courses/${materia.id}/lessons/${clase.id}`)}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-[#5d4201] active:scale-95"
                        >
                          PREPARAR
                        </button>
                      ) : (
                        <button 
                          disabled
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-outline opacity-30 cursor-not-allowed bg-surface-container"
                        >
                          PROXIMAMENTE
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {bloque.clases.length === 0 && (
                   <p className="text-center py-6 text-[10px] text-on-surface-variant italic font-medium uppercase tracking-widest opacity-40">No hay clases registradas aún.</p>
                )}
              </div>
            </div>
          ))}

          {/* Scripture Block */}
          <div className="p-6 md:p-10 bg-surface-container-highest/50 rounded-[2.5rem] border-l-8 border-secondary relative overflow-hidden group">
            <Quote className="absolute right-6 top-6 w-16 h-16 text-secondary/5 group-hover:scale-110 transition-transform duration-700" />
            <p className="text-lg md:text-xl font-body italic text-primary leading-relaxed mb-6 relative z-10 selection:bg-secondary/20">
              "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."
            </p>
            <div className="flex items-center gap-3 relative z-10">
               <div className="w-8 h-px bg-secondary/30" />
               <p className="text-[10px] md:text-xs font-black text-secondary uppercase tracking-[0.3em]">2 Timoteo 2:15</p>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-outline-variant/10 shadow-sm">
            <h4 className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-secondary" /> Información del Curso
            </h4>
            <div className="space-y-6 md:space-y-8">
               <div className="flex items-start gap-4 group">
                  <div className="p-3 bg-secondary/5 rounded-xl group-hover:bg-secondary/10 transition-colors">
                    <Library className="w-5 h-5 text-secondary flex-shrink-0" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary font-headline uppercase tracking-tight">Recursos Digitales</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1 opacity-70">Guías de estudio y bibliografía descargable en cada lección.</p>
                  </div>
               </div>
               <div className="flex items-start gap-4 group">
                  <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <Video className="w-5 h-5 text-primary flex-shrink-0" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary font-headline uppercase tracking-tight">Clases en Vivo</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1 opacity-70">Participación interactiva y resolución de dudas en tiempo real.</p>
                  </div>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SubjectDetailPage;
