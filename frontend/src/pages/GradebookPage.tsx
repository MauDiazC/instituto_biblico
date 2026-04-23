import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, FileText, CheckCircle, Clock, Send, ArrowLeft, Loader2, Award, ClipboardCheck, ExternalLink, Filter } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';

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
  const [isSaving, setIsSubmitting] = useState(false);

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
      setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.tarea.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'pending' && s.grade === null) || 
                         (filter === 'graded' && s.grade !== null);
    return matchesSearch && matchesFilter;
  });

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
    <div className="flex h-[calc(100vh-140px)] -mx-6 md:-mx-12 -mt-12 overflow-hidden bg-surface-container-lowest">
      {/* Sidebar: List of Submissions */}
      <div className={twMerge(
        "w-full md:w-[400px] border-r border-outline-variant/10 bg-white flex flex-col transition-all duration-300 z-10",
        isDetailViewMobile ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-black font-headline text-primary tracking-tight">CENTRO DE CALIFICACIONES</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em] mt-1">Gestión de entregas académicas</p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setFilter('all')} className={twMerge("p-3 rounded-2xl border transition-all text-center", filter === 'all' ? "bg-primary text-white border-primary shadow-lg" : "bg-surface-container-low border-outline-variant/10 text-on-surface-variant")}>
              <p className="text-xl font-black font-headline leading-none">{stats.total}</p>
              <p className="text-[8px] font-bold uppercase mt-1 opacity-70">Total</p>
            </button>
            <button onClick={() => setFilter('pending')} className={twMerge("p-3 rounded-2xl border transition-all text-center", filter === 'pending' ? "bg-secondary text-white border-secondary shadow-lg" : "bg-surface-container-low border-outline-variant/10 text-on-surface-variant")}>
              <p className="text-xl font-black font-headline leading-none">{stats.pending}</p>
              <p className="text-[8px] font-bold uppercase mt-1 opacity-70">Pendientes</p>
            </button>
            <button onClick={() => setFilter('graded')} className={twMerge("p-3 rounded-2xl border transition-all text-center", filter === 'graded' ? "bg-green-600 text-white border-green-600 shadow-lg" : "bg-surface-container-low border-outline-variant/10 text-on-surface-variant")}>
              <p className="text-xl font-black font-headline leading-none">{stats.graded}</p>
              <p className="text-[8px] font-bold uppercase mt-1 opacity-70">Listas</p>
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4 group-focus-within:text-primary transition-colors" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-sm font-body outline-none transition-all" 
              placeholder="Buscar estudiante o tarea..." 
              type="text" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-thin">
          {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub, idx) => (
            <div 
              key={sub.id}
              onClick={() => handleSelectSubmission(submissions.indexOf(sub))}
              className={twMerge(
                "p-4 rounded-3xl cursor-pointer transition-all border flex items-center gap-4 group",
                selectedSub?.id === sub.id 
                ? 'bg-primary/5 border-primary shadow-sm' 
                : 'border-transparent hover:bg-surface-container-low'
              )}
            >
              <div className={twMerge(
                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-colors",
                selectedSub?.id === sub.id ? "bg-primary text-white" : "bg-surface-container-high text-primary"
              )}>
                {getInitials(sub.user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm text-on-surface truncate pr-2">{sub.user.full_name}</h4>
                  {sub.grade !== null && (
                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{sub.grade}/100</span>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant font-medium truncate uppercase tracking-wider opacity-60">{sub.tarea.title}</p>
                <div className="flex items-center gap-3 mt-1">
                   <span className={twMerge(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                    sub.grade === null ? 'bg-secondary/10 text-secondary' : 'bg-green-100 text-green-700'
                  )}>
                    {sub.grade === null ? 'Pendiente' : 'Revisada'}
                  </span>
                  <span className="text-[8px] text-outline font-bold flex items-center gap-1 uppercase">
                    <Clock className="w-2.5 h-2.5" /> {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ChevronRight className={twMerge("w-4 h-4 text-outline transition-transform", selectedSub?.id === sub.id && "translate-x-1 text-primary")} />
            </div>
          )) : (
            <div className="text-center py-20 opacity-30">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm font-black font-headline uppercase">Sin entregas encontradas</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Detail & Grading */}
      <div className={twMerge(
        "flex-1 flex flex-col bg-surface-container-lowest transition-all duration-300",
        isDetailViewMobile ? "flex" : "hidden md:flex"
      )}>
        {selectedSub ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header Detail */}
            <header className="p-6 md:p-10 border-b border-outline-variant/10 bg-white shadow-sm flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="space-y-2">
                <button 
                  onClick={() => setIsDetailViewMobile(false)}
                  className="md:hidden flex items-center gap-2 text-primary font-bold text-xs mb-4 uppercase tracking-widest"
                >
                  <ArrowLeft className="w-4 h-4" /> Ver Lista
                </button>
                <nav className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-[0.15em]">
                  <span>{selectedSub.tarea.materia_name}</span>
                  <ChevronRight className="w-3 h-3 text-outline" />
                  <span className="text-primary truncate max-w-[200px]">{selectedSub.tarea.title}</span>
                </nav>
                <h2 className="text-4xl font-black font-headline text-primary tracking-tight leading-tight">{selectedSub.user.full_name}</h2>
                <p className="text-sm text-on-surface-variant font-body opacity-70 italic">{selectedSub.user.email}</p>
              </div>

              <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-3xl border border-outline-variant/5">
                <div className="text-right">
                  <p className="text-[8px] text-outline font-black uppercase tracking-widest">Enviado el</p>
                  <p className="text-sm font-headline font-bold text-primary">{new Date(selectedSub.created_at).toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-outline-variant/20 mx-2"></div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                   <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </header>

            {/* Content & Grading Panel */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 scrollbar-thin">
              <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Submission Content */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="relative">
                    <h3 className="text-xs font-black font-headline text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary text-white rounded-lg flex items-center justify-center text-[10px]">1</div>
                      Contenido de la Entrega
                    </h3>
                    <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-outline-variant/5 relative overflow-hidden ring-1 ring-black/[0.02]">
                      <div className="absolute top-0 right-10 w-20 h-2 shadow-[0_0_50px_rgba(var(--secondary),0.3)]"></div>
                      <p className="font-body text-lg leading-relaxed text-on-surface whitespace-pre-wrap selection:bg-secondary/20">
                        {selectedSub.content}
                      </p>
                      
                      {selectedSub.content.startsWith('http') && (
                        <div className="mt-10 pt-8 border-t border-outline-variant/10">
                          <a 
                            href={selectedSub.content} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-premium"
                          >
                            <ExternalLink className="w-4 h-4" /> Abrir Archivo Adjunto
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grading Action */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="sticky top-0 space-y-8">
                    <div className="relative">
                      <h3 className="text-xs font-black font-headline text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <div className="w-6 h-6 bg-secondary text-white rounded-lg flex items-center justify-center text-[10px]">2</div>
                        Evaluación
                      </h3>
                      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-secondary/10 space-y-6 ring-1 ring-secondary/5">
                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">Puntaje Obtenido</label>
                          <div className="relative">
                            <input 
                              value={grade}
                              onChange={(e) => setGrade(e.target.value)}
                              className="w-full text-5xl font-black font-headline text-primary p-6 bg-surface-container-lowest rounded-3xl border-2 border-transparent focus:border-secondary focus:bg-white transition-all outline-none text-center shadow-inner" 
                              max="100" min="0" placeholder="0" type="number" 
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 right-6 text-xl font-black text-outline/30 pointer-events-none">/100</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">Retroalimentación</label>
                          <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full font-body text-sm p-5 bg-surface-container-lowest rounded-3xl border-2 border-transparent focus:border-secondary focus:bg-white transition-all outline-none resize-none shadow-inner min-h-[150px]" 
                            placeholder="Ej: Excelente trabajo, profundiza más en..." 
                          ></textarea>
                        </div>

                        <button 
                          onClick={handleGradeSubmission}
                          disabled={isSaving || !grade}
                          className="w-full py-5 bg-primary hover:bg-primary-container text-white font-black font-headline text-xs uppercase tracking-[0.2em] rounded-3xl shadow-premium transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                          Publicar Nota
                        </button>
                      </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-surface-container-low p-6 rounded-[32px] border border-outline-variant/10">
                      <p className="text-[9px] font-black text-primary uppercase mb-2 tracking-widest flex items-center gap-2">
                        <Filter className="w-3 h-3" /> Guía de Evaluación
                      </p>
                      <ul className="text-[11px] text-on-surface-variant space-y-2 opacity-70">
                        <li>• Revisa la ortografía y gramática.</li>
                        <li>• Valora la originalidad del contenido.</li>
                        <li>• Asegura que cumple con los objetivos del bloque.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <div className="w-32 h-32 bg-primary/5 rounded-[60px] flex items-center justify-center mb-8 animate-pulse">
              <ClipboardCheck className="w-16 h-16 text-primary/20" />
            </div>
            <h2 className="text-2xl font-black font-headline text-primary uppercase tracking-tight mb-2">Selecciona una entrega</h2>
            <p className="text-on-surface-variant text-sm max-w-xs opacity-60 font-body">Elige un estudiante de la lista de la izquierda para comenzar la revisión académica.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradebookPage;
