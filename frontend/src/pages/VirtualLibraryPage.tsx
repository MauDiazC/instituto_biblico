import React, { useEffect, useState } from 'react';
import { Search, Download, Quote, Loader2, BookOpen, Plus, X } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface Libro {
  id: number;
  title: string;
  author: string;
  category: string;
  cover_url: string | null;
  file_url: string;
  description: string | null;
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const VirtualLibraryPage: React.FC = () => {
  const [books, setBooks] = useState<Libro[]>([]);
  const [loading, setLoading] = useState(true);
... User modified the `new_string` content to be: import React, { useEffect, useState } from 'react';
import { Search, Download, Quote, Loader2, BookOpen, Plus, X } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface Libro {
  id: number;
  title: string;
  author: string;
  category: string;
  cover_url: string | null;
  file_url: string;
  description: string | null;
}

const getApiUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();
  if (!url.startsWith('http')) { url = `https://${url}`; }
  return url.replace(/\/$/, '');
};
const VITE_API_URL = getApiUrl();

const VirtualLibraryPage: React.FC = () => {
  const [books, setBooks] = useState<Libro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isTeacher, setIsTeacher] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    category: 'Theology',
    cover_url: '',
    file_url: '',
    description: ''
  });

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('libros')
        .select('*');
      
      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role;
        setIsTeacher(role === 'teacher' || role === 'admin');
      }
    };
    
    checkRole();
    fetchBooks();
  }, []);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.file_url || !newBook.title) return;

    try {
      setIsSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${VITE_API_URL}/courses/books`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBook)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al añadir el libro');
      }

      await fetchBooks();
      setShowAddModal(false);
      setNewBook({
        title: '',
        author: '',
        category: 'Theology',
        cover_url: '',
        file_url: '',
        description: ''
      });
      alert('¡Obra añadida con éxito!');
    } catch (error) {
      console.error('Error adding book:', error);
      alert(error instanceof Error ? error.message : 'Hubo un error al guardar la obra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['Todos', ...Array.from(new Set(books.map(b => b.category)))];

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || book.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && books.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="-mt-12 pb-24 relative">
      {/* Hero Search Section - Simplified and Compact */}
      <section className="relative py-16 flex flex-col items-center justify-center overflow-hidden rounded-3xl mb-8 bg-surface-container-low/50">
        <div className="relative z-10 w-full max-w-3xl px-6 text-center space-y-6">
          <h1 className="font-headline text-4xl font-black text-primary tracking-tight">Explore el Saber Eterno</h1>
          <div className="relative group">
            <div className="relative flex items-center bg-white border border-outline-variant/20 rounded-full p-2 shadow-ambient focus-within:ring-2 focus-within:ring-secondary/20 transition-all">
              <Search className="ml-4 text-primary opacity-60 w-6 h-6" />
              <input 
                className="w-full bg-transparent border-none focus:ring-0 text-lg font-body px-4 text-primary placeholder-primary/30 outline-none" 
                placeholder="Buscar por obra o autor..." 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Filters - Reduced margin */}
      <section className="bg-surface-container-lowest border border-outline-variant/10 py-6 px-6 rounded-2xl mb-8 overflow-x-auto shadow-sm">
        <div className="flex justify-start md:justify-center gap-3 min-w-max">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full font-headline font-bold text-xs uppercase tracking-widest transition-all ${
                activeCategory === cat 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-surface-container-low text-slate-500 hover:text-primary hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Book Grid */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-headline text-2xl font-black text-primary tracking-tight">Acervo Bibliográfico</h2>
            <span className="text-[10px] font-black text-on-surface-variant font-label uppercase tracking-widest opacity-60">{filteredBooks.length} Obras Disponibles</span>
          </div>
          {isTeacher && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-secondary text-white px-5 py-2.5 rounded-xl font-headline font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-105 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Añadir Obra
            </button>
          )}
        </div>
        
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredBooks.map((book) => (
              <div key={book.id} className="group flex flex-col h-full bg-surface-container-lowest rounded-xl overflow-hidden transition-all duration-500 hover:shadow-premium border border-outline-variant/10">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800'} 
                    alt={book.title} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <span className="text-white text-xs font-headline uppercase tracking-widest font-bold">Biblioteca Institucional</span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <span className="text-secondary font-headline font-bold text-xs uppercase tracking-widest mb-2">{book.category}</span>
                  <h3 className="font-headline text-xl font-bold text-primary mb-2 leading-tight">{book.title}</h3>
                  <p className="text-slate-500 font-body text-sm mb-6">{book.author}</p>
                  <div className="mt-auto flex gap-3">
                    <a 
                      href={book.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 bg-primary text-on-primary py-3 rounded font-headline font-bold text-xs uppercase tracking-widest transition-all hover:bg-primary-container text-center flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" /> Leer
                    </a>
                    <a 
                      href={book.file_url} 
                      download
                      className="p-3 border-2 border-primary/10 rounded text-primary hover:bg-primary/5 transition-all"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/30">
            <Search className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
            <p className="text-on-surface-variant font-bold font-headline">No se encontraron obras con ese criterio.</p>
          </div>
        )}
      </section>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
              <h3 className="text-2xl font-black text-primary font-headline tracking-tight">Nueva Obra para la Biblioteca</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
            
            <form onSubmit={handleAddBook} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary font-headline uppercase ml-1">Título</label>
                  <input 
                    required
                    type="text" 
                    value={newBook.title}
                    onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                    placeholder="Ej: Teología Sistemática"
                    className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary font-headline uppercase ml-1">Autor</label>
                  <input 
                    required
                    type="text" 
                    value={newBook.author}
                    onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                    placeholder="Ej: Wayne Grudem"
                    className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary font-headline uppercase ml-1">Categoría</label>
                  <select 
                    value={newBook.category}
                    onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                    className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all appearance-none"
                  >
                    <option value="Theology">Teología</option>
                    <option value="History">Historia</option>
                    <option value="Linguistics">Idiomas Bíblicos</option>
                    <option value="Commentaries">Comentarios</option>
                    <option value="Ethics">Ética</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary font-headline uppercase ml-1">Link del PDF (URL)</label>
                  <input 
                    required
                    type="url" 
                    value={newBook.file_url}
                    onChange={(e) => setNewBook({...newBook, file_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-primary font-headline uppercase ml-1">URL de la Portada (Opcional)</label>
                <input 
                  type="url" 
                  value={newBook.cover_url}
                  onChange={(e) => setNewBook({...newBook, cover_url: e.target.value})}
                  placeholder="Link a la imagen de portada"
                  className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-primary font-headline uppercase ml-1">Descripción corta</label>
                <textarea 
                  value={newBook.description}
                  onChange={(e) => setNewBook({...newBook, description: e.target.value})}
                  rows={3}
                  className="w-full p-4 bg-surface-container-low border-0 rounded-2xl font-body text-sm focus:ring-2 focus:ring-secondary transition-all outline-none"
                  placeholder="Resumen de la obra..."
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-black tracking-widest text-sm hover:bg-primary-container transition-all shadow-premium active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'GUARDANDO...' : 'PUBLICAR EN BIBLIOTECA'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scripture Callout */}
      <section className="max-w-4xl mx-auto mt-24">
        <div className="bg-surface-container-highest rounded-xl p-10 border-l-4 border-secondary shadow-ambient relative">
          <Quote className="absolute right-6 top-6 w-12 h-12 text-secondary/10" />
          <blockquote className="font-body text-2xl text-primary leading-relaxed italic mb-4 relative z-10">
            "La exposición de tus palabras alumbra; hace entender a los simples."
          </blockquote>
          <cite className="font-headline font-bold text-primary not-italic relative z-10">— Salmos 119:130</cite>
        </div>
      </section>
    </div>
  );
};

export default VirtualLibraryPage;
