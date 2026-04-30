import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Book, 
  Loader2, 
  Quote, 
  Users, 
  X, 
  Search, 
  ShieldCheck, 
  UserMinus, 
  UserCheck, 
  Mail,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Award,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';
import { twMerge } from 'tailwind-merge';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'teacher' | 'student';
  is_active: boolean;
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const AdminPanelPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Stats & Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalDocentes: 0,
    totalEstudiantes: 0,
    totalAdmin: 0
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/users/`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        
        // Update stats
        setStats({
          totalDocentes: data.filter((u: any) => u.role === 'teacher').length,
          totalEstudiantes: data.filter((u: any) => u.role === 'student').length,
          totalAdmin: data.filter((u: any) => u.role === 'admin').length
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserData) => {
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

  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`¿ELIMINAR PERMANENTEMENTE a ${user.full_name || user.email}?\n\nEsta acción borrará al usuario de la base de datos local.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (response.ok) {
        setUsers(users.filter(u => u.id !== user.id));
        alert('Usuario eliminado de la base de datos local.');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const handlePromoteUser = async (user: UserData) => {
    if (!confirm(`¿Promover a ${user.full_name || user.email} como ADMINISTRADOR?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${VITE_API_URL}/users/${user.id}/promote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, role: 'admin' } : u));
      }
    } catch (err) {
      console.error('Error promoting user:', err);
    }
  };

  // Filtered Lists
  const teachers = useMemo(() => 
    users.filter(u => u.role === 'teacher' && 
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [users, searchQuery]);

  const students = useMemo(() => 
    users.filter(u => u.role === 'student' && 
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [users, searchQuery]);

  const admins = useMemo(() => 
    users.filter(u => u.role === 'admin' && 
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [users, searchQuery]);

  if (loading && users.length === 0) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  const UserTable = ({ title, data, icon: Icon }: { title: string, data: UserData[], icon: any }) => (
    <div className="bg-white rounded-[2.5rem] shadow-ambient overflow-hidden border border-outline-variant/10 mb-10">
      <div className="p-8 border-b border-outline-variant/5 bg-surface-container-low/20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-headline font-black text-primary uppercase tracking-tight text-lg">{title}</h3>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{data.length} Registrados</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/40">
              <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Usuario</th>
              <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Estado</th>
              <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {data.length > 0 ? data.map(user => (
              <tr key={user.id} className="hover:bg-primary/5 transition-all group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center overflow-hidden text-white font-bold text-sm shadow-sm">
                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : getInitials(user.full_name || user.email)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-primary font-headline uppercase truncate leading-none mb-1.5">{user.full_name || 'Sin nombre'}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1.5"><Mail className="w-3 h-3 opacity-40" /> {user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                    <div className="flex items-center gap-2.5">
                      <div className={twMerge("w-2.5 h-2.5 rounded-full", user.is_active ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-outline")} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{user.is_active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.role !== 'admin' && (
                      <button 
                        onClick={() => handlePromoteUser(user)}
                        title="Promover a Admin"
                        className="p-2.5 bg-primary/5 text-primary rounded-xl hover:bg-primary/10 transition-all"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleToggleStatus(user)}
                      title={user.is_active ? 'Desactivar' : 'Activar'}
                      className={twMerge("p-2.5 rounded-xl transition-all", user.is_active ? "bg-error/5 text-error hover:bg-error/10" : "bg-green-50 text-green-600 hover:bg-green-100")}
                    >
                      {user.is_active ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user)}
                      title="Eliminar permanentemente"
                      className="p-2.5 bg-error/5 text-error rounded-xl hover:bg-error/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-8 py-12 text-center text-on-surface-variant font-bold italic opacity-40 uppercase text-[10px] tracking-widest">
                   Sin registros encontrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="pb-24 md:pb-12 px-2 md:px-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-headline text-primary tracking-tighter uppercase leading-none">Panel Administrativo</h1>
          <p className="text-on-surface-variant font-body text-sm md:text-base mt-2">Control central de usuarios y accesos.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-outline-variant/10 rounded-2xl text-sm font-body outline-none focus:ring-2 focus:ring-secondary transition-all shadow-sm"
          />
        </div>
      </section>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12">
        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 opacity-60">Estudiantes</p>
          <p className="text-3xl font-black font-headline text-primary leading-none">{stats.totalEstudiantes}</p>
        </div>
        <div className="bg-secondary-fixed-dim/10 p-6 rounded-3xl border border-secondary/10">
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1 opacity-60">Docentes</p>
          <p className="text-3xl font-black font-headline text-secondary leading-none">{stats.totalDocentes}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1 opacity-60">Admins</p>
          <p className="text-3xl font-black font-headline text-primary leading-none">{stats.totalAdmin}</p>
        </div>
      </div>

      {/* Dual Lists */}
      <div className="space-y-12">
         <UserTable title="Personal Docente" data={teachers} icon={Award} />
         <UserTable title="Comunidad Estudiantil" data={students} icon={GraduationCap} />
         
         {admins.length > 0 && (
           <div className="opacity-60">
             <UserTable title="Administradores" data={admins} icon={ShieldCheck} />
           </div>
         )}
      </div>

      {/* Scripture Block */}
      <div className="mt-16 max-w-3xl">
        <div className="bg-white p-10 rounded-[3rem] border-l-8 border-secondary shadow-premium relative overflow-hidden group">
          <Quote className="absolute right-8 top-8 w-24 h-24 text-secondary/5 group-hover:scale-110 transition-transform duration-700" />
          <p className="text-xl md:text-2xl italic font-body text-primary leading-relaxed relative z-10">
            "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."
          </p>
          <div className="flex items-center gap-4 mt-8 relative z-10">
             <div className="w-12 h-px bg-secondary/40" />
             <p className="font-black text-secondary text-sm uppercase tracking-[0.4em] leading-none">2 Timoteo 2:15</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelPage;
