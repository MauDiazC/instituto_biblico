import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, PlayCircle, Video, Clock, Lock, FileText, Table, Library, Download, ExternalLink, Quote, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface Clase {
  id: number;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'RECORDED' | 'PROCESSING';
  scheduled_at: string;
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
  const navigate = useNavigate();
  const [materia, setMateria] = useState<Materia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMateria = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${VITE_API_URL}/courses/${id}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });

        if (!response.ok) throw new Error('Error fetching materia');
        
        const data = await response.json();
        setMateria(data);
      } catch (error) {
        console.error('Error fetching materia:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMateria();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!materia) {
    return <div className="text-center py-20">Materia no encontrada</div>;
  }

  return (
    <>
      {/* Hero Header */}
      <div className="mb-12">
        <nav className="flex items-center gap-2 text-on-surface-variant text-xs font-label mb-6 uppercase tracking-widest">
          <span>Mis Cursos</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary font-bold">{materia.name}</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black font-headline text-primary mb-4 leading-none">{materia.name}</h1>
            <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">{materia.description}</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient w-full md:w-72 border border-outline-variant/10">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-tighter">Tu Progreso</span>
              <span className="text-2xl font-black font-headline text-primary">{materia.progress || 0}%</span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-secondary transition-all duration-1000 ease-out" style={{ width: `${materia.progress || 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-12">
        <div className="lg:col-span-8 space-y-6">
          {materia.bloques.map((bloque, idx) => (
            <div key={bloque.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between p-6 bg-surface-container-low/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold font-headline">
                    {(idx + 1).toString().padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-primary">{bloque.name}</h3>
                    <p className="text-xs text-on-surface-variant">{bloque.clases.length} Clases disponibles</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {bloque.clases.map(clase => (
                  <div 
                    key={clase.id} 
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all border ${
                      clase.status === 'LIVE' 
                      ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' 
                      : 'bg-surface-container-low border-transparent hover:border-outline-variant/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      clase.status === 'LIVE' ? 'bg-primary text-white' : 'bg-surface-container-highest text-primary'
                    }`}>
                      {clase.status === 'LIVE' ? <Video className="w-6 h-6 animate-pulse" /> : <PlayCircle className="w-6 h-6 opacity-40" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-primary truncate">{clase.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {clase.status === 'LIVE' && (
                          <span className="text-[9px] font-black bg-error text-white px-2 py-0.5 rounded-full animate-pulse uppercase tracking-widest">EN VIVO</span>
                        )}
                        {clase.status === 'RECORDED' && (
                          <span className="text-[9px] font-black bg-secondary-fixed/50 text-secondary px-2 py-0.5 rounded-full uppercase tracking-widest">GRABADA</span>
                        )}
                        {clase.status === 'SCHEDULED' && (
                          <span className="text-[9px] font-black bg-surface-container-highest text-outline px-2 py-0.5 rounded-full uppercase tracking-widest">PROGRAMADA</span>
                        )}
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          {clase.status === 'SCHEDULED' ? new Date(clase.scheduled_at).toLocaleString() : 'Disponible'}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate(`/dashboard/courses/${materia.id}/lessons/${clase.id}`)}
                      className={`px-4 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${
                        clase.status === 'LIVE' 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105' 
                        : 'text-primary hover:bg-primary/5'
                      }`}
                    >
                      {clase.status === 'LIVE' ? 'UNIRSE' : 'VER'}
                    </button>
                  </div>
                ))}
                {bloque.clases.length === 0 && (
                   <p className="text-center py-4 text-xs text-on-surface-variant italic">No hay clases registradas en este módulo.</p>
                )}
              </div>
            </div>
          ))}

          {/* Scripture Block */}
          <div className="p-10 bg-surface-container-highest rounded-2xl border-l-4 border-secondary relative overflow-hidden">
            <Quote className="absolute right-6 top-6 w-16 h-16 text-secondary/5" />
            <p className="text-xl font-body italic text-primary leading-relaxed mb-4 relative z-10">
              "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."
            </p>
            <p className="text-sm font-headline font-bold text-secondary uppercase tracking-widest relative z-10">— 2 Timoteo 2:15</p>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/15 shadow-sm">
            <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-8">Información del Curso</h4>
            <div className="space-y-6">
               <div className="flex items-start gap-4">
                  <Library className="w-5 h-5 text-secondary flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary font-headline">Recursos Digitales</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">Guías de estudio y bibliografía descargable en cada lección.</p>
                  </div>
               </div>
               <div className="flex items-start gap-4">
                  <Video className="w-5 h-5 text-secondary flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary font-headline">Clases en Vivo</p>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">Participación interactiva y resolución de dudas en tiempo real.</p>
                  </div>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};

export default SubjectDetailPage;
