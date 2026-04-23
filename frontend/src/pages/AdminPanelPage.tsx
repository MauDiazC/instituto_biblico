import React, { useEffect, useState } from 'react';
import { Plus, Filter, Edit, Trash2, Book, Loader2, Quote, Users, X, UserCircle } from 'lucide-react';
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
      const { count: teachersCount, error: tError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'TEACHER');

      const { count: studentsCount, error: sError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'STUDENT');

      console.log('DEBUG: teachersCount:', teachersCount, 'error:', tError);
      console.log('DEBUG: studentsCount:', studentsCount, 'error:', sError);

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
      const response = await fetch(`http://localhost:8000/api/v1/courses/${materia.id}/students`, {
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
      fetchData(); // Refresh list
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
    <div className="pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight mb-2">Control de Materias</h1>
          <p className="text-on-surface-variant font-body">Gestión académica centralizada del Instituto Bíblico.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link 
            to="/dashboard/teacher/editor"
            className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-on-secondary font-bold rounded-lg hover:bg-[#5d4201] transition-all shadow-premium"
          >
            <Plus className="w-5 h-5" />
            Nueva Materia
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Materias</p>
          <p className="text-4xl font-black font-headline text-primary">{stats.totalMaterias}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Docentes Activos</p>
          <p className="text-4xl font-black font-headline text-primary">{stats.totalDocentes}</p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-ambient">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Estudiantes</p>
          <p className="text-4xl font-black font-headline text-primary">{stats.totalEstudiantes}</p>
        </div>
        <div className="bg-secondary-container/30 p-6 rounded-xl border border-secondary/10">
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Próxima Clase</p>
          <p className="text-lg font-bold text-primary truncate">{stats.nextClass.title}</p>
          <p className="text-xs text-on-surface-variant">{stats.nextClass.time}</p>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
          <h3 className="font-headline font-bold text-primary tracking-tight">Materias Registradas</h3>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
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
                      <Users className="w-3.5 h-3.5" />
                      Alumnos
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

      {/* Students Modal */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowStudentsModal(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="text-2xl font-black text-primary font-headline tracking-tight">Estudiantes Inscritos</h3>
                <p className="text-xs font-bold text-secondary uppercase tracking-widest">{selectedMateria?.name}</p>
              </div>
              <button onClick={() => setShowStudentsModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {loadingStudents ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : students.length > 0 ? (
                <div className="space-y-4">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden text-white font-bold shadow-sm">
                          {student.user.avatar_url ? (
                            <img src={student.user.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-sm">{getInitials(student.user.full_name)}</span>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary font-headline">{student.user.full_name}</p>
                          <p className="text-xs text-on-surface-variant font-body">{student.user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest">Inscrito el</p>
                        <p className="text-xs font-bold font-label">{new Date(student.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 opacity-40">
                  <Users className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-bold font-headline uppercase tracking-widest">Sin alumnos inscritos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scripture Block */}
      <div className="mt-12 max-w-3xl">
        <div className="bg-surface-container-highest p-8 rounded-xl border-l-4 border-secondary shadow-sm relative">
          <Quote className="absolute right-6 top-6 w-12 h-12 text-secondary/10" />
          <p className="text-lg italic font-body text-primary leading-relaxed relative z-10">
            "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."
          </p>
          <p className="mt-4 font-bold text-secondary text-sm relative z-10">— 2 Timoteo 2:15</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelPage;
