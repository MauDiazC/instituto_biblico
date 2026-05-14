import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, CheckCircle, FileText, HelpCircle, MessageSquare, Lock, PlayCircle, Volume2, Loader2, Video, Send, Clock, X, Download, Upload, CheckCircle2, Square, MessageCircle, AlertCircle, ArrowLeft, Info, ListChecks, HelpCircle as HelpIcon } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';
import { formatToLocal } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { VideoSDKMeeting } from "@videosdk.live/rtc-js-prebuilt";

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
    materia_id: number;
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
  const { role, loading: authLoading } = useAuth();
  const [clase, setClase] = useState<Clase | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingLink, setRecordingLink] = useState<string | null>(null);
  const [submission, setSubmission] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSubmission, setUserSubmission] = useState<Entrega | null>(null);
  
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [recordingToast, setRecordingToast] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Consulta[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'questions'>('info');
  const videoSdkInitialized = useRef(false);

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
        .select('*, bloque:bloques(name, materia_id), tareas(*)')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      
      const { data: completion } = await supabase
        .from('clases_completadas')
        .select('*')
        .eq('clase_id', lessonId)
        .eq('user_id', session?.user.id)
        .maybeSingle();

      setClase(prev => {
        if (prev && JSON.stringify(prev) === JSON.stringify({ ...classData, is_completed: !!completion })) return prev;
        return { ...classData, is_completed: !!completion };
      });

      if (classData.video_url) {
        setRecordingLink(classData.video_url);
      } else if (classData.status === 'RECORDED' && !recordingLink) {
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
  }, [lessonId, userSubmission, recordingLink]);

  useEffect(() => {
    if (lessonId) {
      fetchClassData();

      const mainChannel = supabase
        .channel(`vc-sync-v6-${lessonId}`)
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

      const interval = setInterval(() => fetchClassData(true), 10000);

      return () => { 
        supabase.removeChannel(mainChannel);
        clearInterval(interval);
      };
    }
  }, [lessonId, fetchClassData]);

  useEffect(() => {
    // Wait for class and auth to be ready
    if (!authLoading && clase?.status === 'LIVE' && clase.room_url && !videoSdkInitialized.current) {
      const apiKey = import.meta.env.VITE_VIDEOSDK_API_KEY;
      
      if (!apiKey) {
        console.error("VIDEOSDK: VITE_VIDEOSDK_API_KEY is not defined in environment");
        return;
      }

      console.log("VIDEOSDK: Initializing meeting...", { meetingId: clase.room_url, isTeacher, role });

      const initMeeting = () => {
        const container = document.getElementById("videosdk-container");
        if (!container) {
          console.log("VIDEOSDK: Container not found, retrying in 100ms...");
          setTimeout(initMeeting, 100);
          return;
        }

        try {
          const meeting = new VideoSDKMeeting();
          const config: any = {
            name: isTeacher ? "Docente" : "Estudiante",
            meetingId: clase.room_url,
            apiKey: apiKey,
            containerId: "videosdk-container",
            micEnabled: true,
            webcamEnabled: true,
            participantCanToggleSelfWebcam: true,
            participantCanToggleSelfMic: true,
            chatEnabled: true,
            screenShareEnabled: true,
            whiteboardEnabled: true,
            raiseHandEnabled: true,
            recording: {
              enabled: isTeacher,
              webhookUrl: `${VITE_API_URL}/courses/video-webhook`,
              autoStart: false, // Prevents "desfada empieza antes" bug
              theme: "DARK",
              config: {
                layout: {
                  type: "GRID",
                  priority: "SPEAKER", // Priority on speaker for better audio capture
                  gridSize: 4,
                },
                orientation: "landscape",
              },
            },
            layout: {
              type: "SPOTLIGHT", // Regresar a Speaker View como estaba originalmente
              priority: "SPEAKER",
              gridSize: 4,
            },
            changeLayout: true, // Permitir que los alumnos cambien de vista si lo desean
            participantCanLeave: true,
            joinScreen: {
              visible: true, // Ayuda a inicializar correctamente los streams antes de entrar
              title: clase.title,
              meetingUrl: window.location.href,
            },
            brandingEnabled: true,
            brandName: "Sacred Archive",
            poweredBy: false,
            primaryColor: "#0066cc",
            realtimeTranscription: {
              enabled: false,
              visible: false,
            },
            permissions: {
              askToJoin: false, 
              toggleParticipantWebcam: isTeacher,
              toggleParticipantMic: isTeacher,
              dropParticipant: isTeacher,
              drawOnWhiteboard: true,
              toggleWhiteboard: isTeacher,
              toggleRecording: isTeacher,
              pin: true, // Permitir que vean a otros
            },
            leftScreen: {
              actionButton: {
                label: "Regresar",
                href: `/dashboard/courses/${clase.bloque?.materia_id}`,
              },
            },
          };

          meeting.init(config);
          videoSdkInitialized.current = true;
          console.log("VIDEOSDK: Meeting initialized successfully");

          if (isTeacher) {
            (meeting as any).on("recording-state-changed", (data: any) => {
              console.log("VIDEOSDK Recording State:", data.status);
              if (data.status === "RECORDING_STARTING") {
                setRecordingToast("Preparando grabación... Espera unos segundos antes de hablar.");
              } else if (data.status === "RECORDING_STARTED") {
                setRecordingToast("¡Grabación Iniciada! Ya puedes comenzar la clase.");
                setTimeout(() => setRecordingToast(null), 8000);
              } else if (data.status === "RECORDING_STOPPED") {
                setRecordingToast("Grabación detenida.");
                setTimeout(() => setRecordingToast(null), 5000);
              }
            });
          }
        } catch (err) {
          console.error("VIDEOSDK: Error during initialization:", err);
        }
      };

      initMeeting();
    }
  }, [clase, isTeacher, authLoading, role]);


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

  const handleStartClass = async () => {
    try {
      setIsStarting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/classes/${lessonId}/room`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClase(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Error al iniciar la clase: ${errData.detail || response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error starting class:', error);
      alert(`Error de red: ${error.message}`);
    } finally {
      setIsStarting(false);
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
        navigate(`/dashboard/courses/${clase?.bloque?.materia_id}`);
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
    <div className="min-h-screen bg-background -mt-12 -mx-6 md:-mx-12">
      {/* RECORDING TOAST - FIXED AND TOP LEVEL */}
      {recordingToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-primary/95 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-headline text-sm uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[9999] flex items-center gap-4 animate-in fade-in slide-in-from-top-8 duration-500">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            {recordingToast.includes('Preparando') ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Video className="w-4 h-4 text-white" />}
          </div>
          <p className="font-black">{recordingToast}</p>
        </div>
      )}

      {/* CLASSROOM HEADER / NAVBAR */}
      <header className="bg-primary text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <Link to={`/dashboard/courses/${clase.bloque?.materia_id}`} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-lg font-black font-headline leading-none uppercase tracking-tight">{clase.title}</h1>
            <p className="text-[10px] opacity-60 font-label uppercase tracking-widest mt-1">{clase.bloque?.name || 'Clase Virtual'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTeacher && (clase.status === 'SCHEDULED' || clase.status === 'PLANNED') && (
            <button onClick={handleStartClass} disabled={isStarting} className="px-4 py-2 bg-secondary text-white rounded-lg font-headline font-bold text-xs transition-all shadow-sm flex items-center gap-2 active:scale-95">
              {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} Iniciar Clase
            </button>
          )}
          {isTeacher && (clase.status === 'LIVE') && (
            <button onClick={handleEndClass} disabled={isEnding} className="px-4 py-2 bg-error text-white rounded-lg font-headline font-bold text-xs transition-all shadow-sm flex items-center gap-2 active:scale-95">
              <Square className="w-4 h-4 fill-current" /> Finalizar
            </button>
          )}
          <button onClick={handleToggleCompletion} disabled={isCompleting} className={`px-4 py-2 rounded-lg font-headline font-bold text-xs transition-all shadow-sm flex items-center gap-2 active:scale-95 ${clase.is_completed ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
            {clase.is_completed ? <CheckCircle2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {clase.is_completed ? 'Completada' : 'Marcar hecha'}
          </button>
        </div>
      </header>

      <div className="max-w-full mx-auto">
        {/* MAIN VIDEO AREA - CINEMA MODE */}
        <section className="bg-black w-full flex justify-center border-b border-white/5 overflow-hidden">
          <div className="w-full relative shadow-2xl bg-black h-[60vh] md:h-[85vh]">
            {clase.status === 'LIVE' && clase.room_url ? (
              <div id="videosdk-container" className="w-full h-full" />
            ) : (clase.status === 'RECORDED' || clase.status === 'COMPLETED' || clase.status === 'PROCESSING') && finalVideoUrl ? (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <video src={finalVideoUrl} controls className="w-full h-full object-contain" controlsList="nodownload" playsInline />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-neutral-900/60 text-center p-8">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 animate-pulse"><Video className="w-10 h-10 text-white/50" /></div>
                <h3 className="text-3xl font-black font-headline mb-2">
                  {(clase.status === 'PLANNED' || clase.status === 'SCHEDULED') ? 'Sesión Programada' : 
                   clase.status === 'LIVE' ? 'Iniciando Sala...' :
                   (clase.status === 'RECORDED' || clase.status === 'PROCESSING') ? 'Grabación en Proceso' : 
                   'Video no disponible'}
                </h3>
                <p className="text-white/60 max-w-sm mx-auto font-body text-lg">
                  {(clase.status === 'PLANNED' || clase.status === 'SCHEDULED') ? 
                    (isTeacher ? 'Esta sesión aún no ha sido iniciada. Haz clic abajo para comenzar la transmisión.' : 'La clase iniciará automáticamente cuando el tutor se conecte.') : 
                   clase.status === 'LIVE' ? 'El tutor está preparando la sala, por favor espera un momento.' :
                   (clase.status === 'RECORDED' || clase.status === 'PROCESSING') ? 'El video estará disponible para ver bajo demanda en unos minutos.' : 
                   'El enlace del video no ha sido proporcionado o la clase no cuenta con grabación.'}
                </p>
                {isTeacher && (clase.status === 'SCHEDULED' || clase.status === 'PLANNED') && (
                  <button 
                    onClick={handleStartClass} 
                    disabled={isStarting}
                    className="mt-8 px-8 py-4 bg-secondary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-premium hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
                    INICIAR TRANSMISIÓN AHORA
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* INTERACTIVE AREA BELOW VIDEO */}
        <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-8">
          {/* TABS NAVIGATION */}
          <div className="flex border-b border-outline-variant/10 mb-8 gap-8 overflow-x-auto">
            <button onClick={() => setActiveTab('info')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 relative ${activeTab === 'info' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
              <Info className="w-4 h-4" /> Información {activeTab === 'info' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
            </button>
            <button onClick={() => setActiveTab('tasks')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 relative ${activeTab === 'tasks' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
              <ListChecks className="w-4 h-4" /> Tareas {clase.tareas && clase.tareas.length > 0 && <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{clase.tareas.length}</span>} {activeTab === 'tasks' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
            </button>
            <button onClick={() => setActiveTab('questions')} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 relative ${activeTab === 'questions' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
              <HelpIcon className="w-4 h-4" /> Dudas {questions.length > 0 && <span className="bg-secondary text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">{questions.length}</span>} {activeTab === 'questions' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8">
              {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                     <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full font-label ${clase.status === 'LIVE' ? 'bg-error text-white animate-pulse' : 'bg-secondary-container text-on-secondary-container'}`}>
                      {clase.status === 'LIVE' ? '• En Vivo Ahora' : 'Clase Finalizada'}
                    </span>
                    <span className="text-on-surface-variant text-sm font-medium">| {clase.bloque?.name}</span>
                  </div>
                  <h2 className="text-4xl font-black font-headline text-primary tracking-tight leading-tight">{clase.title}</h2>
                  <div className="p-8 bg-surface-container-low rounded-[2.5rem] shadow-sm border border-outline-variant/5">
                    <p className="font-body text-on-surface leading-relaxed text-xl italic">
                      {clase.status === 'LIVE' ? "Participa activamente en esta sesión. Tu asistencia y preguntas enriquecen el aprendizaje de todos." : "Esta clase ha sido grabada. Puedes repasar los conceptos clave y completar las tareas asignadas."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-2xl font-black font-headline text-primary mb-6">Tareas y Material de Clase</h3>
                  {clase.tareas && clase.tareas.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      {clase.tareas.map(tarea => (
                        <div key={tarea.id} className="p-8 bg-white rounded-[2.5rem] shadow-premium border border-outline-variant/5 flex flex-col md:flex-row gap-8 items-start">
                          <div className="w-16 h-16 rounded-3xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-lg">
                            <FileText className="w-8 h-8" />
                          </div>
                          <div className="flex-1 space-y-6">
                            <div>
                              <h4 className="text-xl font-black font-headline text-primary mb-2">{tarea.title}</h4>
                              <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest font-black">Límite: {tarea.due_date ? formatToLocal(tarea.due_date) : 'Flexible'}</p>
                              <p className="mt-4 text-on-surface font-body leading-relaxed">{tarea.description}</p>
                            </div>
                            
                            {userSubmission ? (
                              <div className="bg-green-50 p-6 rounded-2xl border border-green-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md"><CheckCircle2 className="w-6 h-6" /></div>
                                  <div>
                                    <p className="text-sm font-black text-green-700 uppercase">Tarea Entregada</p>
                                    <p className="text-xs text-green-600 font-medium">Revisa las calificaciones en tu perfil.</p>
                                  </div>
                                </div>
                                {userSubmission.grade && (
                                  <div className="text-center bg-white px-4 py-2 rounded-xl shadow-sm border border-green-200">
                                    <p className="text-[10px] font-black text-green-700 uppercase">Nota</p>
                                    <p className="text-xl font-black text-primary">{userSubmission.grade}/100</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                                <textarea value={submission} onChange={(e) => setSubmission(e.target.value)} placeholder="Escribe aquí tu entrega o pega un enlace..." className="w-full p-6 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-2xl focus:ring-2 focus:ring-primary outline-none min-h-[120px] transition-all" />
                                <button onClick={() => handleSubmitTarea(tarea.id)} disabled={isSubmitting} className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:translate-y-[-2px] hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} Enviar Entrega
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant opacity-40">
                      <ListChecks className="w-16 h-16 mb-4" />
                      <p className="font-headline font-black uppercase text-sm tracking-widest">No hay tareas pendientes</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'questions' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black font-headline text-primary">Preguntas y Dudas</h3>
                    <button onClick={fetchQuestions} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                      <Loader2 className={`w-5 h-5 text-primary ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {!isTeacher && (showQuestionForm ? (
                    <div className="bg-primary p-8 rounded-[2.5rem] space-y-4 shadow-premium">
                      <h4 className="text-white font-headline font-black uppercase text-xs tracking-widest">Nueva Consulta</h4>
                      <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="¿Qué parte de la clase no quedó clara?" className="w-full p-6 text-sm bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-2xl focus:ring-2 focus:ring-secondary outline-none min-h-[120px] resize-none" />
                      <div className="flex gap-4">
                        <button onClick={handleAskTutor} disabled={isAsking || !newQuestion.trim()} className="flex-1 bg-secondary text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                          {isAsking ? 'Enviando...' : 'Enviar al Tutor'}
                        </button>
                        <button onClick={() => setShowQuestionForm(false)} className="px-6 py-4 bg-white/10 text-white font-black text-xs uppercase rounded-xl">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowQuestionForm(true)} className="w-full py-6 bg-surface-container-low border-2 border-dashed border-primary/20 text-primary font-headline font-black uppercase tracking-widest rounded-[2.5rem] hover:bg-primary/5 transition-all flex items-center justify-center gap-3">
                      <MessageSquare className="w-6 h-6" /> Hacer una pregunta al tutor
                    </button>
                  ))}

                  <div className="space-y-6">
                    {questions.length > 0 ? [...questions].reverse().map(q => (
                      <div key={q.id} className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-outline-variant/10 space-y-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-md">{getInitials(q.student?.full_name)}</div>
                            <div>
                              <p className="text-sm font-black text-primary leading-none uppercase">{q.student?.full_name}</p>
                              <p className="text-[10px] text-on-surface-variant font-label uppercase mt-1">{formatToLocal(q.created_at)}</p>
                            </div>
                          </div>
                          {q.status === 'PENDING' && <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container tracking-widest">Pendiente</span>}
                        </div>
                        <p className="text-lg font-body text-on-surface leading-relaxed px-2">{q.question}</p>
                        
                        {q.answer ? (
                          <div className="bg-primary/5 p-6 rounded-3xl border-l-4 border-secondary ml-4">
                            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-3 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-secondary" /> Respuesta del Tutor:</p>
                            <p className="text-sm font-body text-primary leading-relaxed">{q.answer}</p>
                          </div>
                        ) : isTeacher && answeringId !== q.id && (
                          <button onClick={() => setAnsweringId(q.id)} className="w-full py-4 bg-secondary/10 text-secondary text-xs font-black uppercase tracking-widest rounded-xl hover:bg-secondary hover:text-white transition-all flex items-center justify-center gap-2">
                            <MessageCircle className="w-4 h-4" /> Responder ahora
                          </button>
                        )}

                        {isTeacher && answeringId === q.id && (
                          <div className="space-y-4 pt-4 border-t border-outline-variant/10 animate-in slide-in-from-top-2">
                            <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Escribe tu respuesta clara y detallada..." className="w-full p-6 text-sm bg-surface-container-low border border-outline-variant/20 rounded-2xl focus:ring-2 focus:ring-secondary outline-none min-h-[100px] resize-none" />
                            <div className="flex gap-4">
                              <button onClick={() => handleAnswerQuestion(q.id)} disabled={isAnswering} className="flex-1 py-4 bg-secondary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all">{isAnswering ? '...' : 'Publicar Respuesta'}</button>
                              <button onClick={() => setAnsweringId(null)} className="px-6 py-4 bg-surface-container-highest text-on-surface text-xs font-black uppercase rounded-xl">Cerrar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="text-center py-12 text-on-surface-variant/40 italic font-body">No hay dudas publicadas en esta clase todavía.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="bg-surface-container-low rounded-[2.5rem] p-8 sticky top-28 shadow-sm border border-outline-variant/5">
                <h3 className="font-black text-primary font-headline uppercase tracking-tight text-xs mb-8 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary" /> Estado Actual</h3>
                <div className="space-y-6">
                  <div className={`p-6 rounded-3xl shadow-lg flex items-center gap-4 transition-all duration-700 ${clase.status === 'LIVE' ? 'bg-error text-white ring-8 ring-error/10' : 'bg-primary text-white'}`}>
                    <div className="flex-1">
                      <p className="text-sm font-black font-headline uppercase tracking-tighter leading-none mb-1">Sesión {clase.status === 'LIVE' ? 'En Vivo' : 'Finalizada'}</p>
                      <p className="text-[10px] opacity-70 font-label uppercase font-black tracking-widest">{clase.status === 'LIVE' ? 'Interactúa ahora' : 'Ver grabación'}</p>
                    </div>
                    {clase.status === 'LIVE' ? (
                      <div className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                      </div>
                    ) : <CheckCircle2 className="w-6 h-6 text-white/50" />}
                  </div>

                  <div className="pt-8 space-y-6 border-t border-outline-variant/10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary"><Clock className="w-6 h-6" /></div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest leading-none mb-1">Progreso</p>
                        <p className="text-sm font-bold text-primary font-headline">{clase.is_completed ? 'Clase Completada' : 'Pendiente de realizar'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary"><ListChecks className="w-6 h-6" /></div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest leading-none mb-1">Actividades</p>
                        <p className="text-sm font-bold text-primary font-headline">{clase.tareas?.length || 0} tareas asignadas</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VirtualClassroomPage;
