import React from 'react';
import { BookOpen, Compass, LayoutGrid, List, Clock, ArrowRight, CheckCircle } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[870px] flex items-center overflow-hidden -mt-20">
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover opacity-20 grayscale" 
            alt="dramatic wide shot of a classical library" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2TEjEOTwLTFgU7obxOiqraZ1ldR8zJzld_5tT_hz7toDtgnelntC65LfhHGYyCwIQ8K9TnS1hwpTvOtGwUxsxTNBqQBQsX-KMRwc4rlKNdfpyo3tU2scHYha9fXYr9xWQnETNzdRrwA5j1jcZOL8QBenfKUun6Paf_JAiSesjq88KLo4rIh0z6Dp3CWt8FKiywmvH-hvrGYRdYSWPKQZFT7qRJT6vqBYAkzjUV2RlDefuRayMgqqHfj9YAhVa1Ve38-iehKM40nBt" 
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-90"></div>
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-fixed-dim/20 text-secondary-fixed border border-secondary-fixed/30 font-label text-sm uppercase tracking-widest">
              <BookOpen className="w-4 h-4" />
              Instituto Bíblico
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-black text-white leading-tight tracking-tighter">
              La Verdad que <span className="text-secondary-fixed-dim">Transforma</span> el Corazón
            </h1>
            <p className="text-on-primary-container text-xl md:text-2xl leading-relaxed max-w-2xl opacity-90">
              Sumérgete en una formación teológica profunda y rigurosa. Nuestro instituto combina la tradición bíblica milenaria con una pedagogía moderna para la edificación de la Iglesia.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <a href="#cursos" className="bg-secondary-fixed-dim text-on-secondary-fixed px-8 py-4 rounded-lg font-headline font-bold text-lg shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-transform flex items-center gap-3">
                <Compass className="w-6 h-6" />
                Explorar Cursos
              </a>
              <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-lg font-headline font-bold text-lg hover:bg-white/20 transition-all flex items-center gap-3">
                Continuar Lección
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 hidden lg:block">
            <div className="bg-surface-container-lowest/10 backdrop-blur-xl p-8 rounded-xl border border-white/10 shadow-2xl">
              <div className="border-l-4 border-[#775a19] pl-6 space-y-4">
                <p className="text-white italic text-xl font-light leading-relaxed">
                  "Lámpara es a mis pies tu palabra, y lumbrera a mi camino."
                </p>
                <span className="block text-secondary-fixed font-bold tracking-widest uppercase text-sm">Salmo 119:105</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cursos Section */}
      <section className="py-24 bg-surface" id="cursos">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="font-headline text-4xl font-black text-primary mb-4 tracking-tight">Catálogo Académico</h2>
              <p className="text-on-surface-variant text-lg">Estructura tu crecimiento con nuestra currícula diseñada por expertos en exégesis y hermenéutica bíblica.</p>
            </div>
            <div className="flex gap-2">
              <button className="p-3 rounded-full bg-surface-container hover:bg-surface-container-high text-primary transition-colors">
                <LayoutGrid className="w-6 h-6" />
              </button>
              <button className="p-3 rounded-full bg-surface-container text-outline transition-colors">
                <List className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Curso Card 1 */}
            <div className="group bg-surface-container-lowest rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]">
              <div className="relative h-64">
                <img 
                  className="w-full h-full object-cover" 
                  alt="ancient bible manuscripts" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQxOCmjTVrSQ9KwPV4Ps1sRxbSmqRUpVonStMKTscw_lplN040q0KS1AW--VcI4Jv2SQ-oQ6YP_T7a5iDahs9Bq270J9vR2axm75NVwkHnZXzzMbRIfluTre7_kpzfZN0y2AeewHvpR2wO-6qLdtBpZj3usHkEicQqtK5hUMnk6wvGXI79aph7i4I9QUAW5hpHsXiC4smcPo_fjLE-ixBJ4fYsrkh0hqhWFkhvhv7tXKMd22hWwcjjtQ0L0GfkcR3ZVPmEd-xI6h6a" 
                />
                <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">Fundamentos</div>
              </div>
              <div className="p-8 space-y-4">
                <h3 className="font-headline text-2xl font-black text-primary group-hover:text-secondary transition-colors">Teología Sistemática I</h3>
                <p className="text-on-surface-variant leading-relaxed">Un estudio exhaustivo de las doctrinas fundamentales de la fe, explorando la naturaleza de Dios y Su revelación.</p>
                <div className="pt-4 flex items-center justify-between border-t border-outline-variant/30">
                  <span className="flex items-center gap-1 text-sm text-outline font-medium">
                    <Clock className="w-4 h-4" /> 12 Semanas
                  </span>
                  <button className="text-primary font-bold hover:text-secondary flex items-center gap-1 group/btn">
                    Ver Detalle
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
            {/* Curso Card 2 */}
            <div className="group bg-surface-container-lowest rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]">
              <div className="relative h-64">
                <img 
                  className="w-full h-full object-cover" 
                  alt="overhead shot of a minimalist wooden desk with an open bible" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD-4k311AzFPvZOXa6qXF4FQgF4iJBtTKGQ_RCi3WqDQA3h8Nr6iGYjZ0v620f55cocU6VmQvTualN7Z8roh_mATxUZE0gYB0V-5tWCg7w2f7mAerq0mK0oAFCuKdHLlTwIBxsY-GxBxkuLRkbBVi70Lpa1b3Axtcjf2VbBMXtrMAhX-9KQ09HtrNHfPxPELs7qZVkXKuHI76o2ePOyqj3bRblqUTRFcfQaAMYuwVEY_HXtYxpGxG_-dQDXUHKuIYuAZgaDdGrNXJ5" 
                />
                <div className="absolute top-4 right-4 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">Avanzado</div>
              </div>
              <div className="p-8 space-y-4">
                <h3 className="font-headline text-2xl font-black text-primary group-hover:text-secondary transition-colors">Hermenéutica Avanzada</h3>
                <p className="text-on-surface-variant leading-relaxed">Métodos de interpretación para profundizar en los textos originales y su aplicación al contexto contemporáneo.</p>
                <div className="pt-4 flex items-center justify-between border-t border-outline-variant/30">
                  <span className="flex items-center gap-1 text-sm text-outline font-medium">
                    <Clock className="w-4 h-4" /> 10 Semanas
                  </span>
                  <button className="text-primary font-bold hover:text-secondary flex items-center gap-1 group/btn">
                    Ver Detalle
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
            {/* Curso Card 3 */}
            <div className="group bg-surface-container-lowest rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]">
              <div className="relative h-64">
                <img 
                  className="w-full h-full object-cover" 
                  alt="modern light-filled classroom" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAY3vqGIMLCUgP02aa2oPBBJVgJLN6Gw4B6cZK-VqYY3xIFz3iZw6yQfJGa0kAAKmluWLOWW4CfLdgsrqpRDTmDyB7Fcj5D7IQk-0p8vf9sG_WxObsDywQGNFoZFKdkQdypPIf2ARLnNY5I-Ntxtc2b3zjNpvvvZ7Rx9FE5DjthHs-4uh8YWWlWY-IFolvAYGVyIzwlIESvzV6RMSEcUQJ6HRMiQ90fghHM7ZxG-7G7xlSYczbeuniX1DT2NiJsIPbgm_7ILXSHcFnc" 
                />
                <div className="absolute top-4 right-4 bg-tertiary-container text-on-tertiary-container text-xs font-bold px-3 py-1 rounded-full">Ministerio</div>
              </div>
              <div className="p-8 space-y-4">
                <h3 className="font-headline text-2xl font-black text-primary group-hover:text-secondary transition-colors">Liderazgo Eclesial</h3>
                <p className="text-on-surface-variant leading-relaxed">Preparación práctica para el servicio en la iglesia local, enfocada en la ética ministerial y visión pastoral.</p>
                <div className="pt-4 flex items-center justify-between border-t border-outline-variant/30">
                  <span className="flex items-center gap-1 text-sm text-outline font-medium">
                    <Clock className="w-4 h-4" /> 8 Semanas
                  </span>
                  <button className="text-primary font-bold hover:text-secondary flex items-center gap-1 group/btn">
                    Ver Detalle
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-24 bg-surface-container-low">
        <div className="max-w-[1440px] mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 pt-8">
                <div className="bg-surface-container-lowest p-1 rounded-lg shadow-sm">
                  <img className="w-full h-64 object-cover rounded-lg" alt="student reading" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYEoGKiSmnSlbt9h0LA6QiK06LLBmgFqPSJu4w4Hy6mwsq3B2d9Uvyjz3w4gRRLcI4d98jvkr0lOCIsTIdFJ1_LurYyc5ZGcS9Kr-SoBSgCVJxBDbjLE3UkC1SEyvUzkukLFigeFGbmKOU8Q78zKERk9Am1LTIGaRTdam3mR6VcKB-6Jup-YjwVX8Gt04s_-3hz_vjcBJ0KrYquIfOaLOtb_IY50lHkadSmgSIiALaFiBOWhSJ9H9G5ZbDKaxRnGJCH4VUF-q89NS0"/>
                </div>
                <div className="bg-surface-container-lowest p-1 rounded-lg shadow-sm">
                  <img className="w-full h-48 object-cover rounded-lg" alt="group discussion" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARg9Mt_OQif6Dq7Zu5j3iU-Lm9ymMpySx4UOIMkWFo_HdmAj-nBgOpy74SWqCJetv9NB2uqpH0ALN0Yl-7LZi8r6IZVqsOpFEdKpooQ7iywGDcrWYM681oWeT01EaTrJ6_EMa_eR_YUW9lJM_aZdQjGLvBTuvUMlZ5OzTZPSkgprghywdLAfA0kcZvOCH6_Z9RUYlx-iWp5Y82QMYI2zN6s3D5RnxQkNsCjxW2ruiYyLgtAvjF3pYoBW1bcLXKTocOO7TETTMSqVkW"/>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-surface-container-lowest p-1 rounded-lg shadow-sm">
                  <img className="w-full h-48 object-cover rounded-lg" alt="woman studying" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZbMhHCYROYg0zwuk_AeYqegKbPWEplgyb0MshcbK4iAWQAfufE2C52QsLELXJKaXtbCPKC0Z_ShIrDx2A2rwME6PSfhBdVQODaj5RSDZmd6XWqA49uCkCxX6RkJdNpmTmV2tIB6rsp2dn89LBIlvu4c7hd6RxIQ2HZW3U9RmHvNbLAXtMhi87e9c0uBAXNDCgE-Sx-2ZVMKtLgtRtfHUY2wOaVPT2gxGJU3SSe9ZHK6rDa8g4aeT0R2nKdY6_Sx8houyjMYmik-M9"/>
                </div>
                <div className="bg-surface-container-lowest p-1 rounded-lg shadow-sm">
                  <img className="w-full h-64 object-cover rounded-lg" alt="taking notes" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5HtFTiEl9G3HizDrD4fWnTBWzSoRSePhSlmZWIxdrdfqaWIbK_WXDo-crgDyklAa_uDVMFxqPTyt_0Q3Z1H4-Dyq8zNFIpcx30itrqEjb8IuubRZEgaXLs-6iiXUgdR2hyWuvPuosnKelyV8t1w_tlJ_KmB5oQoJwvn5LLHanr34f3-MgAzqpB0Fm_qGXv8UvL360qsIUV2YOp6eM3lgSjzMowou4VBAt7dgtaOeKoWKt5s7yrpI8VkwPQ3SneCj2VM28s2bVdc7m"/>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-8">
            <h2 className="font-headline text-4xl md:text-5xl font-black text-primary tracking-tight">Formación que no se detiene</h2>
            <p className="text-on-surface-variant text-xl leading-relaxed">Únete a una comunidad de más de 5,000 estudiantes alrededor del mundo que han decidido profundizar en su fe a través de nuestra plataforma virtual.</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-secondary fill-secondary/20" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-primary">Acceso de por vida</h4>
                  <p className="text-on-surface-variant">Consulta el material de tus cursos en cualquier momento y desde cualquier dispositivo.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-secondary fill-secondary/20" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-primary">Mentoria Personalizada</h4>
                  <p className="text-on-surface-variant">Nuestros tutores te acompañarán en cada paso de tu aprendizaje doctrinal.</p>
                </div>
              </li>
            </ul>
            <div className="pt-4">
              <button className="bg-primary text-white px-10 py-4 rounded-lg font-headline font-bold text-lg hover:bg-tertiary transition-all shadow-xl">
                Empieza hoy mismo
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
