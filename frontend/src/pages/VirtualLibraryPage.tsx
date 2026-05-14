import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Quote, 
  Loader2, 
  BookOpen, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Book,
  ExternalLink,
  Filter
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { twMerge } from 'tailwind-merge';

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

const ITEMS_PER_PAGE = 8;

const VirtualLibraryPage: React.FC = () => {
  const [books, setBooks] = useState<Libro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [isTeacher, setIsTeacher] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
        .select('*')
        .order('title', { ascending: true });
      
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

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(books.map(b => b.category)))], [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || book.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, searchQuery, activeCategory]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBooks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBooks, currentPage]);

  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  if (loading && books.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-12 space-y-8 md:space-y-10 max-w-full overflow-x-hidden px-0">
      {/* 1. Enhanced Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-5xl font-black font-headline text-primary tracking-tighter uppercase leading-none truncate">Acervo Bibliográfico</h1>
          <p className="text-on-surface-variant font-body text-xs md:text-base mt-2">Explore el saber eterno y la profundidad académica.</p>
        </div>
        {isTeacher && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-secondary text-white font-black text-xs uppercase tracking-widest rounded-[1.5rem] hover:bg-[#5d4201] transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" /> Añadir Obra
          </button>
        )}
      </section>

      {/* 2. Search and Filter Bar */}
      <section className="flex flex-col lg:flex-row gap-4 items-center bg-white p-4 rounded-[2.5rem] border border-outline-variant/10 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-outline opacity-60" />
          <input 
            type="text" 
            placeholder="Buscar por obra o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-surface-container-low/30 border-none rounded-[1.5rem] text-sm font-body outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={twMerge(
                "px-5 py-3 rounded-[1.2rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeCategory === cat ? "bg-primary text-white shadow-md" : "bg-surface-container-low/50 text-primary/60 hover:bg-white border border-transparent hover:border-outline-variant/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Paginated List View */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white rounded-[2.5rem] shadow-ambient overflow-hidden border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed md:table-auto">
              <thead className="bg-surface-container-low/50">
                <tr>
                  <th className="px-6 md:px-8 py-6 text-[10px] font-black text-primary font-headline uppercase tracking-[0.2em] w-[70%] md:w-auto">Obra / Autor</th>
                  <th className="px-8 py-6 text-[10px] font-black text-primary font-headline uppercase tracking-[0.2em] hidden md:table-cell">Categoría</th>
                  <th className="px-6 md:px-8 py-6 text-[10px] font-black text-primary font-headline uppercase tracking-[0.2em] text-right w-[30%] md:w-auto">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {paginatedBooks.length > 0 ? paginatedBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-primary/5 transition-all group">
                    <td className="px-6 md:px-8 py-6 min-w-0">
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-10 h-14 md:w-14 md:h-18 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-outline-variant/10 group-hover:scale-105 transition-transform duration-500">
                          <img 
                            src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800'} 
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-primary font-headline text-sm md:text-base uppercase tracking-tight truncate leading-tight mb-1">{book.title}</p>
                          <p className="text-[10px] md:text-[11px] text-on-surface-variant font-medium opacity-60 uppercase tracking-widest truncate">{book.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 hidden md:table-cell">
                      <span className="px-4 py-1.5 bg-secondary/10 text-secondary text-[9px] font-black rounded-full uppercase tracking-widest border border-secondary/5">
                        {book.category}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 md:gap-3">
                        <a 
                          href={book.file_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2.5 md:p-3 bg-primary/5 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-90"
                          title="Leer Obra"
                        >
                          <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
                        </a>
                        <a 
                          href={book.file_url} 
                          download
                          className="p-2.5 md:p-3 bg-surface-container-high text-primary rounded-2xl hover:bg-outline-variant/20 transition-all shadow-sm active:scale-90 hidden xs:flex"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4 md:w-5 md:h-5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                         <Book className="w-20 h-20" />
                         <p className="font-black font-headline uppercase tracking-[0.2em] text-sm">Sin resultados en la biblioteca</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* List Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-6 md:p-8 border-t border-outline-variant/10 flex flex-col sm:flex-row justify-between items-center gap-6 bg-surface-container-low/10">
              <span className="text-[9px] md:text-[10px] font-black text-primary font-headline uppercase tracking-widest opacity-60">
                Mostrando {paginatedBooks.length} de {filteredBooks.length} obras
              </span>
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 md:p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-30 hover:bg-primary/5 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </button>
                <div className="bg-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl border border-outline-variant/10 shadow-inner">
                   <span className="text-[9px] md:text-[10px] font-black text-primary font-headline uppercase tracking-widest">
                     {currentPage} / {totalPages}
                   </span>
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 md:p-3 rounded-2xl bg-white border border-outline-variant/10 disabled:opacity-30 hover:bg-primary/5 transition-all shadow-sm"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-primary font-headline tracking-tighter uppercase">Nueva Obra</h3>
                <p className="text-[9px] md:text-[10px] font-black text-secondary uppercase tracking-widest mt-1">Carga de material bibliográfico</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-full transition-colors shrink-0">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
            
            <form onSubmit={handleAddBook} className="p-6 md:p-8 space-y-6 max-h-[75vh] md:max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Título de la Obra</label>
                  <input 
                    required
                    type="text" 
                    value={newBook.title}
                    onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                    placeholder="Ej: Teología Sistemática"
                    className="w-full p-4 bg-surface-container-low border-2 border-transparent focus:border-secondary/30 focus:bg-white rounded-2xl font-body text-sm outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Autor / Institución</label>
                  <input 
                    required
                    type="text" 
                    value={newBook.author}
                    onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                    placeholder="Ej: Wayne Grudem"
                    className="w-full p-4 bg-surface-container-low border-2 border-transparent focus:border-secondary/30 focus:bg-white rounded-2xl font-body text-sm outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Categoría</label>
                  <select 
                    value={newBook.category}
                    onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                    className="w-full p-4 bg-surface-container-low border-2 border-transparent focus:border-secondary/30 focus:bg-white rounded-2xl font-body text-sm outline-none transition-all shadow-inner appearance-none"
                  >
                    <option value="Theology">Teología</option>
                    <option value="History">Historia</option>
                    <option value="Linguistics">Idiomas Bíblicos</option>
                    <option value="Commentaries">Comentarios</option>
                    <option value="Ethics">Ética</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Enlace del Recurso (PDF)</label>
                  <input 
                    required
                    type="url" 
                    value={newBook.file_url}
                    onChange={(e) => setNewBook({...newBook, file_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full p-4 bg-surface-container-low border-2 border-transparent focus:border-secondary/30 focus:bg-white rounded-2xl font-body text-sm outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">URL de Portada (Opcional)</label>
                <input 
                  type="url" 
                  value={newBook.cover_url}
                  onChange={(e) => setNewBook({...newBook, cover_url: e.target.value})}
                  placeholder="https://link-a-la-imagen.jpg"
                  className="w-full p-4 bg-surface-container-low border-2 border-transparent focus:border-secondary/30 focus:bg-white rounded-2xl font-body text-sm outline-none transition-all shadow-inner"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-5 rounded-2xl font-black font-headline text-xs uppercase tracking-[0.3em] hover:bg-primary-container transition-all shadow-premium active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR EN BIBLIOTECA'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Scripture Block */}
      <section className="max-w-4xl mx-auto pt-8 md:pt-16">
        <div className="bg-white p-8 md:p-14 rounded-[2.5rem] md:rounded-[3rem] border-l-8 border-secondary shadow-premium relative overflow-hidden group">
          <Quote className="absolute right-8 top-8 w-16 h-16 md:w-24 md:h-24 text-secondary/5 group-hover:scale-110 transition-transform duration-700" />
          <p className="text-lg md:text-3xl italic font-body text-primary leading-relaxed relative z-10 selection:bg-secondary/20">
            "La exposición de tus palabras alumbra; hace entender a los simples."
          </p>
          <div className="flex items-center gap-4 mt-8 relative z-10">
             <div className="w-8 md:w-12 h-px bg-secondary/40" />
             <p className="font-black text-secondary text-xs md:text-sm uppercase tracking-[0.4em] leading-none">Salmos 119:130</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VirtualLibraryPage;
