import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, CheckCircle, FileText, HelpCircle, MessageSquare, Lock, PlayCircle, Volume2, Loader2, Video, Send, Clock, X, Download, Upload, CheckCircle2, Square } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';
import { formatToLocal } from '../utils/date';
import { useAuth } from '../context/AuthContext';

interface Tarea {
  id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  due_date: string | null;
}

interface Entrega {
  id: number;
  content: string;
  grade: number | null;
  feedback: string | null;
}

interface Consulta {
  id: number;
  question: string;
  answer: string | null;
  status: string;
  created_at: string;
  student?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Clase {
  id: number;
  title: string;
  status: string;
  video_url: string | null;
  room_url: string | null;
  is_completed?: boolean;
  bloque?: {
    name: string;
  };
  tareas?: Tarea[];
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const VirtualClassroomPage: React.FC = () => {
  const { id, lessonId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [clase, setClase] = useState<Clase | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingLink, setRecordingLink] = useState<string | null>(null);
  const [submission, setSubmission] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSubmission, setUserSubmission] = useState<Entrega | null>(null);
  
  // Progress State
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Ticket System State
  const [questions, setQuestions] = useState<Consulta[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/questions`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchClassData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: classData, error } = await supabase
        .from('clases')
        .select('*, bloque:bloques(name), tareas(*)')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      
      // Check if completed via separate endpoint or query
      const { data: completion } = await supabase
        .from('clases_completadas')
        .select('*')
        .eq('clase_id', lessonId)
        .eq('user_id', session?.user.id)
        .maybeSingle();

      setClase({ ...classData, is_completed: !!completion });

      // Priority 1: Use direct video_url if available in database
      if (classData.video_url) {
        setRecordingLink(classData.video_url);
      }

      // Priority 2: Fetch temporary access link if recorded but no direct URL yet
      if (classData.status === 'RECORDED' && !classData.video_url) {
        try {
          const res = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/recording-link`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
          if (res.ok) {
            const linkData = await res.json();
            setRecordingLink(linkData.download_link);
          }
        } catch (err) {
          console.error('Error fetching dynamic recording link:', err);
        }
      }

      // Fetch user submission
      if (classData.tareas && classData.tareas.length > 0) {
        const { data: submissionData } = await supabase
          .from('entregas')
          .select('*')
          .eq('tarea_id', classData.tareas[0].id)
          .eq('user_id', session?.user.id)
          .maybeSingle();
        
        if (submissionData) {
          setUserSubmission(submissionData);
          setSubmission(submissionData.content);
        }
      }

      await fetchQuestions();

    } catch (error) {
      console.error('Error fetching class:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) {
      fetchClassData();

      const questionsChannel = supabase
        .channel('realtime_questions_vc')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'consultas', 
          filter: `clase_id=eq.${lessonId}` 
        }, () => {
          fetchQuestions();
        })
        .subscribe();

      const classChannel = supabase
        .channel('realtime_class_status')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'clases', 
          filter: `id=eq.${lessonId}` 
        }, () => {
          console.log('Class status update detected via realtime');
          fetchClassData(true);
        })
        .subscribe();

      // Fallback Polling: Check every 15 seconds in case realtime is not enabled on table
      const pollingInterval = setInterval(() => {
        console.log('Performing background check for class updates...');
        fetchClassData(true);
      }, 15000);

      return () => { 
        supabase.removeChannel(questionsChannel);
        supabase.removeChannel(classChannel);
        clearInterval(pollingInterval);
      };
    }
  }, [lessonId]);

  const handleToggleCompletion = async () => {
    try {
      setIsCompleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (response.ok) {
        setClase(prev => prev ? { ...prev, is_completed: !prev.is_completed } : null);
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleEndClass = async () => {
    if (!window.confirm('¿Estás seguro de que deseas finalizar la transmisión? Esto marcará la clase como grabada para los estudiantes.')) return;
    
    try {
      setIsEnding(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (response.ok) {
        alert('Transmisión finalizada con éxito.');
        navigate('/dashboard/teacher');
      } else {
        throw new Error('Error al finalizar la clase');
      }
    } catch (error) {
      console.error('Error ending class:', error);
      alert('Error al finalizar la clase.');
    } finally {
      setIsEnding(false);
    }
  };

  const handleSubmitTarea = async (tareaId: number) => {
    if (!submission.trim() && !selectedFile) return;
    
    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      let finalContent = submission;

      // 1. Upload file if exists
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `submissions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, selectedFile);

        if (uploadError) {
          // Attempt to create bucket if it doesn't exist
          await supabase.storage.createBucket('assignments', { public: true });
          const { error: retryError } = await supabase.storage.from('assignments').upload(filePath, selectedFile);
          if (retryError) throw retryError;
        }

        const { data: { publicUrl } } = supabase.storage.from('assignments').getPublicUrl(filePath);
        finalContent = publicUrl;
      }

      const response = await fetch(`${VITE_API_URL}/courses/assignments/${tareaId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tarea_id: tareaId, content: finalContent })
      });

      if (!response.ok) throw new Error('Error al enviar la tarea');
      
      const result = await response.json();
      setUserSubmission(result);
      alert('¡Tarea enviada con éxito!');
    } catch (error) {
      console.error('Error submitting tarea:', error);
      alert('Hubo un error al enviar la tarea.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskTutor = async () => {
    if (!newQuestion.trim()) return;
    try {
      setIsAsking(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: newQuestion, clase_id: parseInt(lessonId || '0') })
      });
      if (response.ok) {
        setNewQuestion('');
        setShowQuestionForm(false);
        await fetchQuestions();
        alert('Tu consulta ha sido enviada al tutor.');
      }
    } catch (error) {
      console.error('Error asking tutor:', error);
    } finally {
      setIsAsking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!clase) return <div className="text-center py-20">Clase no encontrada</div>;

  const isTeacher = role === 'teacher' || role === 'admin';

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
      <div className="lg:col-span-8 space-y-6">
        {/* Video Player */}
        <div className="w-full aspect-video min-h-[400px] md:min-h-0 rounded-xl overflow-hidden bg-primary shadow-2xl relative group ring-1 ring-white/10">
          {clase.status === 'LIVE' && clase.room_url ? (
            <iframe 
              src={`${clase.room_url}${clase.room_url.includes('?') ? '&' : '?'}sidebar=0&tbar=1`} 
              allow="camera; microphone; fullscreen; display-capture" 
              className="w-full h-full border-0" 
            />
          ) : clase.status === 'RECORDED' && recordingLink ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <video src={recordingLink} controls className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/40">
              <Video className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-xl font-bold font-headline">La clase aún no ha comenzado</h3>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider rounded-full font-label">
                {clase.bloque?.name.replace(/Módulo\s+\d+:\s+/i, '') || 'General'}
              </span>
              <h1 className="text-3xl font-black font-headline text-primary mt-2">{clase.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {isTeacher && clase.status === 'LIVE' && (
                <button 
                  onClick={handleEndClass}
                  disabled={isEnding}
                  className="px-6 py-3 bg-error text-white rounded-lg font-headline font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 hover:bg-error-container hover:text-on-error-container"
                >
                  <Square className="w-5 h-5 fill-current" />
                  {isEnding ? 'Finalizando...' : 'Finalizar Clase'}
                </button>
              )}
              <button 
                onClick={handleToggleCompletion}
                disabled={isCompleting}
                className={`px-6 py-3 rounded-lg font-headline font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 ${
                  clase.is_completed 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-secondary-fixed-dim hover:bg-secondary-fixed text-on-secondary-fixed'
                }`}
              >
                {clase.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                {clase.is_completed ? 'Completada' : 'Marcar como completada'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-secondary">
            <p className="text-on-surface leading-relaxed text-lg font-body">
              {clase.status === 'LIVE' ? "Clase en vivo. Participa y consulta tus dudas." : "Lección grabada disponible para estudio."}
            </p>
          </div>

          {/* Tareas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clase.tareas && clase.tareas.length > 0 ? clase.tareas.map(tarea => (
              <div key={tarea.id} className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/10 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-primary font-headline">{tarea.title}</h4>
                    <p className="text-[10px] text-on-surface-variant font-label uppercase">Vence: {tarea.due_date ? formatToLocal(tarea.due_date) : 'Sin fecha'}</p>
                  </div>
                  {tarea.file_url && (
                    <a href={tarea.file_url} target="_blank" rel="noreferrer" download className="p-2 bg-primary/5 text-primary rounded-full hover:bg-primary/10"><Download className="w-5 h-5" /></a>
                  )}
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-on-surface-variant font-body">{tarea.description}</p>
                  
                  {userSubmission ? (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-xs font-black text-green-700 uppercase flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4" /> Tarea Entregada</p>
                      {userSubmission.content.startsWith('http') ? (
                        <a href={userSubmission.content} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline font-bold">Ver mi archivo enviado</a>
                      ) : (
                        <p className="text-[10px] text-on-surface-variant line-clamp-1">{userSubmission.content}</p>
                      )}
                      {userSubmission.grade !== null && <p className="mt-3 text-lg font-black text-primary">Nota: {userSubmission.grade}/100</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer bg-white border border-outline-variant/30 p-3 rounded-xl flex items-center gap-2 hover:bg-surface transition-colors">
                          <Upload className="w-4 h-4 text-secondary" />
                          <span className="text-[10px] font-bold text-primary truncate">{selectedFile ? selectedFile.name : 'Subir archivo...'}</span>
                          <input type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                      <textarea value={submission} onChange={(e) => setSubmission(e.target.value)} placeholder="O escribe tu respuesta aquí..." className="w-full p-3 text-xs bg-white border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-secondary outline-none min-h-[80px]" />
                      <button onClick={() => handleSubmitTarea(tarea.id)} disabled={isSubmitting || (!submission.trim() && !selectedFile)} className="w-full bg-secondary text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-on-secondary-container transition-all disabled:opacity-50">
                        {isSubmitting ? 'Enviando...' : 'Entregar Tarea'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="md:col-span-2 p-8 bg-surface-container-low/30 border-2 border-dashed border-outline-variant/20 rounded-xl text-center">
                <p className="text-on-surface-variant font-medium italic">No hay tareas para esta lección.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="bg-surface-container-low rounded-xl p-6 sticky top-28 shadow-sm">
          <h3 className="font-black text-primary font-headline uppercase tracking-tight text-xs mb-6">Contenido del Curso</h3>
          <div className="space-y-3">
            <div className="p-3 bg-primary text-white rounded-lg shadow-md flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold font-headline">{clase.title}</p>
                <p className="text-[10px] opacity-70 font-label uppercase">{clase.status}</p>
              </div>
              {clase.status === 'LIVE' ? <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" /> : <PlayCircle className="w-5 h-5 text-secondary-fixed fill-current" />}
            </div>
          </div>

          <div className="mt-8 border-t border-outline-variant/10 pt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-primary font-headline uppercase tracking-tight text-xs flex items-center gap-2"><HelpCircle className="w-4 h-4 text-secondary" /> Consultas</h3>
              <button onClick={fetchQuestions} className="p-1 hover:bg-primary/5 rounded-full transition-colors"><Loader2 className={`w-3 h-3 text-outline ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {questions.length > 0 ? [...questions].reverse().map(q => (
                <div key={q.id} className="p-4 bg-white rounded-2xl shadow-sm border border-outline-variant/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[7px] text-white font-bold">{getInitials(q.student?.full_name)}</div>
                      <span className="text-[9px] font-bold text-primary">{q.student?.full_name}</span>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${q.status === 'PENDING' ? 'bg-secondary-container text-on-secondary-container' : 'bg-green-100 text-green-700'}`}>{q.status === 'PENDING' ? 'Pendiente' : 'Respondido'}</span>
                  </div>
                  <p className="text-[12px] font-medium text-on-surface leading-snug">{q.question}</p>
                  {q.answer && (
                    <div className="bg-primary/5 p-3 rounded-lg border-l-2 border-secondary mt-1">
                      <p className="text-[9px] font-black text-secondary uppercase mb-1">Tutor:</p>
                      <p className="text-[11px] font-body text-primary leading-relaxed">{q.answer}</p>
                    </div>
                  )}
                </div>
              )) : !showQuestionForm && <p className="text-[10px] text-on-surface-variant italic text-center py-4">Sin consultas.</p>}
            </div>

            {showQuestionForm ? (
              <div className="bg-primary p-5 rounded-2xl space-y-3 shadow-premium animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center text-white"><p className="text-[9px] font-black uppercase tracking-widest">Nueva Consulta</p><button onClick={() => setShowQuestionForm(false)}><X className="w-4 h-4" /></button></div>
                <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Escribe tu duda..." className="w-full p-3 text-xs bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-xl focus:ring-1 focus:ring-secondary outline-none min-h-[100px] resize-none" />
                <button onClick={handleAskTutor} disabled={isAsking || !newQuestion.trim()} className="w-full bg-secondary text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-on-secondary-container transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"><Send className="w-3 h-3" /> {isAsking ? '...' : 'Enviar'}</button>
              </div>
            ) : (
              <button onClick={() => setShowQuestionForm(true)} className="w-full py-3.5 bg-primary text-white font-headline font-bold rounded-xl hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-premium active:scale-95"><MessageSquare className="w-4 h-4" /> Preguntar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualClassroomPage;
