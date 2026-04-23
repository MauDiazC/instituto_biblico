import React, { useEffect, useState } from 'react';
import { Users, BookOpen, Settings, Search, Plus, MoreVertical, Shield, Mail, Calendar, Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface MateriaData {
  id: number;
  name: string;
  description: string;
  cover_image_url?: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
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
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<MateriaData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Course Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMateria, setNewMateria] = useState({
    name: '',
    description: '',
    cover_image_url: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Users
      const { data: userData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      setUsers(userData || []);

      // Fetch Materias
      const { data: materiasData, error: materiasError } = await supabase
        .from('materias')
        .select('*')
        .order('name');
      
      if (materiasError) throw materiasError;
      setMaterias(materiasData || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      alert('Rol actualizado con éxito');
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error al actualizar el rol');
    }
  };

  const handleAddMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMateria.name) return;

    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${VITE_API_URL}/courses/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMateria)
      });

      if (!response.ok) throw new Error('Error al crear la materia');

      await fetchData();
      setShowAddModal(false);
      setNewMateria({ name: '', description: '', cover_image_url: '' });
      alert('Materia creada con éxito');
    } catch (error) {
      console.error('Error adding course:', error);
      alert('Hubo un error al crear la materia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchMateriaStudents = async (materia: MateriaData) => {
    setSelectedMateria(materia);
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
        setStudents(data.map((e: any) => ({
          id: e.user.id,
          full_name: e.user.full_name,
          email: e.user.email,
          created_at: e.enrolled_at
        })));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black font-headline text-primary tracking-tight uppercase">Panel de Administración</h1>
          <p className="text-on-surface-variant font-body">Gestión global de usuarios y currículo académico</p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-xl shadow-sm border border-outline-variant/10">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'users' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
          >
            <Users className="w-4 h-4 inline-block mr-2" /> Usuarios
          </button>
          <button 
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'courses' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
          >
            <BookOpen className="w-4 h-4 inline-block mr-2" /> Materias
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Management Tables */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 bg-surface-container-low/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="font-headline font-bold text-primary flex items-center gap-2">
                {activeTab === 'users' ? <Users className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                {activeTab === 'users' ? 'Directorio de Usuarios' : 'Gestión de Materias'}
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border-b-2 border-outline-variant focus:border-secondary focus:ring-0 text-sm outline-none transition-all" 
                  placeholder="Buscar..." 
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'users' ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low/20 text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/5">
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Registro</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary-fixed-dim text-on-secondary-fixed flex items-center justify-center font-bold text-xs">
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary leading-none mb-1">{user.full_name}</p>
                              <p className="text-[10px] text-on-surface-variant">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-tighter text-secondary border-b border-secondary/20 focus:border-secondary outline-none cursor-pointer"
                          >
                            <option value="student">Estudiante</option>
                            <option value="teacher">Docente</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-medium text-on-surface-variant">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-white rounded-full transition-all opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4 text-outline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materias.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => fetchMateriaStudents(m)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedMateria?.id === m.id ? 'bg-primary text-white border-primary' : 'bg-white border-outline-variant/10 hover:border-secondary'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <BookOpen className={`w-5 h-5 ${selectedMateria?.id === m.id ? 'text-secondary-fixed' : 'text-secondary'}`} />
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">ID: {m.id}</span>
                      </div>
                      <h3 className="font-headline font-bold text-sm mb-1">{m.name}</h3>
                      <p className={`text-[10px] line-clamp-2 ${selectedMateria?.id === m.id ? 'text-white/70' : 'text-on-surface-variant'}`}>{m.description}</p>
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="p-4 rounded-xl border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low transition-all group"
                  >
                    <Plus className="w-6 h-6 text-outline group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-outline group-hover:text-primary">Nueva Materia</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Contextual Detail */}
        <div className="lg:col-span-4 space-y-6">
          {activeTab === 'courses' && selectedMateria ? (
            <div className="bg-white rounded-2xl p-8 border border-outline-variant/10 shadow-ambient animate-in slide-in-from-right-4 duration-300">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Alumnos Inscritos</h3>
                 <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-black">{students.length}</span>
               </div>
               
               <div className="space-y-4">
                 {loadingStudents ? (
                   <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary/30" /></div>
                 ) : students.length > 0 ? students.map(s => (
                   <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-all border border-transparent hover:border-outline-variant/10">
                      <div className="w-8 h-8 rounded-full bg-primary/5 text-primary flex items-center justify-center font-bold text-[10px] border border-primary/10">
                        {s.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary truncate">{s.full_name}</p>
                        <p className="text-[9px] text-on-surface-variant uppercase font-medium tracking-tighter">Desde {new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                      <XCircle className="w-3.5 h-3.5 text-error/20 hover:text-error cursor-pointer transition-colors" />
                   </div>
                 )) : (
                   <p className="text-center py-10 text-[10px] font-bold text-outline uppercase italic">No hay alumnos inscritos aún.</p>
                 )}
               </div>
               
               <button className="w-full mt-8 py-3 bg-surface-container-low text-primary rounded-xl font-headline font-bold text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2">
                 <Plus className="w-3 h-3" /> Inscribir Alumno
               </button>
            </div>
          ) : (
            <div className="bg-surface-container-low/30 rounded-2xl p-10 border-2 border-dashed border-outline-variant/10 flex flex-col items-center justify-center text-center opacity-40">
              <Shield className="w-12 h-12 mb-4 text-primary/20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Consola de Seguridad</p>
              <p className="text-[9px] mt-2 leading-relaxed">Selecciona un elemento para ver detalles y gestionar permisos o contenidos.</p>
            </div>
          )}

          {/* Activity Mini-Log */}
          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10">
            <h4 className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4">Actividad del Sistema</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0"></div>
                <p className="text-[10px] text-on-surface-variant"><span className="font-bold text-primary">Servidor API:</span> Operativo y sincronizado con Supabase.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0"></div>
                <p className="text-[10px] text-on-surface-variant"><span className="font-bold text-primary">Certificados:</span> Módulo de generación de diplomas activo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Materia Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
              <h3 className="text-2xl font-black text-primary font-headline tracking-tight uppercase">Nueva Materia</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
            
            <form onSubmit={handleAddMateria} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase ml-1 tracking-widest">Nombre de la Materia</label>
                <input 
                  required
                  type="text" 
                  value={newMateria.name}
                  onChange={(e) => setNewMateria({...newMateria, name: e.target.value})}
                  placeholder="Ej: Teología Sistemática I"
                  className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase ml-1 tracking-widest">Descripción</label>
                <textarea 
                  required
                  value={newMateria.description}
                  onChange={(e) => setNewMateria({...newMateria, description: e.target.value})}
                  rows={3}
                  className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all outline-none"
                  placeholder="Describe brevemente el alcance de la materia..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase ml-1 tracking-widest">URL de Portada (Opcional)</label>
                <input 
                  type="url" 
                  value={newMateria.cover_image_url}
                  onChange={(e) => setNewMateria({...newMateria, cover_image_url: e.target.value})}
                  placeholder="https://..."
                  className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-black tracking-widest text-sm hover:bg-primary-container transition-all shadow-premium active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'CREANDO...' : 'CREAR MATERIA ACADÉMICA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelPage;
