import React, { useEffect, useState, useRef } from 'react';
import { 
  Plus, ChevronRight, PlayCircle, FileText, 
  CloudUpload, Trash2, FolderOpen, Loader2, Save, Eye, Video, ClipboardList, Calendar, Clock, Edit3, Image as ImageIcon, X, Upload
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

interface Tarea {
  id?: number;
  title: string;
  description: string;
  due_date: string;
  file_url?: string;
  file?: File;
}

interface Bloque {
  id: number;
  name: string;
}

const CourseContentEditorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const materiaIdFromQuery = searchParams.get('materiaId');
  const claseIdFromQuery = searchParams.get('claseId');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Materia / Course Data
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverImagePreview] = useState<string>('');

  // Blocks / Modules Data
  const [existingBlocks, setExistingBlocks] = useState<Bloque[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('new');
  const [newBlockName, setNewBlockName] = useState('');

  // Lesson / Class Data
  const [lessonTitle, setLessonTitle] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [videoUrl, setVideoUrl] = useState(''); // New for recorded classes
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Tareas Data
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [newTarea, setNewTarea] = useState<Tarea>({ title: '', description: '', due_date: '' });
  const [taskFile, setTaskFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let currentMateriaId = materiaIdFromQuery;

        // If we have a claseId, fetch its data first to get the materiaId if not provided
        if (claseIdFromQuery) {
          const { data: clase, error: cError } = await supabase
            .from('clases')
            .select('*, bloque:bloques(materia_id), tareas(*)')
            .eq('id', claseIdFromQuery)
            .single();
          
          if (cError) throw cError;
          
          setLessonTitle(clase.title);
          setIsLive(clase.status === 'SCHEDULED' || clase.status === 'LIVE');
          setVideoUrl(clase.video_url || '');
          setSelectedBlockId(clase.bloque_id.toString());
          
          if (clase.scheduled_at) {
            const dateObj = new Date(clase.scheduled_at);
            setScheduledAt(dateObj.toISOString().split('T')[0]);
            setScheduledTime(dateObj.toTimeString().split(' ')[0].substring(0, 5));
          }

          setTareas(clase.tareas || []);
          
          if (!currentMateriaId) {
            currentMateriaId = clase.bloque.materia_id.toString();
          }
        }

        if (currentMateriaId) {
          const { data: materia, error } = await supabase
            .from('materias')
            .select('*, bloques(*)')
            .eq('id', currentMateriaId)
            .single();

          if (error) throw error;
          
          setCourseName(materia.name);
          setCourseDescription(materia.description);
          setCoverImagePreview(materia.cover_image_url);
          setExistingBlocks(materia.bloques || []);
          
          if (!claseIdFromQuery && materia.bloques?.length > 0) {
            setSelectedBlockId(materia.bloques[0].id.toString());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [materiaIdFromQuery, claseIdFromQuery]);

  const handleAddTarea = () => {
    if (!newTarea.title) return;
    setTareas([...tareas, { ...newTarea, file: taskFile || undefined }]);
    setNewTarea({ title: '', description: '', due_date: '' });
    setTaskFile(null);
  };

  const handleDeleteClass = async () => {
    if (!claseIdFromQuery || !window.confirm('¿Estás seguro de que deseas eliminar esta clase?')) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase.from('clases').delete().eq('id', claseIdFromQuery);
      if (error) throw error;
      
      alert('Clase eliminada exitosamente');
      navigate('/dashboard/teacher/courses');
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      let currentMateriaId = materiaIdFromQuery;
      let finalCoverUrl = coverPreview;

      // 1. Upload Cover if changed (using 'covers' bucket)
      if (coverImage) {
        const fileName = `${Date.now()}-${coverImage.name}`;
        const { error: uploadError } = await supabase.storage.from('covers').upload(fileName, coverImage);
        
        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('El bucket "covers" no existe en Supabase. Por favor, créalo en el panel de Storage.');
          }
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(fileName);
        finalCoverUrl = publicUrl;
      }

      // 2. Create or Update Materia
      if (!currentMateriaId && !claseIdFromQuery) {
        const { data: newMateria, error: mError } = await supabase
          .from('materias')
          .insert([{ name: courseName, description: courseDescription, cover_image_url: finalCoverUrl }])
          .select().single();
        if (mError) throw mError;
        currentMateriaId = newMateria.id.toString();
      } else if (currentMateriaId) {
        await supabase.from('materias').update({ name: courseName, description: courseDescription, cover_image_url: finalCoverUrl }).eq('id', currentMateriaId);
      }

      // 3. Optional: Create/Handle Block and Class only if lessonTitle is provided
      if (lessonTitle) {
        let targetBlockId = selectedBlockId;
        if (selectedBlockId === 'new') {
          const { data: newBloque, error: bError } = await supabase
            .from('bloques')
            .insert([{ name: newBlockName || `Módulo ${existingBlocks.length + 1}`, materia_id: currentMateriaId }])
            .select().single();
          if (bError) throw bError;
          targetBlockId = newBloque.id.toString();
        }

        // Create or Update Class
        const classData: any = {
          title: lessonTitle,
          bloque_id: targetBlockId,
        };

        if (isLive) {
          classData.status = 'SCHEDULED';
          if (scheduledAt && scheduledTime) {
            classData.scheduled_at = new Date(`${scheduledAt}T${scheduledTime}:00`).toISOString();
          }
        } else {
          classData.status = 'RECORDED';
          classData.video_url = videoUrl;
        }

        let targetClaseId = claseIdFromQuery;

        if (!targetClaseId) {
          const { data: newClase, error: cError } = await supabase
            .from('clases')
            .insert([classData])
            .select().single();
          if (cError) throw cError;
          targetClaseId = newClase.id.toString();
        } else {
          const { error: cError } = await supabase
            .from('clases')
            .update(classData)
            .eq('id', targetClaseId);
          if (cError) throw cError;
        }

        // 5. Create or Sync Tareas
        if (tareas.length > 0) {
          const currentTaskIds = tareas.filter(t => t.id).map(t => t.id);
          
          // Delete tasks that were removed
          if (claseIdFromQuery) {
             await supabase.from('tareas').delete().eq('clase_id', targetClaseId).not('id', 'in', `(${currentTaskIds.join(',') || '0'})`);
          }

          for (const t of tareas) {
            let taskFileUrl = t.file_url;
            
            if (t.file) {
              const fileName = `materials/${Date.now()}-${t.file.name}`;
              const { error: uploadError } = await supabase.storage.from('assignments').upload(fileName, t.file);
              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('assignments').getPublicUrl(fileName);
                taskFileUrl = publicUrl;
              } else if (uploadError.message.includes('Bucket not found')) {
                 throw new Error('El bucket "assignments" no existe en Supabase. Por favor, créalo en el panel de Storage.');
              }
            }
            
            const taskData = {
              title: t.title,
              description: t.description,
              due_date: t.due_date || null,
              file_url: taskFileUrl,
              clase_id: targetClaseId
            };

            if (t.id) {
              await supabase.from('tareas').update(taskData).eq('id', t.id);
            } else {
              await supabase.from('tareas').insert([taskData]);
            }
          }
        } else if (claseIdFromQuery) {
          // If no tasks left, delete all for this class
          await supabase.from('tareas').delete().eq('clase_id', targetClaseId);
        }
      }

      alert('Contenido guardado exitosamente');
      navigate('/dashboard/teacher/courses');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface pb-20">
      <header className="bg-white border-b border-outline-variant/10 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black font-headline text-primary uppercase tracking-tight">
              {claseIdFromQuery ? 'Editar Sesión' : 'Editor de Contenido Académico'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {claseIdFromQuery && (
              <button 
                onClick={handleDeleteClass}
                disabled={deleting || saving}
                className="bg-error/10 text-error px-6 py-3 rounded-xl font-black text-xs tracking-widest hover:bg-error/20 transition-all flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ELIMINAR CLASE
              </button>
            )}
            <button 
              onClick={handleSaveAll}
              disabled={saving || !courseName || deleting}
              className="bg-primary text-white px-8 py-3 rounded-xl font-black text-xs tracking-widest hover:bg-primary-container transition-all flex items-center gap-2 shadow-premium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {claseIdFromQuery ? 'GUARDAR CAMBIOS' : (lessonTitle ? 'PUBLICAR CONTENIDO' : 'GUARDAR MATERIA')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-12">
          {/* Section 1: Materia */}
          <section className="bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-ambient space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center"><ImageIcon className="w-6 h-6" /></div>
              <h2 className="text-2xl font-black font-headline text-primary uppercase tracking-tighter">1. Identidad de la Materia</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Nombre de la Materia *</label>
                <input value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-secondary p-4 rounded-t-xl text-lg font-bold outline-none" placeholder="Ej: Teología Sistemática I" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Descripción General</label>
                <textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} rows={3} className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-secondary p-4 rounded-t-xl text-sm outline-none resize-none" placeholder="Describe los objetivos del curso..." />
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" /> Portada de la Materia
                </label>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                   {coverPreview && (
                     <div className="w-full md:w-40 aspect-video rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm flex-shrink-0">
                       <img src={coverPreview} className="w-full h-full object-cover" alt="Preview" />
                     </div>
                   )}
                   <label className="flex-1 w-full cursor-pointer bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-white hover:border-secondary transition-all">
                      <CloudUpload className="w-8 h-8 text-secondary opacity-40" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-primary">Haz clic para subir portada</p>
                        <p className="text-[10px] text-on-surface-variant font-label uppercase">Formatos: JPG, PNG • Max 2MB</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCoverImage(file);
                            setCoverImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                   </label>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Clase */}
          <section className="bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-ambient space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center"><Video className="w-6 h-6" /></div>
              <div className="flex-1">
                 <h2 className="text-2xl font-black font-headline text-primary uppercase tracking-tighter">2. Detalles de la Sesión</h2>
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Opcional: puedes agendarla después</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Título de la Lección</label>
                <input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-secondary p-4 rounded-t-xl text-lg font-bold outline-none" placeholder="Ej: Clase 1: Fundamentos de la Fe" />
              </div>

              {lessonTitle && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  {/* Toggle Live vs Recorded */}
                  <div className="flex gap-4 p-1 bg-surface-container-low rounded-xl w-fit">
                    <button 
                      onClick={() => setIsLive(true)}
                      className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isLive ? 'bg-primary text-white shadow-md' : 'text-primary/40'}`}
                    >
                      Clase en Vivo
                    </button>
                    <button 
                      onClick={() => setIsLive(false)}
                      className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${!isLive ? 'bg-secondary text-white shadow-md' : 'text-primary/40'}`}
                    >
                      Pre-grabada
                    </button>
                  </div>

                  {/* Module Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Módulo / Bloque</label>
                      <select 
                        value={selectedBlockId} 
                        onChange={(e) => setSelectedBlockId(e.target.value)}
                        className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-secondary p-4 rounded-t-xl text-sm outline-none"
                      >
                        <option value="new">+ Crear Nuevo Módulo</option>
                        {existingBlocks.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    {selectedBlockId === 'new' && (
                      <div className="space-y-2 animate-in slide-in-from-left-2">
                        <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Nombre del Nuevo Módulo</label>
                        <input value={newBlockName} onChange={(e) => setNewBlockName(e.target.value)} className="w-full bg-surface-container-low border-0 border-b-2 border-secondary focus:border-primary p-4 rounded-t-xl text-sm outline-none" placeholder="Ej: Módulo 2: Historia" />
                      </div>
                    )}
                  </div>

                  {isLive ? (
                    <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-500">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar className="w-3 h-3" /> Fecha</label>
                        <input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-secondary p-4 rounded-t-xl text-sm outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2"><Clock className="w-3 h-3" /> Hora</label>
                        <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant focus:border-secondary p-4 rounded-t-xl text-sm outline-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-in fade-in duration-500">
                      <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1 flex items-center gap-2"><PlayCircle className="w-3 h-3" /> URL del Video (YouTube, Vimeo, etc.)</label>
                      <input 
                        value={videoUrl} 
                        onChange={(e) => setVideoUrl(e.target.value)} 
                        className="w-full bg-surface-container-low border-0 border-b-2 border-secondary focus:border-primary p-4 rounded-t-xl text-sm outline-none font-bold text-primary" 
                        placeholder="https://www.youtube.com/watch?v=..." 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-12">
          {/* Section 3: Tareas */}
          <section className="bg-surface-container-low p-8 rounded-3xl space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center"><ClipboardList className="w-6 h-6" /></div>
              <h2 className="text-2xl font-black font-headline text-primary uppercase tracking-tighter">3. Actividades</h2>
            </div>

            <div className="space-y-4">
              {!lessonTitle ? (
                <div className="p-6 bg-white/50 rounded-2xl border border-dashed border-outline-variant/30 text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Asigna un título a la lección para añadir tareas</p>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 space-y-4">
                  <input value={newTarea.title} onChange={(e) => setNewTarea({...newTarea, title: e.target.value})} className="w-full border-0 border-b border-outline-variant focus:border-secondary p-2 text-sm font-bold outline-none" placeholder="Título de la tarea..." />
                  <textarea value={newTarea.description} onChange={(e) => setNewTarea({...newTarea, description: e.target.value})} className="w-full border-0 border-b border-outline-variant focus:border-secondary p-2 text-xs outline-none" placeholder="Instrucciones para el alumno..." />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Documento de apoyo (Opcional)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer bg-surface p-3 rounded-xl border border-dashed border-outline-variant flex items-center justify-center gap-2 hover:bg-secondary/5 transition-all">
                        <Upload className="w-4 h-4 text-secondary" />
                        <span className="text-[10px] font-bold text-primary truncate">
                          {taskFile ? taskFile.name : 'Subir archivo'}
                        </span>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => setTaskFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      {taskFile && (
                        <button onClick={() => setTaskFile(null)} className="p-2 text-error hover:bg-error/5 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <button onClick={handleAddTarea} className="w-full py-3 bg-secondary/10 text-secondary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary/20 transition-all">Añadir Tarea</button>
                </div>
              )}

              <div className="space-y-3">
                {tareas.map((t, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                        {(t.file || t.file_url) ? <FileText className="w-4 h-4 text-secondary" /> : <ClipboardList className="w-4 h-4 text-primary opacity-40" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{t.title}</p>
                        {(t.file || t.file_url) && <p className="text-[9px] text-secondary font-bold truncate max-w-[150px]">{t.file ? t.file.name : 'Archivo adjunto'}</p>}
                      </div>
                    </div>
                    <button onClick={() => setTareas(tareas.filter((_, idx) => idx !== i))} className="p-2 text-error hover:bg-error/5 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CourseContentEditorPage;
