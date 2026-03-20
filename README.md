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
│   │   ├── page.tsx                # Home — lista de sesiones del programa
│   │   ├── globals.css             # Variables CSS y clases globales
│   │   ├── actions.ts              # Server Actions (crear log, guardar sets)
│   │   ├── admin/
│   │   │   └── page.tsx            # Panel de administración (solo rol admin)
│   │   ├── programs/
│   │   │   └── page.tsx            # Selector de programas post-login
│   │   ├── session/[id]/
│   │   │   └── page.tsx            # Server Component — fetch datos sesión
│   │   └── workflow/[id]/
│   │       └── page.tsx            # Server Component — fetch ejercicios + aplica energía
│   ├── app/api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # POST — login por email
│   │   │   └── validate/route.ts   # GET — valida sesión activa
│   │   ├── programs/route.ts       # GET — programas del usuario
│   │   ├── users/route.ts          # GET/POST — usuarios
│   │   ├── public/
│   │   │   └── programs/route.ts   # GET — programas públicos (sin auth)
│   │   ├── calendar/route.ts       # GET — historial de entrenamientos
│   │   └── admin/
│   │       ├── programs/route.ts               # GET — todos los programas
│   │       ├── users/route.ts                  # GET — todos los usuarios
│   │       ├── users/[id]/role/route.ts         # PATCH — cambiar rol
│   │       ├── users/[id]/status/route.ts       # PATCH — cambiar estado
│   │       └── users/[id]/programs/route.ts     # GET/PUT — programas de un usuario
│   ├── components/
│   │   ├── LoginSelector.tsx       # Pantalla de login por email
│   │   ├── ProgramSelector.tsx     # Selector de programas post-login
│   │   ├── AdminClient.tsx         # Panel de administración (UI)
│   │   ├── HomeClient.tsx          # Lista de sesiones del programa activo
│   │   ├── SessionClient.tsx       # Resumen de sesión + selector de energía
│   │   ├── WorkoutTracker.tsx      # Pantalla de entrenamiento activo
│   │   ├── CachedVideo.tsx         # Reproductor de vídeo (YouTube embed)
│   │   ├── VideoPrefetcher.tsx     # Pre-descarga vídeos en segundo plano
│   │   ├── CalendarView.tsx        # Vista de calendario de entrenamientos
│   │   └── WakeLock.tsx            # Mantiene pantalla activa (global, en layout)
│   └── lib/
│       ├── db.ts                   # Wrapper SQLite3 — init lazy, copia seed si vacío
│       ├── migrate.ts              # Migraciones de DB (addColumnIfNotExists)
│       ├── adminAuth.ts            # Helper requireAdmin() para rutas protegidas
│       ├── userContext.tsx         # Context de usuario (id, name, email, role)
│       ├── useBeep.ts              # Hook Web Audio API para pitidos de cuenta atrás
│       └── videoCache.ts           # Caché de vídeos en IndexedDB
└── ../scripts/                     # Scripts Python de extracción de datos (fuera del repo)
    ├── extract_data.py             # Poblar DB desde Unbreakable.xlsx
    ├── extract_elite.py            # Poblar DB desde Elite.xlsx
    ├── extract_primal.py
    ├── extract_programs.py
    ├── migrate_schema.py
    ├── parse_difficulty.py
    └── parse_pdf.py
```

---

## Base de datos

### Persistencia en producción

La carpeta `data/` está montada como un **Railway Volume** (`/app/data`). Esto garantiza que la base de datos sobrevive entre deploys.

Al arrancar, `db.ts` comprueba si `unbreakable.db` existe y tiene contenido. Si no (primer deploy o volumen vacío), copia automáticamente `seed.db` — que sí va en git — como punto de partida.

`data/unbreakable.db` está en `.gitignore`. `seed.db` no.

### Actualizar el seed

Si quieres que el próximo entorno nuevo arranque con datos frescos:

```bash
cp data/unbreakable.db seed.db
git add seed.db
git commit -m "Update seed DB"
git push
```

### Esquema actual

```sql
users (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT,
  email   TEXT UNIQUE,
  role    TEXT DEFAULT 'user',    -- 'admin' | 'user'
  status  TEXT DEFAULT 'active'   -- 'active' | 'inactive'
)

programs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT
)

user_programs (
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, program_id)
)

sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_code TEXT UNIQUE,       -- ej: "primal_sesion_3"
  name         TEXT,
  description  TEXT,
  program_id   INTEGER REFERENCES programs(id)
)

exercises (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  video_url   TEXT,               -- URL de YouTube Shorts
  description TEXT,
  muscles     TEXT,
  joints      TEXT,
  easier_id   INTEGER REFERENCES exercises(id),
  harder_id   INTEGER REFERENCES exercises(id)
)

session_exercises (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  ex_id      INTEGER REFERENCES exercises(id),
  block      TEXT,                -- letra/número del bloque: "A", "1"...
  block_type TEXT,                -- "circuit", "super_series", "tabata"...
  set_number INTEGER,
  ex_order   INTEGER,
  reps       TEXT,                -- ej: "15", "6"
  tiempo_ej  TEXT                 -- ej: "40''", "1'"
)

energy_levels (
  id    INTEGER PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  pct   REAL NOT NULL
)

feeling_levels (
  id    INTEGER PRIMARY KEY,
  score INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL
)

workout_logs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id       INTEGER REFERENCES sessions(id),
  user_id          INTEGER REFERENCES users(id),
  energy_level_id  INTEGER REFERENCES energy_levels(id),
  feeling_level_id INTEGER REFERENCES feeling_levels(id),
  duration         INTEGER,
  completed_at     TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
)

workout_sets (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_log_id INTEGER REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id    INTEGER REFERENCES exercises(id),
  reps_done      INTEGER,
  weight         REAL,
  time_taken     INTEGER
)
```

### Programas disponibles

| ID | Nombre |
|---|---|
| 1 | Unbreakable |
| 2 | Elite |
| 3 | Primal |

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
- `POST /api/auth/login` busca el usuario por email.
- El usuario se guarda en `localStorage` como JSON `{ id, name, email, role }`.
- Al recargar, `GET /api/auth/validate` verifica que el usuario sigue existiendo en la DB.

### Roles
- `user` — acceso solo a sus programas asignados.
- `admin` — acceso a todos los programas + panel de administración.

### Panel de administración
- Accesible desde `ProgramSelector` si el usuario tiene rol `admin`.
- Permite cambiar rol y estado de cualquier usuario.
- Permite asignar/desasignar programas a cada usuario.
- Las rutas `/api/admin/*` están protegidas con `requireAdmin()` que verifica el header `x-user-id`.

---

## Funcionalidades

### Nivel de energía

| Nivel | % aplicado |
|---|---|
| ¡A tope! | 100% |
| Bien | 75% |
| Cansado | 50% |
| Muy Cansado | 25% |

El porcentaje escala reps y número de sets en el workflow.

### Entrenamiento activo (WorkoutTracker)
- Cuenta atrás de 5s con círculo SVG animado y pitidos.
- Vídeo a pantalla completa con todos los iframes pre-renderizados.
- Timer con barra de progreso para ejercicios con tiempo.
- Pitidos de aviso en los últimos 5 segundos.
- Botones Anterior / Completar y Siguiente.
- Pantalla de valoración al finalizar.

### Otras
- Caché de vídeos en IndexedDB (`VideoPrefetcher`).
- Wake Lock global para evitar que el móvil se bloquee.
- Registro de entrenamientos en `workout_logs` y `workout_sets`.
- Vista de calendario desde el home.

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
- No se usa `useEffect` para fetch de datos — todo el fetching es server-side.
- El idioma de la UI es **español**.
