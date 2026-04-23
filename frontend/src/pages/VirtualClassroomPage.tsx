import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, CheckCircle, FileText, HelpCircle, MessageSquare, Lock, PlayCircle, Volume2, Loader2, Video, Send, Clock, X, Download, Upload, CheckCircle2, Square, MessageCircle, AlertCircle } from 'lucide-react';
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
  
  // Answering State (for teachers)
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isTeacher = role === 'teacher' || role === 'admin';

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

  const fetchClassData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: classData, error } = await supabase
        .from('clases')
        .select('*, bloque:bloques(name), tareas(*)')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      
      // Check if completed
      const { data: completion } = await supabase
        .from('clases_completadas')
        .select('*')
        .eq('clase_id', lessonId)
        .eq('user_id', session?.user.id)
        .maybeSingle();

      setClase({ ...classData, is_completed: !!completion });

      // Handle video/recording logic with high reliability
      if (classData.video_url) {
        setRecordingLink(classData.video_url);
      } else if (classData.status === 'RECORDED') {
        // Fetch temporary recording link from backend
        try {
          const res = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/recording-link`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
          if (res.ok) {
            const linkData = await res.json();
            setRecordingLink(linkData.download_link);
          }
        } catch (linkErr) {
          console.error('Error fetching recording link:', linkErr);
        }
      }

      // Fetch user submission if not yet loaded
      if (!userSubmission && classData.tareas && classData.tareas.length > 0) {
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
  }, [lessonId, userSubmission]);

  useEffect(() => {
    if (lessonId) {
      fetchClassData();

      // Realtime subscription
      const mainChannel = supabase
        .channel(`vc-sync-final-${lessonId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clases' }, (payload: any) => {
          if (payload.new && Number(payload.new.id) === Number(lessonId)) {
            fetchClassData(true);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' }, (payload: any) => {
          if (payload.new && Number(payload.new.clase_id) === Number(lessonId)) {
            fetchQuestions();
          }
        })
        .subscribe();

      // Reliable Polling (Every 5 seconds)
      const interval = setInterval(() => fetchClassData(true), 5000);

      return () => { 
        supabase.removeChannel(mainChannel);
        clearInterval(interval);
      };
    }
  }, [lessonId, fetchClassData]);

  const handleToggleCompletion = async () => {
    try {
      setIsCompleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) setClase(prev => prev ? { ...prev, is_completed: !prev.is_completed } : null);
    } catch (error) {
      console.error('Error toggling completion:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleEndClass = async () => {
    if (!window.confirm('¿Deseas finalizar la transmisión?')) return;
    try {
      setIsEnding(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        setClase(prev => prev ? { ...prev, status: 'RECORDED', room_url: null } : null);
        navigate('/dashboard/teacher');
      }
    } catch (error) {
      console.error('Error ending class:', error);
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

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `submissions/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('assignments').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('assignments').getPublicUrl(filePath);
        finalContent = publicUrl;
      }

      const response = await fetch(`${VITE_API_URL}/courses/assignments/${tareaId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarea_id: tareaId, content: finalContent })
      });

      if (response.ok) {
        const result = await response.json();
        setUserSubmission(result);
      }
    } catch (error) {
      console.error('Error submitting:', error);
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
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQuestion, clase_id: parseInt(lessonId || '0') })
      });
      if (response.ok) {
        setNewQuestion('');
        setShowQuestionForm(false);
        await fetchQuestions();
      }
    } catch (error) {
      console.error('Error asking:', error);
    } finally {
      setIsAsking(false);
    }
  };

  const handleAnswerQuestion = async (questionId: number) => {
    if (!answerText.trim()) return;
    try {
      setIsAnswering(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/questions/${questionId}/answer`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer: answerText })
      });
      if (response.ok) {
        setAnswerText('');
        setAnsweringId(null);
        await fetchQuestions();
      }
    } catch (error) {
      console.error('Error answering:', error);
    } finally {
      setIsAnswering(false);
    }
  };

  if (loading || !clase) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const finalVideoUrl = recordingLink || clase.video_url;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
      <div className="lg:col-span-8 space-y-6">
        {/* Video Area - Optimized for Recordings */}
        <div key={`${clase.status}-${finalVideoUrl ? 'video-ready' : 'no-video'}`} className="w-full aspect-video min-h-[400px] md:min-h-0 rounded-xl overflow-hidden bg-primary shadow-2xl relative group ring-1 ring-white/10">
          {clase.status === 'LIVE' && clase.room_url ? (
            <iframe src={`${clase.room_url}${clase.room_url.includes('?') ? '&' : '?'}sidebar=0&tbar=1`} allow="camera; microphone; fullscreen; display-capture" className="w-full h-full border-0" />
          ) : (clase.status === 'RECORDED' || clase.status === 'COMPLETED') && finalVideoUrl ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <video src={finalVideoUrl} controls className="w-full h-full object-contain" controlsList="nodownload" />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 text-center p-8">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 animate-pulse"><Video className="w-10 h-10 text-white/50" /></div>
              <h3 className="text-2xl font-black font-headline mb-2">{clase.status === 'PLANNED' ? 'Sesión Programada' : 'Grabación en Proceso'}</h3>
              <p className="text-white/60 max-w-xs mx-auto font-body">{clase.status === 'PLANNED' ? 'La clase iniciará automáticamente cuando el tutor se conecte.' : 'El video estará disponible en unos minutos.'}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div>
              <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full font-label ${clase.status === 'LIVE' ? 'bg-error text-white animate-pulse' : 'bg-secondary-container text-on-secondary-container'}`}>
                {clase.status === 'LIVE' ? '• En Vivo' : (clase.bloque?.name.replace(/Módulo\s+\d+:\s+/i, '') || 'General')}
              </span>
              <h1 className="text-3xl font-black font-headline text-primary mt-2">{clase.title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {isTeacher && (clase.status === 'LIVE' || clase.status === 'PLANNED') && (
                <button onClick={handleEndClass} disabled={isEnding} className="px-6 py-3 bg-error text-white rounded-lg font-headline font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"><Square className="w-5 h-5 fill-current" /> Finalizar</button>
              )}
              <button onClick={handleToggleCompletion} disabled={isCompleting} className={`px-6 py-3 rounded-lg font-headline font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 ${clase.is_completed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-secondary-fixed-dim hover:bg-secondary-fixed text-on-secondary-fixed'}`}>{clase.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />} {clase.is_completed ? 'Hecha' : 'Completar'}</button>
            </div>
          </div>
          <div className="p-6 bg-surface-container-lowest rounded-xl shadow-sm border-l-4 border-secondary font-body text-on-surface leading-relaxed text-lg">
            {clase.status === 'LIVE' ? "Participa en la clase en vivo y haz tus preguntas." : clase.status === 'PLANNED' ? "La clase aún no ha comenzado. Prepárate." : "Lección finalizada. Puedes volver a ver el video."}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clase.tareas && clase.tareas.length > 0 ? clase.tareas.map(tarea => (
              <div key={tarea.id} className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/10 space-y-4">
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center"><FileText className="w-6 h-6" /></div><div className="flex-1"><h4 className="font-bold text-sm text-primary font-headline">{tarea.title}</h4><p className="text-[10px] text-on-surface-variant font-label uppercase">Vence: {tarea.due_date ? formatToLocal(tarea.due_date) : 'Sin fecha'}</p></div></div>
                <div className="space-y-3"><p className="text-sm text-on-surface-variant font-body">{tarea.description}</p>{userSubmission ? (<div className="bg-green-50 p-4 rounded-xl border border-green-100"><p className="text-xs font-black text-green-700 uppercase flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4" /> Entregada</p></div>) : (<div className="space-y-3"><textarea value={submission} onChange={(e) => setSubmission(e.target.value)} placeholder="Tu respuesta..." className="w-full p-3 text-xs bg-white border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-secondary outline-none min-h-[80px]" /><button onClick={() => handleSubmitTarea(tarea.id)} disabled={isSubmitting} className="w-full bg-secondary text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-on-secondary-container transition-all">{isSubmitting ? '...' : 'Entregar Tarea'}</button></div>)}</div>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="bg-surface-container-low rounded-xl p-6 sticky top-28 shadow-sm">
          <h3 className="font-black text-primary font-headline uppercase tracking-tight text-xs mb-6">Estado de la Clase</h3>
          <div className="space-y-3">
            <div className={`p-4 rounded-xl shadow-md flex items-center gap-4 transition-all duration-500 ${clase.status === 'LIVE' ? 'bg-error text-white ring-4 ring-error/20' : 'bg-primary text-white opacity-80'}`}><div className="flex-1"><p className="text-sm font-bold font-headline">{clase.title}</p><p className="text-[10px] opacity-70 font-label uppercase font-black">{clase.status === 'LIVE' ? 'EN VIVO AHORA' : clase.status}</p></div>{clase.status === 'LIVE' ? (<div className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span></div>) : <PlayCircle className="w-5 h-5 text-white/50" />}</div>
          </div>

          <div className="mt-8 border-t border-outline-variant/10 pt-8 space-y-6">
            <div className="flex items-center justify-between"><h3 className="font-black text-primary font-headline uppercase tracking-tight text-xs flex items-center gap-2"><HelpCircle className="w-4 h-4 text-secondary" /> Preguntas</h3><button onClick={fetchQuestions} className="p-1 hover:bg-primary/5 rounded-full transition-colors"><Loader2 className={`w-3 h-3 text-outline ${loading ? 'animate-spin' : ''}`} /></button></div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {questions.length > 0 ? [...questions].reverse().map(q => (
                <div key={q.id} className="p-4 bg-white rounded-2xl shadow-sm border border-outline-variant/5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[7px] text-white font-bold">{getInitials(q.student?.full_name)}</div>
                      <span className="text-[9px] font-bold text-primary">{q.student?.full_name}</span>
                    </div>
                    {q.status === 'PENDING' && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">Pendiente</span>}
                  </div>
                  <p className="text-[12px] font-medium text-on-surface leading-snug">{q.question}</p>
                  
                  {q.answer ? (
                    <div className="bg-primary/5 p-3 rounded-lg border-l-2 border-secondary mt-1">
                      <p className="text-[9px] font-black text-secondary uppercase mb-1">Tutor:</p>
                      <p className="text-[11px] font-body text-primary leading-relaxed">{q.answer}</p>
                    </div>
                  ) : isTeacher && answeringId !== q.id && (
                    <button onClick={() => setAnsweringId(q.id)} className="w-full py-2 bg-secondary/10 text-secondary text-[10px] font-black uppercase rounded-lg hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-2">
                      <MessageCircle className="w-3 h-3" /> Responder
                    </button>
                  )}

                  {isTeacher && answeringId === q.id && (
                    <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                      <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Escribe tu respuesta..." className="w-full p-2 text-xs bg-surface-container-low border border-outline-variant/20 rounded-lg focus:ring-1 focus:ring-secondary outline-none min-h-[60px] resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => handleAnswerQuestion(q.id)} disabled={isAnswering} className="flex-1 py-1.5 bg-secondary text-white text-[9px] font-black uppercase rounded-lg shadow-sm">{isAnswering ? '...' : 'Enviar'}</button>
                        <button onClick={() => setAnsweringId(null)} className="px-3 py-1.5 bg-surface-container-highest text-on-surface text-[9px] font-black uppercase rounded-lg">X</button>
                      </div>
                    </div>
                  )}
                </div>
              )) : <p className="text-[10px] text-on-surface-variant italic text-center py-4">No hay dudas aún.</p>}
            </div>
            {!isTeacher && (showQuestionForm ? (
              <div className="bg-primary p-5 rounded-2xl space-y-3 shadow-premium animate-in zoom-in-95 duration-200">
                <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Escribe tu duda..." className="w-full p-3 text-xs bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-xl focus:ring-1 focus:ring-secondary outline-none min-h-[100px] resize-none" />
                <button onClick={handleAskTutor} disabled={isAsking || !newQuestion.trim()} className="w-full bg-secondary text-white py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50">{isAsking ? '...' : 'Enviar'}</button>
                <button onClick={() => setShowQuestionForm(false)} className="w-full text-white/50 text-[10px] font-bold uppercase">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setShowQuestionForm(true)} className="w-full py-3.5 bg-primary text-white font-headline font-bold rounded-xl hover:bg-primary-container transition-all flex items-center justify-center gap-2 active:scale-95"><MessageSquare className="w-4 h-4" /> Preguntar al Tutor</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualClassroomPage;
