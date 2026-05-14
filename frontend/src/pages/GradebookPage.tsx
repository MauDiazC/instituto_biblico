import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  ChevronRight, 
  FileText, 
  CheckCircle, 
  Clock, 
  Send, 
  ArrowLeft, 
  Loader2, 
  Award, 
  ClipboardCheck, 
  ExternalLink, 
  Filter, 
  User, 
  Calendar,
  MessageSquare,
  AlertCircle,
  X,
  Mail
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';
import { formatToLocal, parseUTC } from '../utils/date';

interface Submission {
  id: number;
  content: string;
  grade: number | null;
  feedback: string | null;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
  tarea: {
    id: number;
    title: string;
    materia_name: string;
  };
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const GradebookPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);
  const [isDetailViewMobile, setIsDetailViewMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('all');
  
  // Grading state
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/teacher/submissions`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!response.ok) throw new Error('Error fetching submissions');
      const data = await response.json();
      setSubmissions(data);
      
      // Auto-select first pending submission if none selected
      if (data.length > 0 && selectedSubIndex === null) {
        const firstPending = data.findIndex((s: Submission) => s.grade === null);
        const indexToSelect = firstPending !== -1 ? firstPending : 0;
        setSelectedSubIndex(indexToSelect);
        setGrade(data[indexToSelect].grade?.toString() || '');
        setFeedback(data[indexToSelect].feedback || '');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleSelectSubmission = (index: number) => {
    setSelectedSubIndex(index);
    setGrade(submissions[index].grade?.toString() || '');
    setFeedback(submissions[index].feedback || '');
    setIsDetailViewMobile(true);
  };

  const handleGradeSubmission = async () => {
    if (selectedSubIndex === null) return;
    const sub = submissions[selectedSubIndex];
    
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/submissions/${sub.id}/grade?grade=${grade}&feedback=${encodeURIComponent(feedback)}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!response.ok) throw new Error('Error updating grade');
      
      const updatedSubmissions = [...submissions];
      updatedSubmissions[selectedSubIndex] = { ...sub, grade: parseInt(grade), feedback };
      setSubmissions(updatedSubmissions);
      alert('Calificación guardada correctamente.');
    } catch (error) {
      console.error('Error grading:', error);
      alert('Error al guardar la calificación.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchesSearch = s.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           s.tarea.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' || 
                           (filter === 'pending' && s.grade === null) || 
                           (filter === 'graded' && s.grade !== null);
      return matchesSearch && matchesFilter;
    });
  }, [submissions, searchQuery, filter]);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.grade === null).length,
    graded: submissions.filter(s => s.grade !== null).length
  };

  const selectedSub = selectedSubIndex !== null ? submissions[selectedSubIndex] : null;

  if (loading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] -mx-6 md:-mx-10 -mt-10 overflow-hidden bg-surface-container-lowest">
      
      {/* Sidebar: Submissions List */}
      <div className={twMerge(
        "w-full lg:w-[420px] bg-white border-r border-outline-variant/10 flex flex-col transition-all duration-300 z-20 shadow-xl lg:shadow-none",
        isDetailViewMobile ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-black font-headline text-primary tracking-tighter uppercase leading-none">Calificaciones</h1>
            <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em] mt-2">Centro de Evaluación</p>
          </div>

          {/* Filters Bar */}
          <div className="flex p-1.5 bg-surface-container-low rounded-[1.5rem]">
            {(['all', 'pending', 'graded'] as const).map((f) => (
               <button 
                key={f}
                onClick={() => setFilter(f)}
                className={twMerge(
                  "flex-1 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1",
                  filter === f ? "bg-primary text-white shadow-lg" : "text-on-surface-variant hover:bg-white"
                )}
               >
                 <span className="text-lg font-headline leading-none">
                    {f === 'all' ? stats.total : f === 'pending' ? stats.pending : stats.graded}
                 </span>
                 <span className="opacity-60">{f === 'all' ? 'Total' : f === 'pending' ? 'Pendientes' : 'Listas'}</span>
               </button>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-transparent focus:border-secondary/30 focus:bg-white rounded-[1.5rem] text-xs font-body outline-none transition-all shadow-inner" 
              placeholder="Buscar por estudiante o tarea..." 
              type="text" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 scrollbar-thin">
          {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub) => (
            <div 
              key={sub.id}
              onClick={() => handleSelectSubmission(submissions.indexOf(sub))}
              className={twMerge(
                "p-5 rounded-[2rem] cursor-pointer transition-all border flex items-center gap-5 group",
                selectedSub?.id === sub.id 
                ? 'bg-primary/5 border-primary/20 shadow-sm' 
                : 'border-transparent hover:bg-surface-container-low'
              )}
            >
              <div className={twMerge(
                "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-sm",
                selectedSub?.id === sub.id ? "bg-primary text-white scale-105" : "bg-white text-primary border border-outline-variant/10"
              )}>
                {getInitials(sub.user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-black text-sm text-primary truncate uppercase tracking-tight">{sub.user.full_name}</h4>
                  {sub.grade !== null && (
                    <span className="text-[10px] font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">{sub.grade} pts</span>
                  )}
                </div>
                <p className="text-[10px] text-secondary font-bold truncate uppercase tracking-widest leading-none mb-2">{sub.tarea.materia_name}</p>
                <div className="flex items-center gap-3">
                   <div className={twMerge(
                    "w-1.5 h-1.5 rounded-full",
                    sub.grade === null ? 'bg-secondary animate-pulse shadow-[0_0_8px_rgba(var(--secondary),0.5)]' : 'bg-green-500'
                  )} />
                   <span className="text-[8px] text-on-surface-variant font-black uppercase tracking-tighter opacity-60">
                     {formatToLocal(sub.created_at)}
                   </span>
                </div>
              </div>
              <ChevronRight className={twMerge("w-4 h-4 text-outline transition-transform", selectedSub?.id === sub.id && "translate-x-1 text-primary")} />
            </div>
          )) : (
            <div className="text-center py-20 opacity-20">
              <ClipboardCheck className="w-16 h-16 mx-auto mb-4" />
              <p className="text-[10px] font-black font-headline uppercase tracking-[0.2em]">Sin entregas</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Grading Panel */}
      <div className={twMerge(
        "flex-1 flex flex-col bg-surface-container-lowest transition-all duration-300",
        isDetailViewMobile ? "flex" : "hidden lg:flex"
      )}>
        {selectedSub ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header Detail */}
            <header className="p-8 md:p-12 border-b border-outline-variant/10 bg-white/50 backdrop-blur-md flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="space-y-3 w-full">
                <button 
                  onClick={() => setIsDetailViewMobile(false)}
                  className="lg:hidden flex items-center gap-2 text-primary font-black text-[10px] mb-6 uppercase tracking-widest bg-primary/5 px-4 py-2 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" /> Regresar a la lista
                </button>
                <div className="flex flex-wrap items-center gap-3">
                   <span className="px-3 py-1 bg-secondary/10 text-secondary text-[9px] font-black uppercase tracking-widest rounded-full">{selectedSub.tarea.materia_name}</span>
                   <ChevronRight className="w-3 h-3 text-outline" />
                   <span className="px-3 py-1 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest rounded-full truncate max-w-[300px]">{selectedSub.tarea.title}</span>
                </div>
                <div className="flex items-center gap-5 pt-2">
                   <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white font-black text-xl shadow-premium">
                      {getInitials(selectedSub.user.full_name)}
                   </div>
                   <div>
                      <h2 className="text-4xl md:text-5xl font-black font-headline text-primary tracking-tighter leading-none uppercase">{selectedSub.user.full_name}</h2>
                      <p className="text-sm text-on-surface-variant font-body opacity-60 mt-2 flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {selectedSub.user.email}</p>
                   </div>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-6 bg-white p-6 rounded-[2rem] border border-outline-variant/5 shadow-sm">
                <div className="text-right">
                  <p className="text-[9px] text-outline font-black uppercase tracking-widest">Enviado el</p>
                  <p className="text-sm font-headline font-black text-primary uppercase">{formatToLocal(selectedSub.created_at)}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center">
                   <FileText className="w-7 h-7 text-primary" />
                </div>
              </div>
            </header>

            {/* Content & Grading Panels */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin">
              <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10">
                
                {/* Left Column: The Work */}
                <div className="xl:col-span-8 space-y-10">
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black shadow-lg">1</div>
                       <h3 className="text-xs font-black font-headline text-primary uppercase tracking-[0.25em]">Evidencia de Entrega</h3>
                    </div>

                    <div className="bg-white p-10 md:p-14 rounded-[3rem] shadow-premium border border-outline-variant/5 relative overflow-hidden ring-1 ring-black/[0.01]">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20" />
                      
                      <div className="prose max-w-none">
                         <p className="font-body text-xl leading-relaxed text-on-surface whitespace-pre-wrap selection:bg-secondary/20">
                           {selectedSub.content}
                         </p>
                      </div>
                      
                      {selectedSub.content.startsWith('http') && (
                        <div className="mt-12 pt-10 border-t border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center"><FileText className="w-6 h-6 text-primary" /></div>
                             <div>
                                <p className="text-xs font-black text-primary uppercase tracking-tight">Archivo Adjunto</p>
                                <p className="text-[10px] text-on-surface-variant font-medium">Formato detectable en el enlace</p>
                             </div>
                          </div>
                          <a 
                            href={selectedSub.content} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-3 bg-primary text-white px-10 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-premium"
                          >
                            <ExternalLink className="w-4 h-4" /> Ver Documento Full
                          </a>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Column: Grading Tool */}
                <div className="xl:col-span-4">
                  <div className="sticky top-0 space-y-10">
                    <section>
                      <div className="flex items-center gap-4 mb-8">
                         <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center font-black shadow-lg">2</div>
                         <h3 className="text-xs font-black font-headline text-primary uppercase tracking-[0.25em]">Calificar Trabajo</h3>
                      </div>

                      <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-secondary/10 space-y-8 ring-1 ring-secondary/5">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">Puntaje Final</label>
                          <div className="relative group">
                            <input 
                              value={grade}
                              onChange={(e) => setGrade(e.target.value)}
                              className="w-full text-6xl font-black font-headline text-primary p-8 bg-surface-container-low rounded-[2rem] border-2 border-transparent focus:border-secondary focus:bg-white transition-all outline-none text-center shadow-inner group-hover:bg-surface-container-high/50" 
                              max="100" min="0" placeholder="0" type="number" 
                            />
                            <span className="absolute bottom-4 right-8 text-sm font-black text-outline/40 pointer-events-none uppercase tracking-widest">Puntos / 100</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">Retroalimentación</label>
                          <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full font-body text-base p-8 bg-surface-container-low rounded-[2rem] border-2 border-transparent focus:border-secondary focus:bg-white transition-all outline-none resize-none shadow-inner min-h-[200px]" 
                            placeholder="Escribe tus comentarios para el alumno aquí..." 
                          ></textarea>
                        </div>

                        <button 
                          onClick={handleGradeSubmission}
                          disabled={isSaving || !grade}
                          className="w-full py-6 bg-primary hover:bg-primary-container text-white font-black font-headline text-[11px] uppercase tracking-[0.3em] rounded-[2rem] shadow-premium transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
                        >
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                          PUBLICAR NOTA
                        </button>
                      </div>
                    </section>

                    {/* Guidelines Card */}
                    <div className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 relative overflow-hidden">
                      <AlertCircle className="absolute -right-2 -bottom-2 w-16 h-16 text-primary/5 -rotate-12" />
                      <p className="text-[10px] font-black text-primary uppercase mb-4 tracking-widest flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Criterios de Evaluación
                      </p>
                      <ul className="text-[11px] text-on-surface-variant space-y-3 font-medium opacity-80">
                        <li className="flex gap-2"><span>•</span> <span>Claridad en la exposición de ideas.</span></li>
                        <li className="flex gap-2"><span>•</span> <span>Ortografía y formato del documento.</span></li>
                        <li className="flex gap-2"><span>•</span> <span>Cumplimiento de los objetivos de la materia.</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            <div className="w-40 h-40 bg-primary/5 rounded-[4rem] flex items-center justify-center mb-10 animate-pulse border border-primary/10">
              <ClipboardCheck className="w-20 h-20 text-primary/20" />
            </div>
            <h2 className="text-3xl font-black font-headline text-primary uppercase tracking-tight mb-4">Selecciona una entrega</h2>
            <p className="text-on-surface-variant text-base max-w-sm opacity-60 font-body leading-relaxed">
              Explora las entregas de tus alumnos en la lista de la izquierda para iniciar la evaluación académica.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradebookPage;
