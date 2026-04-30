# Blindaje de UI/UX - Instituto Bíblico (Sacred Archive)

Este archivo actúa como el estándar de diseño y funcionalidad intocable para el proyecto. Gemini CLI debe respetar estrictamente estas reglas en cada sesión.

## 1. Principios de Diseño
- **Estética:** Premium, Minimalista, Profesional.
- **Tipografía:**
  - Títulos: `font-headline` (Sora/Inter Black) con `tracking-tighter`.
  - Cuerpo: `font-body` (Inter/System) con lectura clara.
  - Etiquetas: `font-label` con `tracking-widest` y `uppercase`.
- **Componentes:**
  - Tarjetas (Cards): Bordes redondeados de `2.5rem` (`rounded-[2.5rem]`), bordes sutiles `border-outline-variant/10`, y sombras ambientales.
  - Botones: Bordes redondeados grandes, efectos de `active:scale-95` y sombras de alta calidad (`shadow-premium`).

## 2. Navegación y Roles (BLINDADO)
### Administrador (Admin)
- **Sidebar:** Solo debe ver [Dashboard Admin, Biblioteca, Mi Perfil].
- **Vista Admin:** Enfocada exclusivamente en la gestión de **Usuarios** (Docentes y Estudiantes en listas separadas).
- **Prohibición:** NO debe ver la gestión de materias en su sidebar para evitar saturación.

### Profesor (Teacher)
- **Sidebar:** Debe ver [Inicio, Mis Cursos, Calificaciones, Biblioteca, Mi Perfil].
- **Vista Mis Cursos:** Debe incluir siempre el botón **"Nueva Materia"** en la cabecera. Cada materia debe permitir gestionar sesiones, calificar y ver alumnos inscritos.
- **Gradebook:** Interfaz de dos columnas (Lista izquierda, Panel de evaluación derecha) con diseño expansivo y detallado.

### Estudiante (Student)
- **Sidebar:** Debe ver [Mi Dashboard, Mis Tareas, Biblioteca, Mi Perfil].
- **Mis Tareas:** Vista centralizada para ver pendientes, entregadas y calificadas.

## 3. Estándar Mobile-First (OBLIGATORIO)
- Todo componente nuevo o modificado DEBE ser funcional y estético en móviles primero.
- Uso de `hidden md:block` para tablas complejas.
- Uso de `flex-col md:flex-row` para layouts.
- Modales deben comportarse como *Drawers* (deslizan desde abajo) en móviles.

## 4. Funcionalidades Críticas
- **Paginación:** Obligatoria en todas las listas que puedan crecer (Usuarios, Materias, Grabaciones).
- **Sincronización:** El rol siempre debe leerse de la base de datos local (`public.users`), no de los metadatos de Supabase.

---
**Nota para Gemini:** No modifiques la estructura de navegación de los roles ni los estilos base definidos aquí sin confirmación explícita del usuario.
