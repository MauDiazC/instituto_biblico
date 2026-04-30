import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  Book, 
  Loader2, 
  Quote, 
  Users, 
  X, 
  UserCircle, 
  ChevronRight, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  UserMinus, 
  UserCheck, 
  Mail,
  ChevronLeft,
  GraduationCap,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';
import { twMerge } from 'tailwind-merge';

interface MateriaData {
  id: number;
  name: string;
  created_at: string;
}

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'teacher' | 'student';
  is_active: boolean;
}

interface StudentInMateria {
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

const USERS_PER_PAGE = 10;

const AdminPanelPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'materias' | 'users'>('materias');
  
  // Materias State
  const [materias, setMaterias] = useState<MateriaData[]>([]);
  const [stats, setStats] = useState({
    totalMaterias: 0,
    totalDocentes: 0,
    totalEstudiantes: 0,
    nextClass: { title: 'Sin programar', time: '-' }
  });

  // User Management State
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [userPage, setUserPage] = useState(1);

  // Students in Materia Modal
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedMateria, setSelectedMateria] = useState<MateriaData | null>(null);
  const [studentsInMateria, setStudentsInMateria] = useState<StudentInMateria[]>([]);
  const [loadingStudentsInMateria, setLoadingStudentsInMateria] = useState(false);

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
        .eq('role', 'teacher');

      const { count: studentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'student');

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

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const roleParam = userRoleFilter !== 'all' ? `?role=${userRoleFilter}` : '';
      const response = await fetch(`${VITE_API_URL}/users/${roleParam}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (view === 'users') {
      fetchUsers();
    }
  }, [view, userRoleFilter]);

  const handleToggleUserStatus = async (user: UserData) => {
    const action = user.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que deseas ${action} a ${user.full_name || user.email}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !user.is_active })
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handlePromoteUser = async (user: UserData) => {
    if (!confirm(`¿Deseas promover a ${user.full_name || user.email} como ADMINISTRADOR?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/users/${user.id}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, role: 'admin' } : u));
        alert('Usuario promovido con éxito');
      }
    } catch (err) {
      console.error('Error promoting user:', err);
    }
  };

  const handleShowStudentsInMateria = async (materia: MateriaData) => {
    setSelectedMateria(materia);
    setShowStudentsModal(true);
    setLoadingStudentsInMateria(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/courses/${materia.id}/students`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentsInMateria(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudentsInMateria(false);
    }
  };

  const handleDeleteMateria = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta materia? Esta acción no se puede deshacer.')) return;
    
    try {
      const { error } = await supabase.from('materias').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  // User Pagination & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    );
  }, [users, userSearch]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

  if (loading && materias.length === 0) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="pb-24 md:pb-12 px-2 md:px-0 max-w-full overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black font-headline text-primary tracking-tight uppercase">Panel de Control</h1>
          <p className="text-on-surface-variant font-body text-sm md:text-base">Gestión global de la plataforma educativa.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setView('materias')}
            className={twMerge(
              "flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
              view === 'materias' ? "bg-primary text-white shadow-lg" : "bg-white text-primary border border-outline-variant/10"
            )}
          >
            Materias
          </button>
          <button 
            onClick={() => setView('users')}
            className={twMerge(
              "flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
              view === 'users' ? "bg-primary text-white shadow-lg" : "bg-white text-primary border border-outline-variant/10"
            )}
          >
            Usuarios
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        {[
          { label: 'Materias', value: stats.totalMaterias, icon: Book },
          { label: 'Docentes', value: stats.totalDocentes, icon: Award },
          { label: 'Alumnos', value: stats.totalEstudiantes, icon: GraduationCap },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-outline-variant/5 group hover:border-secondary/20 transition-all">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest leading-none">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-secondary/30 group-hover:text-secondary transition-colors" />
            </div>
            <p className="text-2xl md:text-4xl font-black font-headline text-primary">{stat.value}</p>
          </div>
        ))}
        <div className="col-span-2 md:col-span-1 bg-secondary-fixed-dim/10 p-5 md:p-6 rounded-2xl border border-secondary/10 shadow-sm flex flex-col justify-center">
          <p className="text-[9px] font-black text-secondary uppercase tracking-widest mb-1">Próxima Clase</p>
          <p className="text-sm font-bold text-primary truncate leading-tight uppercase">{stats.nextClass.title}</p>
          <p className="text-[10px] text-on-surface-variant font-black mt-1 uppercase tracking-tighter">{stats.nextClass.time}</p>
        </div>
      </div>

      {view === 'materias' ? (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-black font-headline text-primary tracking-tight uppercase">Materias Registradas</h2>
              <Link 
                to="/dashboard/teacher/editor"
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#5d4201] transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Nueva Materia
              </Link>
           </div>

           <div className="bg-white rounded-3xl shadow-ambient overflow-hidden border border-outline-variant/10">
              <div className="hidden md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Materia</th>
                      <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Registro</th>
                      <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {materias.map(m => (
                      <tr key={m.id} className="hover:bg-primary/5 transition-all group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                              <Book className="w-5 h-5" />
                            </div>
                            <p className="font-bold text-primary font-headline uppercase">{m.name}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-xs text-on-surface-variant font-body">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button onClick={() => handleShowStudentsInMateria(m)} className="px-3 py-1.5 bg-primary/5 text-primary rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-primary/10 transition-all">
                                <Users className="w-3.5 h-3.5 inline mr-1" /> Alumnos
                             </button>
                             <Link to={`/dashboard/teacher/editor?materiaId=${m.id}`} className="p-2 text-on-surface-variant hover:text-primary transition-colors"><Edit className="w-4 h-4" /></Link>
                             <button onClick={() => handleDeleteMateria(m.id)} className="p-2 text-on-surface-variant hover:text-error transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Materias */}
              <div className="md:hidden divide-y divide-outline-variant/5">
                {materias.map(m => (
                  <div key={m.id} className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary"><Book className="w-5 h-5" /></div>
                      <p className="font-black text-primary font-headline uppercase">{m.name}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleShowStudentsInMateria(m)} className="flex-1 py-3 bg-primary/5 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest">Alumnos</button>
                       <Link to={`/dashboard/teacher/editor?materiaId=${m.id}`} className="flex-1 py-3 bg-surface-container-high text-primary text-center rounded-xl font-black text-[10px] uppercase tracking-widest">Editar</Link>
                       <button onClick={() => handleDeleteMateria(m.id)} className="px-4 bg-error/5 text-error rounded-xl"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </section>
      ) : (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-black font-headline text-primary tracking-tight uppercase">Gestión de Usuarios</h2>
              
              <div className="flex flex-col md:flex-row gap-3">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o email..." 
                      value={userSearch}
                      onChange={(e) => {setUserSearch(e.target.value); setUserPage(1);}}
                      className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-white border border-outline-variant/10 rounded-xl text-xs font-body outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                    />
                 </div>
                 <select 
                    value={userRoleFilter}
                    onChange={(e) => {setUserRoleFilter(e.target.value as any); setUserPage(1);}}
                    className="px-4 py-2.5 bg-white border border-outline-variant/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-secondary/20"
                 >
                    <option value="all">Todos los Roles</option>
                    <option value="student">Estudiantes</option>
                    <option value="teacher">Docentes</option>
                    <option value="admin">Administradores</option>
                 </select>
              </div>
           </div>

           <div className="bg-white rounded-3xl shadow-ambient overflow-hidden border border-outline-variant/10">
              {loadingUsers ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-container-low/50">
                          <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Usuario</th>
                          <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Rol</th>
                          <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Estado</th>
                          <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {paginatedUsers.map(user => (
                          <tr key={user.id} className="hover:bg-primary/5 transition-all group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden text-white font-bold text-xs">
                                   {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : getInitials(user.full_name || user.email)}
                                </div>
                                <div className="min-w-0">
                                   <p className="font-bold text-primary font-headline uppercase truncate leading-none mb-1">{user.full_name || 'Sin nombre'}</p>
                                   <p className="text-[10px] text-on-surface-variant font-medium lowercase flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                               <span className={twMerge(
                                 "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                 user.role === 'admin' ? "bg-error/10 text-error" : 
                                 user.role === 'teacher' ? "bg-secondary/10 text-secondary" : "bg-primary/5 text-primary"
                               )}>
                                 {user.role}
                               </span>
                            </td>
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-2">
                                  <div className={twMerge("w-2 h-2 rounded-full", user.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-outline")} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{user.is_active ? 'Activo' : 'Inactivo'}</span>
                               </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  {user.role !== 'admin' && (
                                    <button 
                                      onClick={() => handlePromoteUser(user)}
                                      title="Promover a Admin"
                                      className="p-2 text-on-surface-variant hover:text-error transition-colors"
                                    >
                                      <ShieldCheck className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleToggleUserStatus(user)}
                                    title={user.is_active ? 'Desactivar' : 'Activar'}
                                    className={twMerge("p-2 transition-colors", user.is_active ? "text-on-surface-variant hover:text-error" : "text-green-600 hover:text-green-700")}
                                  >
                                    {user.is_active ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Users */}
                  <div className="md:hidden divide-y divide-outline-variant/5">
                    {paginatedUsers.map(user => (
                      <div key={user.id} className="p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : getInitials(user.full_name || user.email)}
                           </div>
                           <div className="min-w-0">
                              <p className="font-bold text-primary font-headline uppercase truncate leading-tight">{user.full_name || 'Usuario'}</p>
                              <p className="text-[10px] text-on-surface-variant font-medium lowercase truncate">{user.email}</p>
                           </div>
                        </div>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <span className="bg-primary/5 text-primary px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">{user.role}</span>
                              <div className="flex items-center gap-1.5">
                                 <div className={twMerge("w-2 h-2 rounded-full", user.is_active ? "bg-green-500" : "bg-outline")} />
                                 <span className="text-[9px] font-black uppercase text-on-surface-variant">{user.is_active ? 'Activo' : 'Inactivo'}</span>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              {user.role !== 'admin' && <button onClick={() => handlePromoteUser(user)} className="p-2.5 bg-error/5 text-error rounded-xl"><ShieldCheck className="w-4 h-4" /></button>}
                              <button onClick={() => handleToggleUserStatus(user)} className={twMerge("p-2.5 rounded-xl", user.is_active ? "bg-error/5 text-error" : "bg-green-50 text-green-600")}>
                                 {user.is_active ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Footer */}
                  {totalUserPages > 1 && (
                    <div className="p-6 border-t border-outline-variant/10 flex justify-center items-center gap-4">
                       <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-2 rounded-lg bg-surface-container-low disabled:opacity-30"><ChevronLeft className="w-5 h-5 text-primary" /></button>
                       <span className="text-[10px] font-black text-primary font-headline uppercase">Página {userPage} de {totalUserPages}</span>
                       <button onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))} disabled={userPage === totalUserPages} className="p-2 rounded-lg bg-surface-container-low disabled:opacity-30"><ChevronRight className="w-5 h-5 text-primary" /></button>
                    </div>
                  )}
                </>
              )}
           </div>
        </section>
      )}

      {/* Students in Materia Modal */}
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
              {loadingStudentsInMateria ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : studentsInMateria.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {studentsInMateria.map(student => (
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
                          <p className="font-bold text-primary font-headline text-sm truncate uppercase tracking-tight">{student.user.full_name}</p>
                          <p className="text-[10px] text-on-surface-variant font-body truncate">{student.user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-outline uppercase">Inscrito</p>
                         <p className="text-[10px] font-bold text-primary">{new Date(student.created_at).toLocaleDateString()}</p>
                      </div>
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

      {/* Scripture Block */}
      <div className="mt-12 max-w-3xl">
        <div className="bg-surface-container-highest/30 p-6 md:p-8 rounded-[2.5rem] border-l-8 border-secondary shadow-sm relative overflow-hidden group">
          <Quote className="absolute right-4 top-4 w-20 h-20 text-secondary/5 group-hover:scale-110 transition-transform duration-700" />
          <p className="text-lg md:text-xl italic font-body text-primary leading-relaxed relative z-10 selection:bg-secondary/20">
            "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."
          </p>
          <div className="flex items-center gap-4 mt-6 relative z-10">
             <div className="w-10 h-px bg-secondary/30" />
             <p className="font-black text-secondary text-xs uppercase tracking-[0.3em] leading-none">2 Timoteo 2:15</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelPage;
