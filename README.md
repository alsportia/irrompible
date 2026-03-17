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
│   │   ├── layout.tsx          # Layout raíz (fuentes, WakeLock global)
│   │   ├── page.tsx            # Home — lista de sesiones
│   │   ├── globals.css         # Variables CSS y clases globales
│   │   ├── actions.ts          # Server Actions (crear log, guardar sets)
│   │   ├── session/[id]/
│   │   │   └── page.tsx        # Server Component — fetch datos sesión
│   │   └── workflow/[id]/
│   │       └── page.tsx        # Server Component — fetch ejercicios + aplica energía
│   ├── components/
│   │   ├── SessionClient.tsx   # Client Component — pantalla energía + resumen sesión
│   │   ├── WorkoutTracker.tsx  # Client Component — pantalla de entrenamiento activo
│   │   ├── CachedVideo.tsx     # Reproductor de vídeo con caché IndexedDB
│   │   ├── VideoPrefetcher.tsx # Pre-descarga vídeos en segundo plano
│   │   └── WakeLock.tsx        # Mantiene pantalla activa (global, en layout)
│   └── lib/
│       ├── db.ts               # Wrapper SQLite3 con métodos query/run/get
│       ├── useBeep.ts          # Hook Web Audio API para pitidos de cuenta atrás
│       └── videoCache.ts       # Caché de vídeos en IndexedDB
└── recursos/                   # (fuera de unbreakable-app)
    ├── Unbreakable.xlsx        # Fuente de datos original
    └── extract_data.py         # Script Python para poblar la DB desde el Excel
```

---

## Base de datos

### Esquema

```sql
sessions (
  id TEXT PRIMARY KEY,        -- ej: "sesion_1"
  name TEXT,                  -- ej: "Sesion 1"
  description TEXT            -- descripción completa de la sesión
)

exercises (
  ex_id TEXT PRIMARY KEY,
  name TEXT,
  video_url TEXT              -- URL de YouTube Shorts
)

session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  block TEXT,                 -- letra/número del bloque: "1", "2"...
  block_type TEXT,            -- "super_series", "tabata", "interval_repetitions_with_pause"...
  set_number INTEGER,         -- número de set dentro del bloque
  ex_id TEXT,
  ex_order INTEGER,           -- orden del ejercicio dentro del set
  tiempo_ej TEXT,             -- duración en segundos (ej: "40", "50")
  reps TEXT                   -- repeticiones (ej: "15", "6")
)

workout_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER            -- duración total en segundos
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

### Orden de ejercicios en workflow

Los ejercicios se ordenan `ORDER BY block, set_number, ex_order` para que el flujo sea correcto en superseries: Set1(ej1→ej2→ej3) → Set2(ej1→ej2→ej3).

---

## Flujo de navegación

```
Home (lista sesiones)
  └─► SessionClient — pantalla de nivel de energía
        └─► SessionClient — resumen de sesión (con datos ajustados)
              └─► WorkoutTracker — entrenamiento activo
                    └─► Pantalla de fin de entrenamiento
```

---

## Funcionalidades implementadas

### 1. Home — Lista de sesiones
- Muestra todas las sesiones ordenadas numéricamente.
- Cada tarjeta muestra nombre, descripción (truncada a 2 líneas) y número de series.
- Diseño dark con glassmorphism.

### 2. Selección de nivel de energía
Aparece al entrar en una sesión, antes del resumen. Cuatro niveles:

| Nivel | Emoji | Porcentaje |
|---|---|---|
| ¡A tope! | 🔥 | 100% |
| Bien | 💪 | 75% |
| Cansado | 😓 | 50% |
| Muy Cansado | 😴 | 25% |

- Por defecto seleccionado: ¡A tope! (100%).
- El porcentaje se aplica a:
  - **Reps**: se escalan proporcionalmente (mínimo 1).
  - **Sets**: en bloques con múltiples sets, se reduce el número de sets.
- El nivel seleccionado se pasa como query param `?energy=0.75` a la ruta `/workflow/[id]`.

### 3. Resumen de sesión
- Header sticky con nombre de sesión y badge del nivel de energía seleccionado.
- Sección de instrucciones con la descripción completa de la sesión.
- Bloques separados por divisores con nombre del tipo y badge `×N sets`.
- Cada ejercicio muestra:
  - Thumbnail de YouTube (extraído de la URL del vídeo).
  - Overlay de play sobre el thumbnail.
  - Nombre del ejercicio.
  - Reps y/o tiempo objetivo.
- Al pulsar el thumbnail se abre un **modal de previsualización** con el vídeo en formato vertical (9:16), autoplay y loop continuo.
- Botón fijo "Iniciar Entrenamiento" en la parte inferior.

### 4. Entrenamiento activo (WorkoutTracker)

#### Header con progreso
- Fila de píldoras (una por ejercicio): azul = completado, blanco semitransparente = pendiente.
- Si hay más de 20 ejercicios, cambia a barra de progreso continua con contador "X / Y".

#### Cuenta atrás pre-ejercicio
- 5 segundos de cuenta atrás antes de cada ejercicio.
- Círculo SVG animado que se llena progresivamente.
- Pitido en cada segundo (Web Audio API, 600 Hz).
- Pitido final diferente al llegar a 0 (1200 Hz).
- Al llegar a 0, espera 1,1s para que la animación del círculo complete antes de pasar al ejercicio.
- Botón "Saltar cuenta atrás" disponible.
- Muestra bloque, set y nombre del ejercicio siguiente.

#### Pantalla de ejercicio
- Vídeo a pantalla completa (flex: 1, ocupa todo el espacio disponible).
- Todos los iframes pre-renderizados y ocultados con `display: none/block` para evitar recargas.
- Si no hay vídeo, muestra placeholder con icono.
- Info area en la parte inferior:
  - Badge de bloque (izquierda) y set (derecha) con `justify-content: space-between`.
  - Nombre del ejercicio en grande.
  - Fila de cards: Reps | Objetivo (tiempo) | Timer | Pausa.
  - Timer con barra de progreso horizontal (izquierda a derecha, azul semitransparente).
- Botones: "Anterior" (si no es el primero) + "Completar y Siguiente".

#### Temporizador
- Ejercicios con `tiempo_ej`: cuenta atrás desde el tiempo objetivo.
- Ejercicios con `reps`: cuenta hacia arriba (tiempo transcurrido).
- Pitidos de aviso en los últimos 5 segundos (1000 Hz).
- Auto-avance al llegar a 0.
- Botón de pausa/reanudar.

#### Cuenta atrás de fin de ejercicio
- Pitidos de aviso (1000 Hz) cuando quedan 5, 4, 3, 2 segundos.
- Pitido final (1200 Hz) al llegar a 0.

#### Navegación
- Botón "Anterior" para volver al ejercicio previo (resetea la cuenta atrás).
- Botón X para salir al resumen de sesión.

#### Pantalla de fin
- Pantalla de felicitación al completar todos los ejercicios.
- Registra duración total del entrenamiento en `workout_logs`.

### 5. Caché de vídeos (IndexedDB)
- Los vídeos de YouTube se descargan la primera vez y se almacenan en IndexedDB.
- Las siguientes reproducciones usan la caché local.
- `VideoPrefetcher` pre-descarga todos los vídeos de la sesión en segundo plano al entrar al resumen.

### 6. Wake Lock
- Implementado globalmente en `layout.tsx` mediante el componente `WakeLock.tsx`.
- Usa la API `navigator.wakeLock.request('screen')`.
- Se reactiva automáticamente al volver a la pestaña (evento `visibilitychange`).
- Evita que el móvil se bloquee mientras la app está en pantalla.

### 7. Registro de entrenamientos
- Al iniciar un entrenamiento se crea un `workout_log` en la DB.
- Cada ejercicio completado guarda un `workout_set` con el tiempo realizado.
- Al finalizar se registra la duración total.

---

## Datos — Script de extracción

El archivo `extract_data.py` (en la raíz del workspace) lee `recursos/Unbreakable.xlsx` y puebla `unbreakable-app/data/unbreakable.db`.

- Requiere Python con `pandas` y `openpyxl`: `pip install pandas openpyxl`
- Las descripciones se extraen buscando la primera celda con más de 80 caracteres en las primeras 20 filas de cada hoja.
- Ejecutar desde la raíz: `python3 extract_data.py`

---

## Desarrollo local

```bash
cd unbreakable-app
npm install
npm run dev        # http://localhost:3000
```

> El servidor escucha en `0.0.0.0` para ser accesible desde otros dispositivos en la misma red (útil para probar en iPhone).

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
- No se usa `useEffect` para fetch de datos — todo el fetching es server-side.
- Los estilos se definen como objetos `const S = { ... }` al inicio del componente para mantener el JSX limpio.
- El idioma de la UI es **español**.
