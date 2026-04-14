# Unbreakable — App de Entrenamiento

Aplicación web progresiva (PWA) de entrenamiento personal. Diseñada para usarse principalmente en **iPhone SE 3ª generación** (375×667px), aunque responsive para cualquier dispositivo móvil. Desplegada en Railway con SQLite como base de datos persistente.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15+ (App Router, React 19) |
| Lenguaje | TypeScript |
| Base de datos | SQLite3 (`data/unbreakable.db`) via `sqlite3` npm |
| Estilos | CSS puro con variables CSS (sin Tailwind) |
| Iconos | lucide-react |
| Fuentes | Outfit (display), Geist Sans (body) |
| Deploy | Railway (auto-deploy desde GitHub `main`) |
| Build | Webpack explícito (`--webpack`, sin Turbopack) |
| Excel | SheetJS (`xlsx`) para importar/exportar programas |

---

## Convenciones críticas de código

- **No se usa Tailwind**. Todo el estilo es `style={{}}` inline con variables CSS o las pocas clases globales de `globals.css`.
- Variables CSS: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--accent-primary`, `--text-secondary`, `--border-subtle`, `--glass-bg`, `--glass-border`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--success`, `--danger`, `--warning`.
- Clases CSS globales: `btn-primary`, `btn-primary glow`, `glass-panel`, `card`, `heading-display`, `animate-fade-in`.
- `height: 100dvh` (no `100vh`) para respetar la barra de navegación en iOS.
- `--bg-primary` es `transparent` — para paneles con contenido usar `var(--glass-bg)` con `backdropFilter: 'blur(12px)'`.
- Componentes interactivos son Client Components (`"use client"`).
- Las páginas son Server Components que hacen fetch y pasan props a los Client Components.
- `params` y `searchParams` son Promises en Next.js 15+ y deben awaitearse.
- No se usa `useEffect` para fetch de datos — todo el fetching es server-side en las páginas.
- El idioma de la UI es **español**.
- Autenticación: el `userId` se envía en el header `x-user-id` en todas las peticiones autenticadas.

---

## Estructura del proyecto

```
unbreakable-app/
├── data/                              # Montado como Railway Volume en producción
│   └── unbreakable.db                 # Base de datos SQLite (ignorada en git)
├── seed.db                            # Snapshot inicial de la DB (incluida en git)
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── videos/                        # Vídeos locales de ejercicios (.3gpp)
│   ├── icon-192.png
│   └── icon-512.png
├── scripts/                           # Scripts Node/TypeScript de mantenimiento de datos
│   ├── reimport-from-excel.ts         # Reimporta sesiones desde los Excel originales
│   ├── migrate-to-blocks.ts           # Migración legacy session_exercises → sets/set_exercises
│   ├── apply-video-corrections.ts     # Aplica correcciones de URLs de YouTube
│   ├── generate-video-conflicts-excel.ts
│   └── check-video-conflicts.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Layout raíz (fuentes, WakeLock, UserProvider)
│   │   ├── page.tsx                   # Home — lista de sesiones (requiere ?programId=X)
│   │   ├── globals.css                # Variables CSS y clases globales
│   │   ├── actions.ts                 # Server Actions (createWorkoutLog, saveWorkoutSet, etc.)
│   │   ├── admin/
│   │   │   ├── page.tsx               # Panel admin — nav + usuarios pendientes
│   │   │   ├── users/page.tsx         # Gestión de usuarios
│   │   │   ├── programs/page.tsx      # Gestión de programas
│   │   │   ├── exercises/page.tsx     # Gestión de ejercicios
│   │   │   └── maintenance/page.tsx   # Backup y restauración de DB
│   │   ├── exercises/page.tsx         # Catálogo público de ejercicios
│   │   ├── programs/page.tsx          # Selector de programas post-login
│   │   ├── register/page.tsx          # Registro de nuevos usuarios
│   │   ├── session/[id]/page.tsx      # Server Component — fetch datos sesión
│   │   └── workflow/[id]/page.tsx     # Server Component — fetch ejercicios + aplica energía
│   ├── app/api/
│   │   ├── auth/
│   │   │   ├── login/route.ts         # POST — login por email
│   │   │   ├── register/route.ts      # POST — registro (status: pending)
│   │   │   └── validate/route.ts      # GET — valida sesión activa
│   │   ├── programs/route.ts          # GET — programas del usuario autenticado
│   │   ├── users/route.ts             # GET/POST — usuarios
│   │   ├── public/programs/route.ts   # GET — programas públicos (para registro)
│   │   ├── calendar/route.ts          # GET — historial de entrenamientos
│   │   └── admin/
│   │       ├── programs/route.ts               # GET/POST
│   │       ├── programs/[id]/route.ts           # GET/PUT/DELETE
│   │       ├── programs/export/route.ts         # GET — exportar a Excel
│   │       ├── programs/import/route.ts         # POST — importar desde Excel
│   │       ├── exercises/route.ts               # GET/POST
│   │       ├── exercises/[id]/route.ts          # PATCH/DELETE
│   │       ├── users/route.ts                   # GET/POST
│   │       ├── users/[id]/route.ts              # PATCH/DELETE
│   │       ├── users/[id]/role/route.ts         # PATCH — cambiar rol
│   │       ├── users/[id]/status/route.ts       # PATCH — aprobar/rechazar
│   │       ├── users/[id]/programs/route.ts     # GET/PUT — programas del usuario
│   │       ├── backup/route.ts                  # GET — descargar backup DB
│   │       ├── restore/route.ts                 # POST — restaurar DB desde backup
│   │       └── reset-db/route.ts                # POST — reset a seed
│   ├── components/
│   │   ├── LoginSelector.tsx          # Pantalla de login por email
│   │   ├── RegisterForm.tsx           # Formulario de registro
│   │   ├── ProgramSelector.tsx        # Selector de programas post-login
│   │   ├── HomeClient.tsx             # Lista de sesiones del programa activo
│   │   ├── SessionClient.tsx          # Resumen de sesión + selector de energía
│   │   ├── WorkoutTracker.tsx         # Pantalla de entrenamiento activo
│   │   ├── CachedVideo.tsx            # Reproductor de vídeo (YouTube / local)
│   │   ├── VideoPrefetcher.tsx        # Pre-descarga vídeos en segundo plano
│   │   ├── CalendarView.tsx           # Vista de calendario de entrenamientos
│   │   ├── ExercisesClient.tsx        # Catálogo de ejercicios con búsqueda
│   │   ├── WakeLock.tsx               # Mantiene pantalla activa (global, en layout)
│   │   ├── AdminClient.tsx            # Panel admin principal (nav + pendientes)
│   │   ├── AdminUsers.tsx             # Gestión completa de usuarios
│   │   ├── AdminPrograms.tsx          # Gestión de programas (lista + wizard + import/export)
│   │   ├── AdminExercises.tsx         # Gestión de ejercicios (CRUD + paginación)
│   │   ├── AdminExercisesPage.tsx     # Wrapper de AdminExercises con header/volver
│   │   ├── AdminMaintenance.tsx       # Backup y restauración de DB
│   │   ├── ProgramWizard.tsx          # Wizard 4 pasos para crear/editar programas
│   │   └── ProgramImportExport.tsx    # Botones importar/exportar + modal de conflicto
│   ├── lib/
│   │   ├── db.ts                      # Wrapper SQLite3 — init lazy, copia seed si vacío
│   │   ├── migrate.ts                 # Migraciones incrementales al arrancar
│   │   ├── adminAuth.ts               # Helper requireAdmin()
│   │   ├── userContext.tsx            # Context de usuario (id, name, email, role)
│   │   ├── useBeep.ts                 # Hook Web Audio API para pitidos de cuenta atrás
│   │   ├── videoCache.ts              # Caché de vídeos en IndexedDB
│   │   ├── programExporter.ts         # Genera Excel 5 hojas desde un programa
│   │   └── programImporter.ts         # Parsea y valida Excel para importar programa
│   └── types/
│       └── index.ts                   # Tipos TypeScript compartidos
└── ../recursos/                       # Archivos Excel y vídeos originales (fuera del repo)
    └── Programas Mammoth Hunters/
        ├── Unbreakable.xlsx
        ├── Elite.xlsx
        ├── Primal.xlsx
        ├── Ring Master.xlsx
        ├── Aurum.xlsx
        └── Vídeos Ejercicios/         # 571 vídeos .3gpp
```

---

## Base de datos

### Persistencia en producción

La carpeta `data/` está montada como un **Railway Volume** (`/app/data`). Al arrancar, `db.ts` comprueba si `unbreakable.db` existe y tiene más de 4KB. Si no, copia `seed.db` automáticamente.

`data/unbreakable.db` está en `.gitignore`. `seed.db` no.

### Actualizar el seed

```bash
cp data/unbreakable.db seed.db
git add seed.db
git commit -m "Update seed DB"
git push
```

### Convención de nombres de columnas

Todos los campos PK y FK siguen la convención `tabla_id`:
- PKs: `users_id`, `programs_id`, `sessions_id`, `exercises_id`, `energy_levels_id`, `feeling_levels_id`, `workout_logs_id`, `workout_sets_id`
- Las tablas `sets` y `set_exercises` ya seguían la convención: `set_id`, `set_exercise_id`
- FKs auto-referenciales en `exercises`: `easier_exercises_id`, `harder_exercises_id`

Las migraciones usan `ALTER TABLE ... RENAME COLUMN` (idempotente) para renombrar columnas en BDs existentes.

### Esquema completo

```sql
-- Usuarios
users (users_id PK, name, email UNIQUE, role DEFAULT 'user', status DEFAULT 'active', password_hash, created_at)

-- Programas y acceso
programs (programs_id PK, name UNIQUE, description, image_url)
user_programs (users_id FK, programs_id FK)  -- PK compuesta

-- Sesiones y estructura de entrenamiento
sessions (sessions_id PK, session_code UNIQUE, name, description, programs_id FK)
sets (set_id PK, sessions_id FK, description, block_label, block_type, block_order)
set_exercises (set_exercise_id PK, set_id FK, set_number, exercises_id FK, ex_order, reps, tiempo_ej, peso)

-- Catálogo de ejercicios
exercises (exercises_id PK, name, video_url, video_url_yt, description, muscles, joints,
           easier_exercises_id FK, harder_exercises_id FK, met)

-- Lookup tables
energy_levels (energy_levels_id PK, code, label, pct)
feeling_levels (feeling_levels_id PK, score, label)

-- Logs de entrenamiento
workout_logs (workout_logs_id PK, sessions_id FK, users_id FK, energy_levels_id FK,
              feeling_levels_id FK, duration, completed_at, created_at)
workout_sets (workout_sets_id PK, workout_logs_id FK, exercises_id FK, set_number,
              reps_done, weight, time_taken)
```

### Programas disponibles (seed)

| programs_id | Nombre | Sesiones |
|---|---|---|
| 1 | Unbreakable | 50 |
| 23 | Elite | 69 |
| 84 | Primal | 20 |
| 87 | Ring Master | 40 |
| 88 | Aurum | 12 |
| 311 | Vital | 30 |

Los `exercises_id` van de 5216 a 7020.

### Modelo de bloques (sets / set_exercises)

El modelo de datos usa **bloques** como unidad de repetición:

- Un bloque (`sets`) agrupa ejercicios y declara cuántas veces se repite (`block_order` define su posición en la sesión).
- Cada ejercicio dentro del bloque (`set_exercises`) tiene una fila por cada serie (`set_number`).
- `block_type` acepta: `normal`, `circuit`, `superset`, `super_series`, `tabata`, `interval_repetitions`, `interval_repetitions_with_pause`, `to_the_one`, `spartan_race`, `paleo_run`.
- La expansión a lista plana (ejercicio × serie) se hace en memoria en `workflow/[id]/page.tsx` con `applyEnergy()`.

### Migraciones

`src/lib/migrate.ts` se ejecuta al arrancar la app. Es idempotente:
- Usa `CREATE TABLE IF NOT EXISTS` para tablas nuevas.
- Usa `addColumnIfNotExists()` para columnas nuevas.
- Usa `renameColumnIfExists()` para renombrar columnas (migración de nombres de PK/FK).

---

## Flujo de navegación

```
LoginSelector (email)
  └─► ProgramSelector (/programs)
        ├─► [Admin] /admin
        │     ├─► /admin/users        — gestión de usuarios (aprobar, roles, programas)
        │     ├─► /admin/programs     — gestión de programas (wizard, import/export)
        │     ├─► /admin/exercises    — gestión de ejercicios (CRUD)
        │     └─► /admin/maintenance  — backup / restore / reset DB
        └─► Home (/?programId=X)      — lista de sesiones del programa
              └─► /session/[id]       — resumen + selector de energía
                    └─► /workflow/[id] — entrenamiento activo
                          └─► valoración (feeling) + fin → vuelve a /session/[id]
```

La home **requiere** `?programId=X`. Sin él redirige a `/programs`.

---

## Autenticación y roles

- Login por **email + contraseña** en `LoginSelector` → `POST /api/auth/login`.
- Las contraseñas se almacenan hasheadas con **bcrypt** en el campo `password_hash` de `users`.
- Usuario guardado en `localStorage` como `{ id, name, email, role }`.
- Al recargar, `GET /api/auth/validate` (header `x-user-id`) verifica que el usuario existe en DB. Si no, limpia el contexto.
- Registro: `POST /api/auth/register` → estado `pending`. Un admin debe aprobar desde `/admin`.
- `user` — acceso solo a sus programas asignados.
- `admin` — acceso a todos los programas + panel de administración.
- Rutas `/api/admin/*` protegidas con `requireAdmin()` que verifica `role = 'admin'` en BD (nunca confía en el cliente).

### Contraseñas por defecto

Al arrancar, la migración asigna automáticamente contraseñas a los usuarios que no tienen ninguna:
- **Usuarios existentes sin contraseña**: su `name` se usa como contraseña inicial.
- **Admin seed** (si no existe ningún admin): se crea con email `admin@unbreakable.app` y contraseña `admin1234`, configurables via variables de entorno `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD`.

### Cambio de contraseña

- **Usuario**: botón con icono de llave junto a "Cerrar sesión" en la pantalla de programas. Requiere introducir la contraseña actual.
- **Admin**: desde el panel de gestión de usuarios, editar usuario → campo "Nueva contraseña" (dejar vacío para no cambiar).
- No hay restricción de longitud mínima — se permite contraseña vacía.

### Variables de entorno relevantes

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `ADMIN_EMAIL` | Email del admin seed | `admin@unbreakable.app` |
| `ADMIN_NAME` | Nombre del admin seed | `Admin` |
| `ADMIN_PASSWORD` | Contraseña del admin seed | `admin1234` |
| `TURSO_DATABASE_URL` | URL de la BD Turso (producción) | — |
| `TURSO_AUTH_TOKEN` | Token de autenticación Turso | — |

### Estados de usuario

| status | descripción |
|---|---|
| `active` | Usuario activo, puede hacer login |
| `pending` | Registro pendiente de aprobación por admin |
| `rejected` | Rechazado — el registro se elimina de la BD |

---

## API — Referencia completa

### Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Body: `{email, password}`. Devuelve `{id, name, email, role}` |
| POST | `/api/auth/register` | Body: `{name, email, programIds[]}`. Crea usuario en estado `pending` |
| GET | `/api/auth/validate` | Header `x-user-id`. Devuelve `{valid: true/false}` |
| POST | `/api/auth/change-password` | Header `x-user-id`. Body: `{currentPassword, newPassword}` |

### Programas (usuario)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/programs` | Header `x-user-id`. Devuelve programas asignados al usuario |
| GET | `/api/public/programs` | Sin auth. Lista todos los programas (para registro) |

### Admin — Usuarios

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/users` | Lista todos los usuarios |
| POST | `/api/admin/users` | Crea usuario. Body: `{name, email, password}` |
| PATCH | `/api/admin/users/[id]` | Edita nombre, email y opcionalmente contraseña. Body: `{name, email, password?}` |
| DELETE | `/api/admin/users/[id]` | Elimina usuario |
| PATCH | `/api/admin/users/[id]/role` | Body: `{role: 'admin'|'user'}` |
| PATCH | `/api/admin/users/[id]/status` | Body: `{status: 'active'|'rejected'}` |
| GET | `/api/admin/users/[id]/programs` | Programas asignados al usuario |
| PUT | `/api/admin/users/[id]/programs` | Body: `{programIds[]}`. Reemplaza asignaciones |

### Admin — Programas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/programs` | Lista todos los programas con nº de sesiones |
| POST | `/api/admin/programs` | Crea programa con sesiones y bloques |
| GET | `/api/admin/programs/[id]` | Programa completo con sesiones, bloques y ejercicios |
| PUT | `/api/admin/programs/[id]` | Actualiza programa (genera backup Excel previo) |
| DELETE | `/api/admin/programs/[id]` | Elimina programa en cascada |
| GET | `/api/admin/programs/export?id=X` | Descarga Excel del programa |
| GET | `/api/admin/programs/export?template=true` | Descarga plantilla Excel vacía |
| POST | `/api/admin/programs/import` | Importa programa desde Excel (multipart/form-data) |

### Admin — Ejercicios

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/exercises?search=&page=&limit=` | Lista ejercicios paginados (máx 2000) |
| POST | `/api/admin/exercises` | Crea ejercicio |
| PATCH | `/api/admin/exercises/[id]` | Edita ejercicio |
| DELETE | `/api/admin/exercises/[id]` | Elimina ejercicio (falla si está en uso) |

### Admin — Mantenimiento

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/backup` | Descarga backup base64 de la BD |
| POST | `/api/admin/restore` | Restaura BD desde backup base64 |
| POST | `/api/admin/reset-db` | Resetea BD al seed (genera backup previo) |

---

## Flujo de un entrenamiento

```
1. Usuario elige sesión → SessionClient
2. Elige nivel de energía → redirige a /workflow/[sessionId]?energy=X&userId=Y&energyLabel=Z
3. WorkflowPage (server):
   - Consulta sets JOIN set_exercises JOIN exercises WHERE sessions_id = ?
   - Aplica applyEnergy(exercises, pct): filtra series y reduce reps según pct
   - Crea workout_log → createWorkoutLog(sessionId, userId, energyLabel)
   - Renderiza WorkoutTracker con logId + lista expandida de ejercicios
4. WorkoutTracker (client):
   - Por cada ejercicio: carga último peso → getLastWeight(userId, exercises_id)
   - Cuenta atrás de 5s con círculo SVG animado + pitidos Web Audio API
   - Timer con barra de progreso para ejercicios con tiempo
   - Al completar: saveWorkoutSet(logId, exercises_id, set_number, null, peso, timeTaken)
   - Al finalizar todos: finishWorkoutLog(logId, duration, feelingScore, feelingLabel)
5. Progreso guardado en localStorage para reanudar sesiones interrumpidas
```

### Selector de energía

| Nivel | pct | Efecto |
|---|---|---|
| ¡A tope! | 1.0 | Sin cambios |
| Bien | 0.75 | 75% de series y reps |
| Cansado | 0.50 | 50% de series y reps |
| Muy Cansado | 0.25 | 25% de series y reps |

`applyEnergy` filtra `set_number <= ceil(maxSet * pct)` y escala reps numéricas.

---

## Importación/Exportación de programas (Excel)

### Formato del archivo Excel (5 hojas)

| Hoja | Columnas clave |
|---|---|
| `Programa` | nombre, descripcion, imagen_url |
| `Sesiones` | id_sesion (interno), numero_sesion, nombre_sesion |
| `Ejercicios` | id_ejercicio (= exercises_id en DB), nombre, musculos, articulaciones, video_url, video_url_yt |
| `Sets` | set_id, id_sesion, description, block_label, block_type, num_sets, block_order |
| `Set_Exercises` | set_exercise_id, set_id, id_ejercicio, ex_order, repeticiones, tiempo |

### Flujo de importación

1. Validar estructura (5 hojas, columnas obligatorias).
2. Verificar referencias cruzadas entre hojas.
3. Si el nombre del programa ya existe → devolver `ImportConflict` (el cliente muestra modal).
4. Si `overwrite=true` → generar backup Excel del programa existente, eliminarlo.
5. Crear ejercicios nuevos (por nombre), programa, sesiones, sets y set_exercises.

### Flujo de exportación

1. Consultar programa con sesiones, sets, set_exercises y todos los ejercicios del catálogo.
2. Generar workbook con 5 hojas usando SheetJS.
3. Devolver buffer como descarga directa.

### Gestión de conflictos y backups

Los backups se generan en memoria como Excel y se ofrecen para descarga inmediata. No se persisten en el servidor. El flujo es:
1. Admin importa → conflicto detectado → servidor genera backup base64 del programa existente.
2. Cliente descarga el backup automáticamente.
3. Admin confirma sobreescritura → `POST /api/admin/programs/import` con `overwrite=true`.

---

## Wizard de programas (ProgramWizard)

Wizard de 4 pasos para crear y editar programas:

1. **Datos del programa** — nombre (obligatorio), descripción, imagen URL.
2. **Sesiones** — añadir/eliminar sesiones, navegar entre ellas.
3. **Bloques y ejercicios** — por sesión: añadir bloques con `block_label`, `block_type`, `num_sets`, `description`; añadir ejercicios a cada bloque con `reps` y `tiempo_ej`; reordenar con ↑↓.
4. **Resumen** — vista previa antes de guardar.

Al guardar llama a `POST /api/admin/programs` (nuevo) o `PUT /api/admin/programs/[id]` (edición, genera backup previo).

---

## Tipos TypeScript principales (`src/types/index.ts`)

```typescript
// Programa
interface Program { id: number; name: string; description?: string | null; image_url?: string | null; }

// Sesión
interface Session { id: number; session_code: string; name?: string | null; program_id: number; }

// Bloque completo (para wizard/edición)
interface BlockFull {
  set_id: number; block_label: string; block_type: string;
  num_sets: number; description: string | null; block_order: number;
  exercises: BlockExerciseFull[];
}
interface BlockExerciseFull {
  set_exercise_id: number; ex_id: number; ex_name: string;
  ex_order: number; reps: string | null; tiempo_ej: string | null;
}

// Wizard
type BlockType = 'normal' | 'circuit' | 'superset' | 'super_series' | 'tabata'
  | 'interval_repetitions' | 'interval_repetitions_with_pause'
  | 'to_the_one' | 'spartan_race' | 'paleo_run';

interface WizardBlock {
  tempId: string; block_label: string; block_type: BlockType;
  num_sets: number; description: string; block_order: number;
  exercises: WizardBlockExercise[];
}
interface WizardBlockExercise {
  tempId: string; ex_id: number; ex_name: string;
  ex_order: number; reps: string; tiempo_ej: string;
}
interface WizardSession { tempId: string; numero_sesion: number; nombre_sesion: string; blocks: WizardBlock[]; }
interface WizardState { program: { name: string; description: string; image_url: string }; sessions: WizardSession[]; activeSessionIndex: number; }

// Importación
interface ImportResult { programId: number; sessionsCreated: number; exercisesCreated: number; }
interface ImportConflict { conflict: true; existingId: number; existingName: string; }
```

---

## Wrapper de base de datos (`src/lib/db.ts`)

Singleton SQLite con métodos estáticos:

```typescript
DB.query<T>(sql, params)  // → T[]
DB.get<T>(sql, params)    // → T | undefined
DB.run(sql, params)       // → { id: number, changes: number }
DB.close()                // cierra la conexión (usado en reset-db)
```

La instancia se crea de forma lazy al primer uso (no durante el build de Next.js).

---

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000 (escucha en 0.0.0.0)
```

Para ejecutar scripts de mantenimiento:

```bash
npx tsx scripts/reimport-from-excel.ts    # Reimporta sesiones desde Excel originales
npx tsx scripts/apply-video-corrections.ts # Aplica correcciones de URLs de YouTube
```

---

## Deploy

Push a `main` dispara auto-deploy en Railway.

```bash
git add .
git commit -m "descripción"
git push origin main
```

Railway usa `nixpacks.toml` para la configuración del build. La BD persiste en el volumen montado en `/app/data`.

---

### Estadísticas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/stats/[userId]` | Estadísticas completas del usuario (resumen, historial, músculos, pesos) |
| GET | `/api/stats/[userId]/export` | Descarga CSV con historial completo. Header `x-user-id` requerido. Solo el propio usuario o un admin |
| GET | `/api/admin/stats` | Estadísticas globales: ranking de usuarios, programas más usados, actividad semanal |

### Formato del CSV exportado

Una fila por serie realizada, con estas columnas:

`Programa | Fecha | Sesión | Set | Ejercicio | Duración sesión | Repeticiones | Kilos | Tiempo ejercicio (s) | Energía | Sensación`

El archivo incluye BOM UTF-8 y la directiva `sep=,` para compatibilidad con Excel en español.

---

## Funcionalidades adicionales

- **Caché de vídeos**: `VideoPrefetcher` pre-descarga vídeos locales en IndexedDB al cargar la sesión. `CachedVideo` los sirve desde caché o cae back a YouTube.
- **Wake Lock**: `WakeLock.tsx` (global en layout) evita que el móvil se bloquee durante el entrenamiento.
- **Calendario**: `CalendarView` muestra el historial de entrenamientos completados con fecha y valoración.
- **Progresión de ejercicios**: cada ejercicio puede tener `easier_exercises_id` y `harder_exercises_id` para navegar entre variantes.
- **Peso por ejercicio**: el último peso usado se recupera automáticamente al llegar a cada ejercicio.
- **Reanudar sesión**: el progreso se guarda en `localStorage` (logId + índice actual) para reanudar si se interrumpe.
