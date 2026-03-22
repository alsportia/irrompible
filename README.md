# Unbreakable — App de Entrenamiento

Aplicación web progresiva (PWA) de entrenamiento personal diseñada para usarse principalmente en **iPhone SE 3ª generación** (375×667px), aunque responsive para cualquier dispositivo móvil.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Lenguaje | TypeScript |
| Base de datos | SQLite3 (`data/unbreakable.db`) |
| Estilos | CSS puro con variables CSS (sin Tailwind) |
| Iconos | lucide-react |
| Fuentes | Outfit (display), Geist Sans (body) |
| Deploy | Railway (auto-deploy desde GitHub `main`) |
| Build | Webpack explícito (`--webpack`, sin Turbopack) |

### Notas de estilo importantes

- **No se usa Tailwind**. Todo el estilo es inline styles con variables CSS o las pocas clases globales definidas en `globals.css`.
- Variables CSS disponibles: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--accent-primary`, `--text-secondary`, `--border-subtle`, `--glass-bg`, `--glass-border`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--success`, `--danger`, `--warning`.
- Clases CSS globales: `btn-primary`, `btn-primary glow`, `glass-panel`, `card`, `heading-display`, `animate-fade-in`.
- Layout de pantalla completa: usar `height: 100dvh` (no `100vh`) para respetar la barra de navegación en iOS.
- `--bg-primary` es `transparent` — para paneles con contenido usar `var(--glass-bg)` con `backdropFilter: 'blur(12px)'`.

---

## Estructura del proyecto

```
unbreakable-app/
├── data/                           # Montado como Railway Volume en producción
│   └── unbreakable.db              # Base de datos SQLite (ignorada en git)
├── seed.db                         # Snapshot inicial de la DB (incluida en git)
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout raíz (fuentes, WakeLock)
│   │   ├── page.tsx                # Home — lista de sesiones (requiere ?programId=X)
│   │   ├── globals.css             # Variables CSS y clases globales
│   │   ├── actions.ts              # Server Actions
│   │   ├── admin/
│   │   │   ├── page.tsx            # Panel admin — 4 botones + usuarios pendientes
│   │   │   ├── users/page.tsx      # Gestión de usuarios
│   │   │   ├── programs/page.tsx   # Gestión de programas (importar/exportar/editar)
│   │   │   ├── exercises/page.tsx  # Gestión de ejercicios
│   │   │   └── maintenance/page.tsx # Backup y restauración de DB
│   │   ├── programs/
│   │   │   └── page.tsx            # Selector de programas post-login
│   │   ├── session/[id]/
│   │   │   └── page.tsx            # Server Component — fetch datos sesión
│   │   └── workflow/[id]/
│   │       └── page.tsx            # Server Component — fetch ejercicios + aplica energía
│   ├── app/api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── validate/route.ts
│   │   ├── programs/route.ts       # GET — programas del usuario autenticado
│   │   ├── users/route.ts
│   │   ├── public/programs/route.ts
│   │   ├── calendar/route.ts
│   │   └── admin/
│   │       ├── programs/route.ts               # GET/POST — todos los programas
│   │       ├── programs/[id]/route.ts           # GET/PATCH/DELETE — programa concreto
│   │       ├── programs/export/route.ts         # GET — exportar programa a Excel
│   │       ├── programs/import/route.ts         # POST — importar programa desde Excel
│   │       ├── exercises/route.ts               # GET — catálogo de ejercicios (límite 2000)
│   │       ├── exercises/[id]/route.ts
│   │       ├── users/route.ts
│   │       ├── users/[id]/route.ts
│   │       ├── users/[id]/role/route.ts
│   │       ├── users/[id]/status/route.ts
│   │       ├── users/[id]/programs/route.ts
│   │       ├── backup/route.ts
│   │       └── restore/route.ts
│   ├── components/
│   │   ├── LoginSelector.tsx       # Pantalla de login por email
│   │   ├── ProgramSelector.tsx     # Selector de programas post-login
│   │   ├── HomeClient.tsx          # Lista de sesiones del programa activo
│   │   ├── SessionClient.tsx       # Resumen de sesión + selector de energía
│   │   ├── WorkoutTracker.tsx      # Pantalla de entrenamiento activo
│   │   ├── CachedVideo.tsx         # Reproductor de vídeo (YouTube / local)
│   │   ├── VideoPrefetcher.tsx     # Pre-descarga vídeos en segundo plano
│   │   ├── CalendarView.tsx        # Vista de calendario de entrenamientos
│   │   ├── WakeLock.tsx            # Mantiene pantalla activa (global, en layout)
│   │   ├── AdminClient.tsx         # Panel admin principal (nav + pendientes)
│   │   ├── AdminUsers.tsx          # Gestión completa de usuarios
│   │   ├── AdminPrograms.tsx       # Gestión de programas (lista + wizard + import/export)
│   │   ├── AdminExercises.tsx      # Gestión de ejercicios (CRUD + paginación)
│   │   ├── AdminExercisesPage.tsx  # Wrapper de AdminExercises con header/volver
│   │   ├── AdminMaintenance.tsx    # Backup y restauración de DB
│   │   ├── ProgramWizard.tsx       # Wizard 4 pasos para crear/editar programas
│   │   └── ProgramImportExport.tsx # Botones importar/exportar + modal de conflicto
│   └── lib/
│       ├── db.ts                   # Wrapper SQLite3 — init lazy, copia seed si vacío
│       ├── migrate.ts              # Migraciones de DB
│       ├── adminAuth.ts            # Helper requireAdmin()
│       ├── userContext.tsx         # Context de usuario (id, name, email, role)
│       ├── useBeep.ts              # Hook Web Audio API para pitidos de cuenta atrás
│       ├── videoCache.ts           # Caché de vídeos en IndexedDB
│       ├── programExporter.ts      # Genera Excel 4 hojas desde un programa
│       └── programImporter.ts      # Parsea y valida Excel para importar programa
└── ../scripts/                     # Scripts Python de extracción de datos
```

---

## Base de datos

### Persistencia en producción

La carpeta `data/` está montada como un **Railway Volume** (`/app/data`). Al arrancar, `db.ts` comprueba si `unbreakable.db` existe. Si no, copia `seed.db` automáticamente.

`data/unbreakable.db` está en `.gitignore`. `seed.db` no.

### Actualizar el seed

```bash
cp data/unbreakable.db seed.db
git add seed.db
git commit -m "Update seed DB"
git push
```

### Esquema actual

```sql
users (id, name, email UNIQUE, role, status)
programs (id, name UNIQUE, description, image_url)
user_programs (user_id, program_id)
sessions (id, session_code UNIQUE, name, description, program_id)
exercises (id, name, video_url, video_url_yt, description, muscles, joints, easier_id, harder_id)
session_exercises (id, session_id, ex_id, block, block_type, set_number, ex_order, reps, tiempo_ej)
energy_levels (id, code, label, pct)
feeling_levels (id, score, label)
workout_logs (id, session_id, user_id, energy_level_id, feeling_level_id, duration, completed_at, created_at)
workout_sets (id, workout_log_id, exercise_id, reps_done, weight, time_taken)
```

### Programas disponibles (seed)

| ID | Nombre | Sesiones |
|---|---|---|
| 1 | Unbreakable | 50 |
| 23 | Elite | 69 |
| 84 | Primal | 20 |
| 87 | Ring Master | 40 |
| 88 | Aurum | 12 |
| 311 | Vital | 30 |

Los IDs de ejercicios van de 5216 a 7020.

---

## Flujo de navegación

```
LoginSelector (email)
  └─► ProgramSelector (/programs)
        ├─► [Admin] /admin
        │     ├─► /admin/users        — gestión de usuarios
        │     ├─► /admin/programs     — gestión de programas
        │     ├─► /admin/exercises    — gestión de ejercicios
        │     └─► /admin/maintenance  — backup / restore
        └─► Home (/?programId=X)      — lista de sesiones del programa
              └─► /session/[id]       — resumen + selector de energía
                    └─► /workflow/[id] — entrenamiento activo
                          └─► valoración + fin → vuelve a /session/[id]
```

> La home **requiere** `?programId=X`. Sin él redirige a `/programs` para evitar mezclar sesiones de distintos programas.

---

## Autenticación y roles

- Login por email en `LoginSelector` → `POST /api/auth/login`.
- Usuario guardado en `localStorage` como `{ id, name, email, role }`.
- Al recargar, `GET /api/auth/validate` verifica que el usuario existe en DB.
- `user` — acceso solo a sus programas asignados.
- `admin` — acceso a todos los programas + panel de administración.
- Rutas `/api/admin/*` protegidas con `requireAdmin()` (header `x-user-id`).
- Registro de nuevos usuarios: quedan en estado `pending` hasta que un admin los aprueba.

---

## Funcionalidades

### Selector de energía

| Nivel | % aplicado |
|---|---|
| ¡A tope! | 100% |
| Bien | 75% |
| Cansado | 50% |
| Muy Cansado | 25% |

Escala reps y número de sets antes de iniciar el entrenamiento.

### Entrenamiento activo (WorkoutTracker)
- Cuenta atrás de 5s con círculo SVG animado y pitidos (Web Audio API).
- Vídeo a pantalla completa con todos los iframes pre-renderizados.
- Timer con barra de progreso para ejercicios con tiempo.
- Pitidos de aviso en los últimos 5 segundos.
- Botones Anterior / Completar y Siguiente.
- Pantalla de valoración (feeling) al finalizar.
- Guardado de progreso en `localStorage` para reanudar sesiones interrumpidas.

### Lista de sesiones (HomeClient)
- Todas las sesiones del programa en orden, sin paginación.
- Sesiones completadas marcadas con ✓ verde y fondo más oscuro.
- Botón 🔄 en cada sesión completada para desmarcarla (borra el `workout_log`).
- Auto-scroll a la primera sesión pendiente al cargar.

### Gestión de programas (admin)
- Wizard de 4 pasos para crear y editar programas (nombre/desc, sesiones, ejercicios por sesión, asignación de usuarios).
- Exportar programa a Excel (4 hojas: `Programa`, `Sesiones`, `Ejercicios`, `Session_Exercises`).
- Importar programa desde Excel con validación y modal de conflicto de nombre (renombrar o sobreescribir con backup automático).
- `block_type` acepta valores legacy: `normal`, `circuit`, `superset`, `super_series`, `tabata`, `interval_repetitions`, etc.

### Otras
- Caché de vídeos en IndexedDB (`VideoPrefetcher`).
- Wake Lock global para evitar que el móvil se bloquee durante el entrenamiento.
- Vista de calendario de entrenamientos desde el home.
- Backup y restauración de la DB desde el panel de mantenimiento.

---

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000
```

> El servidor escucha en `0.0.0.0` para ser accesible desde otros dispositivos en la misma red.

---

## Deploy

Push a `main` dispara auto-deploy en Railway.

```bash
git add .
git commit -m "descripción"
git push origin main
```

---

## Scripts de datos

Ubicados en `../scripts/` (fuera del repo de la app).

```bash
python3 scripts/extract_data.py      # Unbreakable desde Excel
python3 scripts/extract_elite.py     # Elite desde Excel
python3 scripts/extract_primal.py    # Primal desde Excel
```

Requieren: `pip install pandas openpyxl`

---

## Convenciones de código

- Componentes interactivos son Client Components (`"use client"`).
- Las páginas son Server Components que hacen fetch y pasan props a los Client Components.
- `params` y `searchParams` son Promises en Next.js 15+ y deben awaitearse.
- No se usa `useEffect` para fetch de datos — todo el fetching es server-side en las páginas.
- El idioma de la UI es **español**.
