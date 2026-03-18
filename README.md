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

---

## Estructura del proyecto

```
unbreakable-app/
├── data/
│   └── unbreakable.db          # Base de datos SQLite
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Layout raíz (migración DB, fuentes, WakeLock)
│   │   ├── page.tsx            # Home — lista de sesiones del programa
│   │   ├── globals.css         # Variables CSS y clases globales
│   │   ├── actions.ts          # Server Actions (crear log, guardar sets)
│   │   ├── admin/
│   │   │   └── page.tsx        # Panel de administración (solo rol admin)
│   │   ├── programs/
│   │   │   └── page.tsx        # Selector de programas post-login
│   │   ├── session/[id]/
│   │   │   └── page.tsx        # Server Component — fetch datos sesión
│   │   └── workflow/[id]/
│   │       └── page.tsx        # Server Component — fetch ejercicios + aplica energía
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # POST — login por email
│   │   │   └── validate/route.ts   # GET — valida sesión activa
│   │   ├── programs/route.ts       # GET — programas del usuario
│   │   ├── users/route.ts          # GET/POST — usuarios
│   │   └── admin/
│   │       ├── programs/route.ts           # GET — todos los programas
│   │       ├── users/route.ts              # GET — todos los usuarios
│   │       ├── users/[id]/role/route.ts    # PATCH — cambiar rol
│   │       └── users/[id]/programs/route.ts # GET/PUT — programas de un usuario
│   ├── components/
│   │   ├── LoginSelector.tsx   # Pantalla de login por email
│   │   ├── ProgramSelector.tsx # Selector de programas post-login
│   │   ├── AdminClient.tsx     # Panel de administración (UI)
│   │   ├── HomeClient.tsx      # Lista de sesiones del programa activo
│   │   ├── SessionClient.tsx   # Resumen de sesión + selector de energía
│   │   ├── WorkoutTracker.tsx  # Pantalla de entrenamiento activo
│   │   ├── CachedVideo.tsx     # Reproductor de vídeo (YouTube embed)
│   │   ├── VideoPrefetcher.tsx # Pre-descarga vídeos en segundo plano
│   │   ├── CalendarView.tsx    # Vista de calendario de entrenamientos
│   │   └── WakeLock.tsx        # Mantiene pantalla activa (global, en layout)
│   └── lib/
│       ├── db.ts               # Wrapper SQLite3 con métodos query/run/get
│       ├── migrate.ts          # Migraciones de DB (se ejecuta al arrancar)
│       ├── adminAuth.ts        # Helper requireAdmin() para rutas protegidas
│       ├── userContext.tsx     # Context de usuario (id, name, email, role)
│       ├── useBeep.ts          # Hook Web Audio API para pitidos de cuenta atrás
│       └── videoCache.ts       # Caché de vídeos en IndexedDB
└── recursos/                   # (fuera de unbreakable-app)
    ├── Unbreakable.xlsx        # Fuente de datos Unbreakable
    ├── Elite.xlsx              # Fuente de datos Elite
    ├── extract_data.py         # Script para poblar DB desde Unbreakable.xlsx
    └── extract_elite.py        # Script para poblar DB desde Elite.xlsx
```

---

## Base de datos

### Esquema

```sql
users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user'    -- 'admin' | 'user'
)

programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT
)

user_programs (
  user_id INTEGER,
  program_id INTEGER,
  PRIMARY KEY (user_id, program_id)
)

program_sessions (
  program_id INTEGER,
  session_id TEXT,
  PRIMARY KEY (program_id, session_id)
)

sessions (
  id TEXT PRIMARY KEY,        -- ej: "sesion_1", "elite_sesion_1"
  name TEXT,
  description TEXT
)

exercises (
  ex_id TEXT PRIMARY KEY,
  name TEXT,
  video_url TEXT,             -- URL de YouTube Shorts
  description TEXT,
  muscles TEXT,
  joints TEXT,
  easier_id TEXT,             -- referencia a ejercicio más fácil
  harder_id TEXT              -- referencia a ejercicio más difícil
)

session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  block TEXT,                 -- letra/número del bloque: "1", "2"...
  block_type TEXT,            -- "super_series", "tabata", "circuit"...
  set_number INTEGER,
  ex_id TEXT,
  ex_order INTEGER,
  tiempo_ej TEXT,             -- duración (ej: "40''", "1'")
  reps TEXT                   -- repeticiones (ej: "15", "6")
)

workout_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  user_id INTEGER,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  duration INTEGER,
  energy_label TEXT,
  feeling_score INTEGER,
  feeling_label TEXT
)

workout_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_log_id INTEGER,
  exercise_id TEXT,
  reps_done INTEGER,
  weight REAL,
  time_taken INTEGER
)
```

### Programas disponibles

| ID | Nombre | Sesiones |
|---|---|---|
| 1 | Unbreakable | 50 |
| 23 | Elite | 69 |

---

## Flujo de navegación

```
LoginSelector (email)
  └─► ProgramSelector (lista de programas del usuario)
        ├─► [Admin] Panel de administración
        └─► HomeClient (lista de sesiones del programa)
              └─► SessionClient (resumen + selector de energía)
                    └─► WorkoutTracker (entrenamiento activo)
                          └─► Pantalla de valoración + fin
```

---

## Autenticación y roles

### Login
- El usuario introduce su email en `LoginSelector`.
- Se llama a `POST /api/auth/login` que busca el usuario por email.
- El usuario se guarda en `localStorage` como JSON `{ id, name, email, role }`.
- Al recargar, `GET /api/auth/validate` verifica que el usuario sigue existiendo en la DB.

### Roles
- `user` — acceso solo a sus programas asignados.
- `admin` — acceso a todos los programas + botón de acceso al panel de administración.

### Panel de administración
- Accesible desde `ProgramSelector` si el usuario tiene rol `admin`.
- Permite cambiar el rol de cualquier usuario.
- Permite asignar/desasignar programas a cada usuario.
- Las rutas `/api/admin/*` están protegidas con `requireAdmin()` que verifica el header `x-user-id`.

---

## Funcionalidades implementadas

### 1. Login por email
- Pantalla inicial con campo de email.
- Redirige a `/programs` tras login exitoso.

### 2. Selector de programas
- Muestra los programas asignados al usuario como botones.
- Botón de administración visible solo para admins.
- Al seleccionar un programa navega a `/?programId=X`.

### 3. Home — Lista de sesiones
- Muestra el nombre del programa activo en el header (dinámico, no hardcodeado).
- Sesiones divididas en "completadas" y "pendientes".
- La primera sesión pendiente se marca como "Toca hoy" y se hace scroll automático hasta ella.
- Botón de volver a la selección de programas.

### 4. Resumen de sesión (SessionClient)
- Bloques expandidos por defecto.
- Cada ejercicio muestra thumbnail de YouTube, nombre, reps y/o tiempo.
- Botón de info (ⓘ) abre modal con vídeo, descripción, músculos, articulaciones y alternativas más fácil/difícil.
- Selector de nivel de energía antes de iniciar.

### 5. Nivel de energía

| Nivel | Porcentaje aplicado |
|---|---|
| ¡A tope! | 100% |
| Bien | 75% |
| Cansado | 50% |
| Muy Cansado | 25% |

El porcentaje escala reps y número de sets en el workflow.

### 6. Entrenamiento activo (WorkoutTracker)
- Cuenta atrás de 5s con círculo SVG animado y pitidos.
- Vídeo a pantalla completa con todos los iframes pre-renderizados.
- Timer con barra de progreso para ejercicios con tiempo.
- Pitidos de aviso en los últimos 5 segundos.
- Botones Anterior / Completar y Siguiente.
- Pantalla de valoración al finalizar (Excelente → Muy Duro).

### 7. Caché de vídeos (IndexedDB)
- `VideoPrefetcher` descarga los vídeos de la sesión en segundo plano.
- Las reproducciones siguientes usan la caché local.

### 8. Wake Lock
- Implementado globalmente en `layout.tsx`.
- Evita que el móvil se bloquee durante el entrenamiento.

### 9. Registro de entrenamientos
- `workout_logs` registra cada sesión con duración, energía y valoración.
- `workout_sets` registra cada ejercicio con tiempo realizado.
- Vista de calendario disponible desde el home.

---

## Datos — Scripts de extracción

```bash
# Poblar programa Unbreakable desde Excel
python3 extract_data.py

# Poblar programa Elite desde Excel
python3 extract_elite.py
```

Ambos scripts requieren: `pip install pandas openpyxl`

---

## Desarrollo local

```bash
cd unbreakable-app
npm install
npm run dev        # http://localhost:3000
```

> El servidor escucha en `0.0.0.0` para ser accesible desde otros dispositivos en la misma red.

## Deploy

Push a `main` en GitHub dispara auto-deploy en Railway.

```bash
git add .
git commit -m "descripción"
git push origin main
```

---

## Convenciones de código

- Todos los componentes interactivos son Client Components (`"use client"`).
- Las páginas de ruta son Server Components que hacen el fetch de datos y pasan props a los Client Components.
- Next.js 15+: `params` y `searchParams` son Promises y deben awaitearse.
- No se usa `useEffect` para fetch de datos — todo el fetching es server-side.
- El idioma de la UI es **español**.
