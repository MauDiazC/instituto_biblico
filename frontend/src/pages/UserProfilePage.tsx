import React, { useEffect, useState } from 'react';
import { Camera, Quote, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { getInitials } from '../utils/avatars';

const UserProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: '',
    email: '',
    role: 'Docente'
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const url = user.user_metadata?.avatar_url || '';
        setFormData({
          full_name: user.user_metadata?.full_name || '',
          avatar_url: url,
          email: user.email || '',
          role: 'Docente'
        });
        setPreviewUrl(url);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setStatus(null);

    try {
      let finalAvatarUrl = formData.avatar_url;

      // 1. Upload image if selected
      if (avatarFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No se encontró sesión de usuario');

        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        finalAvatarUrl = publicUrl;
      }

      // 2. Update user profile
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          full_name: formData.full_name,
          avatar_url: finalAvatarUrl 
        }
      });

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: finalAvatarUrl }));
      setStatus({ type: 'success', message: '¡Perfil actualizado con éxito!' });
    } catch (error: any) {
      setStatus({ type: 'error', message: 'Error: ' + (error.message || 'No se pudo actualizar el perfil') });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-12 max-w-4xl mx-auto w-full">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold font-headline text-primary tracking-tight mb-2">Ajustes de Perfil</h1>
        <p className="text-on-surface-variant text-lg max-w-2xl">Administra tu identidad digital y personaliza tu experiencia en el Instituto Bíblico.</p>
      </div>

      {status && (
        <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm font-label">{status.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Avatar Preview Column */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="relative group">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-xl bg-primary relative flex items-center justify-center text-white text-5xl font-black font-headline">
              {previewUrl ? (
                <img 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" 
                  src={previewUrl} 
                />
              ) : (
                <span>{getInitials(formData.full_name)}</span>
              )}
              <label 
                htmlFor="avatar-upload"
                className="absolute inset-0 bg-primary/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              >
                <Camera className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cambiar Foto</span>
              </label>
            </div>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
          <div className="mt-6 text-center">
            <h3 className="font-headline font-bold text-primary">Previsualización</h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 font-black">Tu Identidad Digital</p>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-8">
          <form onSubmit={handleSubmit} className="space-y-8 bg-surface-container-low/50 p-8 rounded-xl shadow-sm border border-outline-variant/10">
            <div className="space-y-6">
              <div>
                <label className="block font-headline font-bold text-primary text-sm mb-2" htmlFor="full_name">Nombre Completo</label>
                <input 
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/30 focus:border-secondary focus:ring-0 py-3 px-0 text-lg font-body transition-all outline-none" 
                  id="full_name" 
                  name="full_name" 
                  placeholder="Ej. Juan Pérez" 
                  type="text" 
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block font-headline font-bold text-primary text-sm mb-2 opacity-50" htmlFor="email">Correo Electrónico (No editable)</label>
                <input 
                  className="w-full bg-transparent border-0 border-b-2 border-outline-variant/10 py-3 px-0 text-lg font-body outline-none cursor-not-allowed text-on-surface-variant/60" 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  readOnly
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                  <Upload size={14} />
                  Gestión de Imagen
                </div>
                <label 
                  htmlFor="avatar-upload"
                  className="block w-full border-2 border-dashed border-outline-variant/30 rounded-xl p-4 text-center cursor-pointer hover:bg-white hover:border-primary/20 transition-all"
                >
                  <span className="text-sm font-bold text-on-surface-variant">
                    {avatarFile ? avatarFile.name : 'Selecciona una imagen desde tu equipo'}
                  </span>
                </label>
              </div>
            </div>

            {/* Scripture Block */}
            <div className="bg-surface-container-highest p-6 rounded-lg border-l-4 border-secondary-fixed-dim relative">
              <Quote className="absolute right-4 top-4 w-10 h-10 text-secondary/10" />
              <p className="text-sm font-body italic text-primary leading-relaxed relative z-10">
                "Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad."
              </p>
              <p className="text-[10px] font-black font-headline mt-3 text-secondary uppercase tracking-[0.2em] relative z-10">— 2 Timoteo 2:15</p>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-outline-variant/10">
              <button 
                type="button" 
                onClick={() => window.history.back()}
                className="px-6 py-2 text-primary font-label font-bold hover:bg-surface-container transition-colors rounded-lg"
              >
                Volver
              </button>
              <button 
                className="bg-primary text-white px-8 py-3 rounded-full font-label font-bold shadow-ambient hover:translate-y-[-2px] transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
                type="submit"
                disabled={updating}
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                {updating ? 'Subiendo...' : 'Guardar Perfil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
