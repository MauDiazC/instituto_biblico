import React, { useEffect, useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  FileText, 
  ExternalLink, 
  Loader2, 
  ChevronRight, 
  Search,
  MessageSquare,
  Award,
  X,
  Send
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { twMerge } from 'tailwind-merge';
import { formatToLocal } from '../utils/date';

interface Submission {
  id: number;
  content: string;
  grade: number | null;
  feedback: string | null;
  created_at: string;
}

interface Assignment {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  materia_name: string;
  clase_title: string;
  submission: Submission | null;
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const StudentAssignmentsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Submission Modal State
  const [submittingTask, setSubmittingTask] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/student/assignments`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenSubmit = (task: Assignment) => {
    setSubmittingTask(task);
    setSubmissionText('');
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!submittingTask || (!submissionText.trim() && !selectedFile)) return;
    
    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      let finalContent = submissionText;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `submissions/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, selectedFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);
        
        finalContent = publicUrl;
      }

      const response = await fetch(`${VITE_API_URL}/courses/assignments/${submittingTask.id}/submit`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ tarea_id: submittingTask.id, content: finalContent })
      });

      if (response.ok) {
        setSubmittingTask(null);
        await fetchAssignments();
      }
    } catch (error: any) {
      alert('Error al enviar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           a.materia_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isGraded = a.submission && a.submission.grade !== null;
      const isSubmitted = a.submission && a.submission.grade === null;
      const isPending = !a.submission;

      const matchesFilter = filter === 'all' || 
                           (filter === 'pending' && isPending) ||
                           (filter === 'submitted' && isSubmitted) ||
                           (filter === 'graded' && isGraded);
      
      return matchesSearch && matchesFilter;
    });
  }, [assignments, searchQuery, filter]);

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => !a.submission).length,
    graded: assignments.filter(a => a.submission?.grade !== null).length
  };

  if (loading && assignments.length === 0) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  return (
    <div className="pb-24 space-y-8 max-w-6xl mx-auto px-0 overflow-x-hidden">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black font-headline text-primary uppercase tracking-tight">Mis Actividades</h1>
          <p className="text-on-surface-variant font-body text-xs md:text-sm mt-1">Sigue tu progreso académico y entregas.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-primary/5 px-4 md:px-6 py-3 rounded-2xl border border-primary/10 text-center">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Pendientes</p>
            <p className="text-xl font-black font-headline text-primary">{stats.pending}</p>
          </div>
          <div className="flex-1 md:flex-none bg-green-50 px-4 md:px-6 py-3 rounded-2xl border border-green-100 text-center">
            <p className="text-[10px] font-black text-green-700 uppercase tracking-widest leading-none mb-1">Calificadas</p>
            <p className="text-xl font-black font-headline text-green-700">{stats.graded}</p>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex p-1 bg-surface-container-low rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
          {(['all', 'pending', 'submitted', 'graded'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={twMerge(
                "px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filter === f ? "bg-primary text-white shadow-md" : "text-on-surface-variant hover:bg-white"
              )}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'submitted' ? 'Enviadas' : 'Calificadas'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input 
            type="text" 
            placeholder="Buscar por tarea o materia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 bg-white border border-outline-variant/10 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-secondary/20 shadow-sm"
          />
        </div>
      </section>

      {/* Grid of Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredAssignments.length > 0 ? filteredAssignments.map(task => (
          <div key={task.id} className="bg-white rounded-[2rem] border border-outline-variant/10 p-5 md:p-6 shadow-sm hover:shadow-premium transition-all duration-300 flex flex-col h-full group">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest truncate">{task.materia_name}</p>
                <h3 className="text-base md:text-lg font-black font-headline text-primary leading-tight uppercase line-clamp-2">{task.title}</h3>
              </div>
              <div className={twMerge(
                "px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[7px] md:text-[8px] font-black uppercase tracking-widest flex items-center gap-1 md:gap-1.5 shrink-0 ml-2",
                task.submission?.grade !== null ? "bg-green-100 text-green-700" :
                task.submission ? "bg-secondary/10 text-secondary" : "bg-primary/5 text-primary"
              )}>
                {task.submission?.grade !== null ? <CheckCircle2 className="w-2.5 h-2.5 md:w-3 h-3" /> : <Clock className="w-2.5 h-2.5 md:w-3 h-3" />}
                <span className="hidden xs:inline">
                  {task.submission?.grade !== null ? 'Calificada' : task.submission ? 'Enviada' : 'Pendiente'}
                </span>
                <span className="xs:hidden">
                  {task.submission?.grade !== null ? 'OK' : task.submission ? 'ENV' : 'PEN'}
                </span>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold font-label uppercase">Vence: {task.due_date ? formatToLocal(task.due_date) : 'Sin fecha'}</span>
              </div>
              <p className="text-xs text-on-surface-variant font-body line-clamp-3 leading-relaxed opacity-70">
                {task.description || "Sin descripción adicional."}
              </p>
            </div>

            {/* Action Section */}
            <div className="mt-6 pt-6 border-t border-outline-variant/5">
              {task.submission?.grade !== null ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-green-700" />
                      <div>
                        <p className="text-[8px] font-black text-green-700 uppercase tracking-widest leading-none">Tu Nota</p>
                        <p className="text-2xl font-black font-headline text-green-700 leading-none mt-1">{task.submission?.grade}/100</p>
                      </div>
                    </div>
                  </div>
                  {task.submission?.feedback && (
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                      <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3 text-secondary" /> Comentario del Maestro
                      </p>
                      <p className="text-[11px] font-body text-on-surface leading-relaxed italic">
                        "{task.submission.feedback}"
                      </p>
                    </div>
                  )}
                </div>
              ) : task.submission ? (
                <div className="flex flex-col gap-3">
                   <div className="flex items-center gap-3 p-3 bg-secondary/5 rounded-xl border border-secondary/10">
                      <FileText className="w-5 h-5 text-secondary" />
                      <div className="min-w-0 flex-1">
                         <p className="text-[8px] font-black text-secondary uppercase tracking-widest">Enviado</p>
                         <p className="text-[10px] font-bold text-primary truncate">{task.submission.content.startsWith('http') ? 'Documento adjunto' : task.submission.content}</p>
                      </div>
                   </div>
                   <p className="text-[9px] text-on-surface-variant font-medium text-center italic">Esperando revisión del docente...</p>
                </div>
              ) : (
                <button 
                  onClick={() => handleOpenSubmit(task)}
                  className="w-full bg-primary text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-container transition-all shadow-md flex items-center justify-center gap-2 group-hover:translate-y-[-2px]"
                >
                  <Upload className="w-4 h-4" /> ENTREGAR TAREA
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center opacity-30">
            <ClipboardList className="w-16 h-16 mx-auto mb-4" />
            <p className="font-headline font-bold uppercase tracking-widest text-sm">No se encontraron actividades.</p>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {submittingTask && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setSubmittingTask(null)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest leading-none truncate">{submittingTask.materia_name}</p>
                <h3 className="text-lg md:text-xl font-black text-primary font-headline uppercase leading-tight truncate">{submittingTask.title}</h3>
              </div>
              <button onClick={() => setSubmittingTask(null)} className="p-2 hover:bg-white rounded-full transition-colors shrink-0">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Escribe tu respuesta o sube un archivo</label>
                  <textarea 
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    className="w-full min-h-[120px] md:min-h-[150px] p-4 bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white rounded-2xl outline-none transition-all text-sm font-body"
                    placeholder="Escribe aquí tu trabajo..."
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Upload className="w-3 h-3" /> Adjuntar archivo (Opcional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className={twMerge(
                      "flex-1 cursor-pointer p-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-3",
                      selectedFile ? "border-secondary bg-secondary/5" : "border-outline-variant/30 hover:border-secondary hover:bg-secondary/5"
                    )}>
                      <FileText className={twMerge("w-6 h-6", selectedFile ? "text-secondary" : "text-outline-variant")} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-primary uppercase truncate">{selectedFile ? selectedFile.name : 'Seleccionar Archivo'}</p>
                        <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-widest">PDF, DOCX, JPG • MAX 5MB</p>
                      </div>
                      <input type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    </label>
                    {selectedFile && (
                      <button onClick={() => setSelectedFile(null)} className="p-3 text-error bg-error/5 rounded-xl hover:bg-error/10">
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
               </div>

               <button 
                onClick={handleSubmit}
                disabled={isSubmitting || (!submissionText.trim() && !selectedFile)}
                className="w-full py-5 bg-primary text-white font-black font-headline text-xs uppercase tracking-[0.2em] rounded-2xl shadow-premium hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
               >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isSubmitting ? 'ENVIANDO...' : 'ENVIAR TAREA'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsPage;
