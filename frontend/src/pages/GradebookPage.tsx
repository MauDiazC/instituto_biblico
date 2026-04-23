import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, FileText, CheckCircle, Clock, Save, Send, ArrowLeft, Loader2, MessageSquare, HelpCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../utils/supabase';

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

interface Consulta {
  id: number;
  question: string;
  answer: string | null;
  status: string;
  created_at: string;
  student: {
    full_name: string;
    email: string;
  };
  clase: {
    title: string;
    materia_name: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const GradebookPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'questions'>('submissions');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);
  const [selectedQueIndex, setSelectedQueIndex] = useState<number | null>(null);
  const [isDetailViewMobile, setIsDetailViewMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grading/Answering state
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [isSaving, setIsSubmitting] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/courses/teacher/submissions`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Error fetching submissions');
      const data = await response.json();
      setSubmissions(data);
      if (data.length > 0 && selectedSubIndex === null) {
        setSelectedSubIndex(0);
        setGrade(data[0].grade?.toString() || '');
        setFeedback(data[0].feedback || '');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/courses/teacher/questions`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Error fetching questions');
      const data = await response.json();
      setQuestions(data);
      if (data.length > 0 && selectedQueIndex === null) {
        setSelectedQueIndex(0);
        setAnswer(data[0].answer || '');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    } else {
      fetchQuestions();
    }
  }, [activeTab]);

  const handleSelectSubmission = (index: number) => {
    setSelectedSubIndex(index);
    setGrade(submissions[index].grade?.toString() || '');
    setFeedback(submissions[index].feedback || '');
    setIsDetailViewMobile(true);
  };

  const handleSelectQuestion = (index: number) => {
    setSelectedQueIndex(index);
    setAnswer(questions[index].answer || '');
    setIsDetailViewMobile(true);
  };

  const handleGradeSubmission = async () => {
    if (selectedSubIndex === null) return;
    const sub = submissions[selectedSubIndex];
    
    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/courses/submissions/${sub.id}/grade?grade=${grade}&feedback=${encodeURIComponent(feedback)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Error updating grade');
      
      alert('Calificación publicada con éxito');
      fetchSubmissions();
    } catch (error) {
      console.error('Error grading:', error);
      alert('Hubo un error al guardar la calificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerQuestion = async () => {
    if (selectedQueIndex === null) return;
    const que = questions[selectedQueIndex];
    
    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/courses/questions/${que.id}/answer`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer })
      });

      if (!response.ok) throw new Error('Error updating answer');
      
      alert('Respuesta publicada con éxito');
      fetchQuestions();
    } catch (error) {
      console.error('Error answering:', error);
      alert('Hubo un error al guardar la respuesta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    s.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tarea.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuestions = questions.filter(q => 
    q.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSub = selectedSubIndex !== null ? submissions[selectedSubIndex] : null;
  const selectedQue = selectedQueIndex !== null ? questions[selectedQueIndex] : null;

  if (loading && (submissions.length === 0 && questions.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] -mx-6 md:-mx-12 -mt-12 overflow-hidden relative">
      {/* Left Column: List */}
      <div className={twMerge(
        "w-full md:w-96 border-r border-outline-variant/10 bg-surface flex flex-col transition-all duration-300",
        isDetailViewMobile ? "-translate-x-full md:translate-x-0 hidden md:flex" : "translate-x-0"
      )}>
        <div className="p-6 border-b border-outline-variant/15 space-y-4">
          <h1 className="text-2xl font-black font-headline text-primary tracking-tight uppercase">Centro Académico</h1>
          
          {/* Tabs */}
          <div className="flex bg-surface-container-low p-1 rounded-xl">
             <button 
               onClick={() => { setActiveTab('submissions'); setIsDetailViewMobile(false); }}
               className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'submissions' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
             >
               <FileText className="w-3 h-3" /> Entregas
             </button>
             <button 
               onClick={() => { setActiveTab('questions'); setIsDetailViewMobile(false); }}
               className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'questions' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
             >
               <HelpCircle className="w-3 h-3" /> Consultas
             </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border-b-2 border-outline-variant focus:border-secondary focus:ring-0 text-sm transition-all outline-none" 
              placeholder={activeTab === 'submissions' ? "Filtrar por estudiante o tarea..." : "Filtrar por estudiante o duda..."} 
              type="text" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-low/20 scrollbar-thin scrollbar-thumb-outline-variant">
          {activeTab === 'submissions' ? (
            filteredSubmissions.length > 0 ? filteredSubmissions.map((sub, idx) => (
              <div 
                key={sub.id}
                onClick={() => handleSelectSubmission(idx)}
                className={twMerge(
                  "p-4 rounded-xl cursor-pointer transition-all border-l-4 hover:scale-[1.02]",
                  selectedSubIndex === idx 
                  ? 'bg-white shadow-ambient border-secondary' 
                  : 'hover:bg-white/60 border-transparent bg-white/40'
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={twMerge("font-headline font-bold text-sm", selectedSubIndex === idx ? 'text-primary' : 'text-on-surface-variant')}>{sub.user.full_name}</span>
                  <span className={twMerge(
                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter",
                    sub.grade === null ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-container text-white'
                  )}>
                    {sub.grade === null ? 'Pendiente' : 'Calificado'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium mb-1 font-label uppercase tracking-wider opacity-70 truncate">{sub.tarea.title}</p>
                <p className="text-[9px] text-outline flex items-center gap-1 font-label uppercase tracking-widest">
                  <Clock className="w-2.5 h-2.5" /> {new Date(sub.created_at).toLocaleDateString()}
                </p>
              </div>
            )) : (
              <div className="text-center py-10 opacity-40">
                <FileText className="w-10 h-10 mx-auto mb-2" />
                <p className="text-xs font-bold font-headline uppercase">No hay entregas</p>
              </div>
            )
          ) : (
            filteredQuestions.length > 0 ? filteredQuestions.map((que, idx) => (
              <div 
                key={que.id}
                onClick={() => handleSelectQuestion(idx)}
                className={twMerge(
                  "p-4 rounded-xl cursor-pointer transition-all border-l-4 hover:scale-[1.02]",
                  selectedQueIndex === idx 
                  ? 'bg-white shadow-ambient border-secondary' 
                  : 'hover:bg-white/60 border-transparent bg-white/40'
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={twMerge("font-headline font-bold text-sm", selectedQueIndex === idx ? 'text-primary' : 'text-on-surface-variant')}>{que.student.full_name}</span>
                  <span className={twMerge(
                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter",
                    que.status === 'PENDING' ? 'bg-secondary-container text-on-secondary-container' : 'bg-success-container text-success'
                  )}>
                    {que.status === 'PENDING' ? 'Pendiente' : 'Respondido'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium mb-1 font-label uppercase tracking-wider opacity-70 truncate">{que.question}</p>
                <p className="text-[9px] text-outline flex items-center gap-1 font-label uppercase tracking-widest">
                  <Clock className="w-2.5 h-2.5" /> {new Date(que.created_at).toLocaleDateString()}</p>
              </div>
            )) : (
              <div className="text-center py-10 opacity-40">
                <HelpCircle className="w-10 h-10 mx-auto mb-2" />
                <p className="text-xs font-bold font-headline uppercase">No hay consultas</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Right Column: Detail Area */}
      <div className={twMerge(
        "flex-1 flex flex-col bg-surface overflow-hidden transition-all duration-300",
        isDetailViewMobile ? "translate-x-0" : "translate-x-full md:translate-x-0 hidden md:flex"
      )}>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12 scrollbar-thin scrollbar-thumb-outline-variant">
          <div className="max-w-3xl mx-auto">
            {/* Mobile Back Button */}
            <button 
              onClick={() => setIsDetailViewMobile(false)}
              className="md:hidden flex items-center gap-2 text-primary font-bold mb-6 hover:bg-surface-container-low p-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Volver a la Lista
            </button>

            {activeTab === 'submissions' && selectedSub ? (
              <>
                {/* Submission Detail */}
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-outline mb-2 uppercase tracking-widest">
                      <span>{selectedSub.tarea.materia_name}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-secondary">{selectedSub.tarea.title}</span>
                    </nav>
                    <h2 className="text-3xl font-black font-headline text-primary tracking-tight">Revisión de Entrega</h2>
                    <p className="text-on-surface-variant mt-1 font-body text-sm sm:text-base">Estudiante: <span className="font-bold text-primary">{selectedSub.user.full_name}</span></p>
                  </div>
                  <div className="text-left md:text-right border-l-2 md:border-l-0 md:border-r-2 border-secondary/20 pl-4 md:pl-0 md:pr-4">
                    <p className="text-[10px] text-outline uppercase tracking-widest font-bold">Fecha de Entrega</p>
                    <p className="text-sm font-headline font-bold">{new Date(selectedSub.created_at).toLocaleString()}</p>
                  </div>
                </header>

                <article className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-outline-variant/10 mb-12 relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-2xl"></div>
                  <div className="prose prose-slate max-w-none space-y-6">
                    <p className="font-body text-base md:text-lg leading-relaxed text-on-surface whitespace-pre-wrap">
                      {selectedSub.content}
                    </p>
                  </div>
                  {selectedSub.content.startsWith('http') && (
                    <div className="mt-6 pt-6 border-t border-outline-variant/10">
                      <a 
                        href={selectedSub.content} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/10 transition-all"
                      >
                        <FileText className="w-4 h-4" /> Ver archivo externo
                      </a>
                    </div>
                  )}
                </article>

                <section className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start mb-12">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-headline font-bold text-primary uppercase tracking-widest mb-3">Calificación</label>
                    <div className="relative">
                      <input 
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full text-4xl font-black font-headline text-center p-6 bg-white rounded-2xl border-b-2 border-outline-variant focus:border-secondary transition-all outline-none shadow-sm" 
                        max="100" min="0" placeholder="0" type="number" 
                      />
                      <span className="absolute bottom-2 right-4 text-[10px] font-bold text-outline">/ 100</span>
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-headline font-bold text-primary uppercase tracking-widest mb-3">Retroalimentación Docente</label>
                    <textarea 
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="w-full font-body text-base p-4 bg-white rounded-2xl border-b-2 border-outline-variant focus:border-secondary transition-all outline-none resize-none shadow-sm" 
                      placeholder="Escribe tus comentarios aquí..." 
                      rows={4}
                    ></textarea>
                  </div>
                </section>

                <div className="flex justify-end pb-12">
                  <button 
                    onClick={handleGradeSubmission}
                    disabled={isSaving || !grade}
                    className="w-full sm:w-auto px-10 py-4 bg-secondary-fixed-dim hover:bg-secondary text-on-secondary-fixed font-headline font-bold rounded-full shadow-premium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Publicar Calificación'}
                  </button>
                </div>
              </>
            ) : activeTab === 'questions' && selectedQue ? (
              <>
                {/* Question Detail */}
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-outline mb-2 uppercase tracking-widest">
                      <span>{selectedQue.clase.materia_name}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-secondary">{selectedQue.clase.title}</span>
                    </nav>
                    <h2 className="text-3xl font-black font-headline text-primary tracking-tight">Consulta Académica</h2>
                    <p className="text-on-surface-variant mt-1 font-body text-sm sm:text-base">De: <span className="font-bold text-primary">{selectedQue.student.full_name}</span></p>
                  </div>
                  <div className="text-left md:text-right border-l-2 md:border-l-0 md:border-r-2 border-secondary/20 pl-4 md:pl-0 md:pr-4">
                    <p className="text-[10px] text-outline uppercase tracking-widest font-bold">Enviado el</p>
                    <p className="text-sm font-headline font-bold">{new Date(selectedQue.created_at).toLocaleString()}</p>
                  </div>
                </header>

                <article className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-outline-variant/10 mb-12 relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-2xl"></div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Pregunta del Estudiante:</p>
                    <p className="font-body text-lg md:text-xl leading-relaxed text-primary font-bold">
                      "{selectedQue.question}"
                    </p>
                  </div>
                </article>

                <section className="space-y-6 mb-12">
                  <label className="block text-[10px] font-headline font-bold text-primary uppercase tracking-widest">Tu Respuesta</label>
                  <textarea 
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full font-body text-base p-6 bg-white rounded-3xl border-b-2 border-outline-variant focus:border-secondary transition-all outline-none resize-none shadow-sm min-h-[200px]" 
                    placeholder="Escribe tu respuesta detallada aquí..." 
                  ></textarea>
                </section>

                <div className="flex justify-end pb-12">
                  <button 
                    onClick={handleAnswerQuestion}
                    disabled={isSaving || !answer.trim()}
                    className="w-full sm:w-auto px-10 py-4 bg-primary text-white font-headline font-bold rounded-full shadow-premium transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Publicar Respuesta'}
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                <MessageSquare className="w-16 h-16 text-primary/20" />
                <p className="font-headline font-bold text-primary uppercase tracking-widest">
                  Selecciona {activeTab === 'submissions' ? 'una entrega' : 'una consulta'} para revisar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradebookPage;
