import React, { useEffect, useState } from 'react';
import { Plus, Filter, Edit, Trash2, Book, Loader2, Quote, Users, X, UserCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';

interface MateriaData {
  id: number;
  name: string;
  created_at: string;
}

interface Student {
  id: number;
  user: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  created_at: string;
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const AdminPanelPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [materias, setMaterias] = useState<MateriaData[]>([]);
  const [stats, setStats] = useState({
    totalMaterias: 0,
    totalDocentes: 0,
    totalEstudiantes: 0,
    nextClass: { title: 'Sin programar', time: '-' }
  });

  // Students Modal State
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedMateria, setSelectedMateria] = useState<MateriaData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Materias
      const { data: materiasData, count: materiasCount } = await supabase
        .from('materias')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // 2. Fetch Stats
      const { count: teachersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'TEACHER');

      const { count: studentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'STUDENT');

      // 3. Fetch Next Class
      const { data: nextClassData } = await supabase
        .from('clases')
        .select('title, scheduled_at')
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);

      setMaterias(materiasData || []);
      setStats({
        totalMaterias: materiasCount || 0,
        totalDocentes: teachersCount || 0,
        totalEstudiantes: studentsCount || 0,
        nextClass: nextClassData?.[0] 
          ? { 
              title: nextClassData[0].title, 
              time: new Date(nextClassData[0].scheduled_at).toLocaleString() 
            } 
          : { title: 'Sin programar', time: '-' }
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleShowStudents = async (materia: MateriaData) => {
    setSelectedMateria(materia);
    setShowStudentsModal(true);
    setLoadingStudents(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/${materia.id}/students`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta materia? Esta acción no se puede deshacer.')) return;
    
    try {
      const { error } = await supabase.from('materias').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="pb-24 md:pb-12 px-2 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary tracking-tight mb-2 uppercase">Gestión Académica</h1>
          <p className="text-on-surface-variant font-body text-sm md:text-base">Administración centralizada del currículo.</p>
        </div>
        <Link 
          to="/dashboard/teacher/editor"
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-secondary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#5d4201] transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva Materia
        </Link>
      </div>

      {/* Stats Grid - Responsive behavior */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        {[
          { label: 'Materias', value: stats.totalMaterias, color: 'text-primary' },
          { label: 'Docentes', value: stats.totalDocentes, color: 'text-primary' },
          { label: 'Estudiantes', value: stats.totalEstudiantes, color: 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-outline-variant/5">
            <p className="text-[9px] md:text-xs font-black text-on-surface-variant uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl md:text-4xl font-black font-headline ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
        <div className="col-span-2 md:col-span-1 bg-secondary-fixed-dim/20 p-5 md:p-6 rounded-2xl border border-secondary/10 shadow-sm flex flex-col justify-center">
          <p className="text-[9px] md:text-xs font-black text-secondary uppercase tracking-widest mb-1">Próxima Clase</p>
          <p className="text-sm md:text-base font-bold text-primary truncate leading-tight">{stats.nextClass.title}</p>
          <p className="text-[10px] text-on-surface-variant font-medium mt-1 uppercase">{stats.nextClass.time}</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-ambient overflow-hidden border border-outline-variant/10">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/20">
          <h3 className="font-headline font-bold text-primary tracking-tight uppercase text-sm">Materias Registradas</h3>
          <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant md:hidden">
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile View: Cards (Hidden on MD+) */}
        <div className="md:hidden divide-y divide-outline-variant/5">
          {materias.length > 0 ? materias.map((m) => (
            <div key={m.id} className="p-5 space-y-4 active:bg-primary/5 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-sm">
                    <Book className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-primary font-headline text-base leading-tight">{m.name}</p>
                    <p className="text-[10px] text-on-surface-variant font-label uppercase mt-1">Creado: {new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button 
                  onClick={() => handleShowStudents(m)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary/5 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                  <Users className="w-3.5 h-3.5" /> Alumnos
                </button>
                <Link to={`/dashboard/teacher/editor?materiaId=${m.id}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary-fixed text-on-secondary-fixed rounded-xl font-black text-[10px] uppercase tracking-widest">
                  <Edit className="w-3.5 h-3.5" /> Editar
                </Link>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="p-3 bg-error/5 text-error rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )) : (
            <div className="p-10 text-center text-on-surface-variant font-bold italic text-sm">No hay materias.</div>
          )}
        </div>

        {/* Desktop View: Table (Hidden on Mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-tighter">Materia</th>
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-tighter">Fecha Creación</th>
                <th className="px-6 py-4 text-xs font-black text-on-surface-variant uppercase tracking-tighter text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {materias.length > 0 ? materias.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-white">
                        <Book className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-primary font-headline">{m.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-variant">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleShowStudents(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-lg font-bold text-[10px] uppercase hover:bg-primary/10 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" /> Alumnos
                    </button>
                    <Link to={`/dashboard/teacher/editor?materiaId=${m.id}`} className="inline-block p-2 text-on-surface-variant hover:text-primary transition-colors">
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(m.id)}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-on-surface-variant font-bold italic">
                    No se han registrado materias aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Students Modal - Improved for Mobile */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowStudentsModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-primary font-headline tracking-tight uppercase">Estudiantes Inscritos</h3>
                <p className="text-[10px] md:text-xs font-black text-secondary uppercase tracking-widest">{selectedMateria?.name}</p>
              </div>
              <button onClick={() => setShowStudentsModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto scrollbar-none">
              {loadingStudents ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : students.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-surface-container-low/40 rounded-2xl border border-outline-variant/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden text-white font-bold shadow-sm flex-shrink-0">
                          {student.user.avatar_url ? (
                            <img src={student.user.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-xs md:text-sm">{getInitials(student.user.full_name)}</span>
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-bold text-primary font-headline text-sm truncate">{student.user.full_name}</p>
                          <p className="text-[10px] text-on-surface-variant font-body truncate">{student.user.email}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-outline opacity-20 md:hidden" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 opacity-40">
                  <Users className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-bold font-headline uppercase tracking-widest text-xs">Sin alumnos inscritos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scripture Block - Better spacing for mobile */}
      <div className="mt-12 max-w-3xl">
        <div className="bg-surface-container-highest/50 p-6 md:p-8 rounded-2xl border-l-4 border-secondary shadow-sm relative overflow-hidden">
          <Quote className="absolute right-4 top-4 w-12 h-12 text-secondary/5" />
          <p className="text-base md:text-lg italic font-body text-primary leading-relaxed relative z-10">
            "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."
          </p>
          <p className="mt-4 font-black text-secondary text-[10px] md:text-xs uppercase tracking-widest relative z-10">— 2 Timoteo 2:15</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelPage;
