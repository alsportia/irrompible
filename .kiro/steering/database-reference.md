# Base de Datos — Referencia Técnica

## Configuración

| Propiedad | Valor |
|---|---|
| **Desarrollo** | SQLite local en `data/unbreakable.db` |
| **Producción** | Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN) |
| **Seed** | `seed.db` en raíz del proyecto |
| **Seed contiene** | Ejercicios, programas, sesiones, energy_levels, feeling_levels |
| **Seed NO contiene** | Usuarios, workout_logs, workout_sets |
| **Auto-seed** | Si `unbreakable.db` no existe o está vacía, se copia `seed.db` automáticamente |
| **Migraciones** | Incrementales en `src/lib/migrate.ts` (se ejecutan al iniciar) |

## Tablas Activas

### `users`
Usuarios del sistema con autenticación y roles.

| Columna | Tipo | Notas |
|---|---|---|
| `users_id` | INTEGER PK | AUTOINCREMENT |
| `name` | TEXT NOT NULL | Nombre del usuario |
| `email` | TEXT | Email único |
| `password_hash` | TEXT | Hash bcryptjs |
| `role` | TEXT NOT NULL | `admin` o `user` (DEFAULT `user`) |
| `status` | TEXT NOT NULL | `active`, `pending`, `rejected` (DEFAULT `active`) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### `programs`
Programas de entrenamiento agrupados.

| Columna | Tipo | Notas |
|---|---|---|
| `programs_id` | INTEGER PK | AUTOINCREMENT |
| `name` | TEXT NOT NULL UNIQUE | Ej: Unbreakable, Elite, Primal |
| `description` | TEXT | Descripción del programa |
| `image_url` | TEXT | URL de portada |

### `user_programs`
Relación muchos-a-muchos: usuarios pueden tener múltiples programas.

| Columna | Tipo | Notas |
|---|---|---|
| `users_id` | INTEGER PK | FK → users |
| `programs_id` | INTEGER PK | FK → programs |

### `sessions`
Sesiones de entrenamiento dentro de programas.

| Columna | Tipo | Notas |
|---|---|---|
| `sessions_id` | INTEGER PK | AUTOINCREMENT |
| `session_code` | TEXT UNIQUE | Slug único, ej: `unbreakable_s1` |
| `name` | TEXT | Nombre legible |
| `description` | TEXT | Descripción |
| `programs_id` | INTEGER NOT NULL | FK → programs (ON DELETE SET NULL) |

### `exercises`
Catálogo de ejercicios con videos y progresiones.

| Columna | Tipo | Notas |
|---|---|---|
| `exercises_id` | INTEGER PK | Sin AUTOINCREMENT (IDs vienen del Excel original) |
| `name` | TEXT NOT NULL | Nombre del ejercicio |
| `video_url` | TEXT | URL local, ej: `/videos/Nombre.3gpp` |
| `video_url_yt` | TEXT | URL de YouTube (shorts o watch) |
| `description` | TEXT | Descripción técnica |
| `muscles` | TEXT | JSON array como string, ej: `["cuádriceps", "glúteos"]` |
| `joints` | TEXT | JSON array como string |
| `easier_exercises_id` | INTEGER | FK → exercises (variante más fácil) |
| `harder_exercises_id` | INTEGER | FK → exercises (variante más difícil) |

### `energy_levels`
Lookup table: nivel de energía al iniciar entrenamiento.

| Columna | Tipo | Notas |
|---|---|---|
| `energy_levels_id` | INTEGER PK | AUTOINCREMENT |
| `label` | TEXT NOT NULL UNIQUE | "¡A tope!", "Bien", "Cansado", "Muy Cansado" |
| `pct` | REAL NOT NULL | Multiplicador: 1.0, 0.75, 0.50, 0.25 |

El multiplicador `pct` reduce reps/series proporcionalmente al aplicar energía.

### `feeling_levels`
Lookup table: sensación post-entrenamiento.

| Columna | Tipo | Notas |
|---|---|---|
| `feeling_levels_id` | INTEGER PK | AUTOINCREMENT |
| `label` | TEXT NOT NULL UNIQUE | "Excelente", "Bien", "Normal", "Duro", "Muy Duro" |
| `score` | INTEGER NOT NULL | 100, 80, 60, 40, 20 |

### `sets`
Bloques dentro de sesiones (reemplazó el modelo anterior de `session_exercises`).

| Columna | Tipo | Notas |
|---|---|---|
| `set_id` | INTEGER PK | AUTOINCREMENT |
| `sessions_id` | INTEGER NOT NULL | FK → sessions (ON DELETE CASCADE) |
| `description` | TEXT | Descripción del bloque |
| `block_label` | TEXT | Etiqueta visible, ej: "1", "2A", "3B" |
| `block_type` | TEXT | Tipo de bloque, ej: `normal`, `circuit`, `superset`, `tabata` |
| `block_order` | INTEGER NOT NULL | Orden dentro de la sesión |

**Índices:**
- `idx_sets_session_order` (sessions_id, block_order)

### `set_exercises`
Ejercicios dentro de un bloque, expandidos por serie.

| Columna | Tipo | Notas |
|---|---|---|
| `set_exercise_id` | INTEGER PK | AUTOINCREMENT |
| `set_id` | INTEGER NOT NULL | FK → sets (ON DELETE CASCADE) |
| `set_number` | INTEGER NOT NULL | Número de serie (1, 2, 3...) |
| `exercises_id` | INTEGER NOT NULL | FK → exercises |
| `ex_order` | INTEGER NOT NULL | Orden del ejercicio dentro del set |
| `reps` | TEXT | Puede ser "8", "8-10", null |
| `tiempo_ej` | TEXT | Formato: "30''" (segundos) o "2'" (minutos) |
| `peso` | REAL NOT NULL | DEFAULT 0 |

**Nota:** Cada fila es única (set_id, set_number, exercises_id, ex