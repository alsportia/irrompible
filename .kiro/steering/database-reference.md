# Base de Datos — Referencia Técnica

## Archivo y configuración

- Ruta en desarrollo: `data/unbreakable.db` (SQLite)
- Seed inicial: `seed.db` (en la raíz del proyecto, fuera del volumen de Railway)
- El seed se copia a `data/unbreakable.db` automáticamente si la BD está vacía o no existe (lógica en `src/lib/db.ts`)
- El seed contiene todos los datos de referencia (ejercicios, programas, sesiones) pero **sin** usuarios ni logs de entrenamiento
- Migraciones incrementales en `src/lib/migrate.ts` usando `addColumnIfNotExists`

## Tablas activas

### `users`
| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT NOT NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| email | TEXT | |
| role | TEXT NOT NULL | DEFAULT 'user'. Valores: 'user', 'admin' |
| status | TEXT NOT NULL | DEFAULT 'active'. Valores: 'active', 'pending', 'rejected' |

### `programs`
| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT NOT NULL UNIQUE | |
| description | TEXT | |
| image_url | TEXT | |

Programas actuales: Unbreakable, Elite, Primal, Ring Master, Aurum (+ 2 más).

### `user_programs`
| columna | tipo | notas |
|---|---|---|
| user_id | INTEGER PK | FK → users |
| program_id | INTEGER PK | FK → programs |

Tabla de unión muchos-a-muchos. Un usuario puede tener varios programas asignados.

### `sessions`
| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| session_code | TEXT UNIQUE | slug único, ej: `unbreakable_s1` |
| name | TEXT | nombre legible de la sesión |
| description | TEXT | |
| program_id | INTEGER NOT NULL | FK → programs |

### `sets`
Bloque de ejercicios dentro de una sesión (antes llamado "bloque").

| columna | tipo | notas |
|---|---|---|
| set_id | INTEGER PK | |
| session_id | INTEGER NOT NULL | FK → sessions |
| description | TEXT | |
| block_label | TEXT | etiqueta visible del bloque, ej: "1", "2A" |
| block_type | TEXT | ej: `interval_repetitions_with_pause`, `normal` |
| block_order | INTEGER NOT NULL | orden dentro de la sesión |

### `set_exercises`
Ejercicios dentro de un bloque, expandidos por número de serie.

| columna | tipo | notas |
|---|---|---|
| set_exercise_id | INTEGER PK | |
| set_id | INTEGER NOT NULL | FK → sets |
| set_number | INTEGER NOT NULL | número de serie (1, 2, 3...) |
| ex_id | INTEGER NOT NULL | FK → exercises |
| ex_order | INTEGER NOT NULL | orden del ejercicio dentro del set |
| reps | TEXT | puede ser "8", "8-10", null |
| tiempo_ej | TEXT | formato: "30''" (segundos) o "2'" (minutos) |

> **Nota**: cada fila es una combinación única (set_id, set_number, ex_id, ex_order). Un ejercicio con 3 series genera 3 filas con set_number 1, 2, 3.

### `exercises`
| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | IDs vienen del Excel original (no autoincrement) |
| name | TEXT | |
| video_url | TEXT | ruta local, ej: `/videos/Nombre.3gpp` |
| video_url_yt | TEXT | URL de YouTube (shorts o watch) |
| description | TEXT | |
| muscles | TEXT | JSON array como string, ej: `["cuádriceps", "glúteos"]` |
| joints | TEXT | JSON array como string |
| easier_id | INTEGER | FK → exercises (variante más fácil) |
| harder_id | INTEGER | FK → exercises (variante más difícil) |
| met | REAL | no usado actualmente |

### `energy_levels`
Lookup table para el nivel de energía al iniciar un entrenamiento.

| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| code | TEXT NOT NULL UNIQUE | |
| label | TEXT NOT NULL UNIQUE | ej: "¡A tope!", "Bien", "Cansado", "Muy Cansado" |
| pct | REAL NOT NULL | multiplicador: 1.0, 0.75, 0.50, 0.25 |

El `pct` se usa para reducir series y reps proporcionalmente al aplicar energía.

### `feeling_levels`
Lookup table para la sensación post-entrenamiento.

| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| score | INTEGER NOT NULL | 100, 80, 60, 40, 20 |
| label | TEXT NOT NULL UNIQUE | "Excelente", "Bien", "Normal", "Duro", "Muy Duro" |

### `workout_logs`
Registro de cada sesión de entrenamiento completada o en curso.

| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| session_id | INTEGER | FK → sessions |
| user_id | INTEGER | FK → users |
| date | DATETIME | DEFAULT CURRENT_TIMESTAMP — fecha de inicio |
| completed_at | DATETIME | null si no completado |
| duration | INTEGER | duración en segundos |
| energy_level_id | INTEGER | FK → energy_levels |
| feeling_level_id | INTEGER | FK → feeling_levels, null hasta completar |

> **Importante**: la columna de fecha de creación se llama `date`, NO `created_at` (la migración define `created_at` pero la tabla real usa `date` por ser anterior).

### `workout_sets`
Registro de cada ejercicio completado dentro de un entrenamiento.

| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | |
| workout_log_id | INTEGER NOT NULL | FK → workout_logs (CASCADE delete) |
| exercise_id | INTEGER NOT NULL | FK → exercises |
| set_number | INTEGER | número de serie dentro del bloque |
| reps_done | INTEGER | reps realizadas (actualmente siempre null) |
| weight | REAL | peso en kg introducido por el usuario |
| time_taken | INTEGER | tiempo en segundos |

## Flujo de un entrenamiento

```
1. Usuario elige sesión → SessionClient
2. Elige nivel de energía → redirige a /workflow/[sessionId]?energy=X&userId=Y&energyLabel=Z
3. WorkflowPage (server):
   - Carga set_exercises JOIN sets JOIN exercises para esa sesión
   - Aplica applyEnergy() para filtrar series y reducir reps según pct
   - Crea workout_log → createWorkoutLog(sessionId, userId, energyLabel)
   - Renderiza WorkoutTracker con logId + exercises
4. WorkoutTracker (client):
   - Por cada ejercicio: carga último peso usado → getLastWeight(userId, ex_id)
   - Cuenta atrás de 5s → temporizador activo
   - Al completar: saveWorkoutSet(logId, ex_id, set_number, null, peso, timeTaken)
   - Al finalizar todos: finishWorkoutLog(logId, duration, feelingScore, feelingLabel)
```

## Lógica de peso por ejercicio

- Al llegar a un ejercicio, se consulta el último `weight > 0` de `workout_sets` para ese `exercise_id` y `user_id` (via JOIN con `workout_logs`)
- El peso se guarda en un mapa en memoria `{ ex_id → peso }` durante el entrenamiento
- Si el usuario vuelve atrás, el peso que introdujo se conserva
- Al completar el ejercicio, el peso se persiste en `workout_sets.weight`
- Query para obtener último peso:
```sql
SELECT ws.weight FROM workout_sets ws
JOIN workout_logs wl ON ws.workout_log_id = wl.id
WHERE wl.user_id = ? AND ws.exercise_id = ? AND ws.weight IS NOT NULL AND ws.weight > 0
ORDER BY wl.date DESC, ws.id DESC
LIMIT 1
```

## Reset de base de datos

- Endpoint: `POST /api/admin/reset-db`
- Solo accesible para admins
- Genera backup base64 de la BD actual para descarga
- Cierra la conexión (`DB.close()`), copia `seed.db` sobre `unbreakable.db`, reabre
- El seed NO contiene usuarios ni workout_logs/workout_sets

## Tablas eliminadas (historial)

| tabla | motivo |
|---|---|
| `session_exercises` | Reemplazada por `sets` + `set_exercises` en la migración al modelo de bloques |
| `program_sessions` | Nunca llegó a usarse, siempre estuvo vacía |

## Archivos clave

| archivo | función |
|---|---|
| `src/lib/db.ts` | Singleton SQLite, lógica de seed automático |
| `src/lib/migrate.ts` | Migraciones incrementales al arrancar |
| `src/app/actions.ts` | Server actions: createWorkoutLog, saveWorkoutSet, getLastWeight, finishWorkoutLog |
| `src/app/workflow/[id]/page.tsx` | Carga ejercicios, aplica energía, crea log, renderiza WorkoutTracker |
| `src/components/WorkoutTracker.tsx` | UI del entrenamiento en curso |
| `scripts/reimport-from-excel.ts` | Reimporta sesiones desde los Excel originales |
| `scripts/generate-video-conflicts-excel.ts` | Detecta ejercicios con URLs de YouTube conflictivas entre programas |
| `scripts/apply-video-corrections.ts` | Aplica correcciones de URLs desde el Excel revisado |
