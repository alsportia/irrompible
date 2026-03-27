# Requirements: Renombrar campos ID de tablas

## Objetivo

Renombrar el campo `id` de todas las tablas que lo tienen como clave primaria, de forma que el nombre del campo sea una concatenación del nombre de la tabla más `_id`. Todos los campos de otras tablas que referencien dichos campos también deben renombrarse de forma consistente.

## Tablas afectadas y renombrado de PKs

| Tabla | Campo actual | Campo nuevo |
|---|---|---|
| `users` | `id` | `users_id` |
| `programs` | `id` | `programs_id` |
| `sessions` | `id` | `sessions_id` |
| `exercises` | `id` | `exercises_id` |
| `energy_levels` | `id` | `energy_levels_id` |
| `feeling_levels` | `id` | `feeling_levels_id` |
| `workout_logs` | `id` | `workout_logs_id` |
| `workout_sets` | `id` | `workout_sets_id` |

> Las tablas `sets` y `set_exercises` ya tienen sus PKs nombradas correctamente (`set_id` y `set_exercise_id`).

## Campos FK afectados (renombrado en cascada)

Cuando se renombra la PK de una tabla, todos los campos de otras tablas que la referencian deben renombrarse también:

### Por `users.id` → `users_id`
- `user_programs.user_id` → `users_id`
- `workout_logs.user_id` → `users_id`

### Por `programs.id` → `programs_id`
- `user_programs.program_id` → `programs_id`
- `sessions.program_id` → `programs_id`

### Por `sessions.id` → `sessions_id`
- `sets.session_id` → `sessions_id`
- `workout_logs.session_id` → `sessions_id`

### Por `exercises.id` → `exercises_id`
- `set_exercises.ex_id` → `exercises_id`
- `workout_sets.exercise_id` → `exercises_id`
- `exercises.easier_id` → `easier_exercises_id` (FK auto-referencial)
- `exercises.harder_id` → `harder_exercises_id` (FK auto-referencial)

### Por `energy_levels.id` → `energy_levels_id`
- `workout_logs.energy_level_id` → `energy_levels_id`

### Por `feeling_levels.id` → `feeling_levels_id`
- `workout_logs.feeling_level_id` → `feeling_levels_id`

### Por `workout_logs.id` → `workout_logs_id`
- `workout_sets.workout_log_id` → `workout_logs_id`

## Alcance del cambio

El renombrado afecta a:

1. **Base de datos** (`seed.db`): recrear las tablas con los nuevos nombres de columna y migrar los datos.
2. **Migraciones** (`src/lib/migrate.ts`): actualizar todos los `CREATE TABLE` y referencias.
3. **Queries SQL** en todo el código TypeScript: actualizar todos los `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN ON`, `WHERE` que usen los campos renombrados.
4. **Tipos TypeScript** (`src/types/index.ts` y otros): actualizar las interfaces que mapean los campos de BD.
5. **Scripts** (`scripts/`): actualizar todas las queries SQL en los scripts de reimportación y migración.

## Requisitos no funcionales

- El cambio debe ser compatible con la BD existente en producción: se implementará como una migración que renombra columnas usando `ALTER TABLE ... RENAME COLUMN`.
- La aplicación debe seguir funcionando exactamente igual tras el cambio.
- El `seed.db` debe regenerarse con el nuevo esquema.
