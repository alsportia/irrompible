# Design: Renombrar campos ID de tablas

## Estrategia

SQLite soporta `ALTER TABLE ... RENAME COLUMN` desde la versión 3.25.0 (2018). Se usará esta instrucción para renombrar columnas en la BD existente sin perder datos. La migración se añadirá a `src/lib/migrate.ts` usando el helper `addColumnIfNotExists` como referencia, pero con un nuevo helper `renameColumnIfExists`.

## Mapa completo de renombrados

### Tabla `users`
| Antes | Después |
|---|---|
| `id` | `users_id` |

### Tabla `programs`
| Antes | Después |
|---|---|
| `id` | `programs_id` |

### Tabla `user_programs`
| Antes | Después |
|---|---|
| `user_id` | `users_id` |
| `program_id` | `programs_id` |

### Tabla `sessions`
| Antes | Después |
|---|---|
| `id` | `sessions_id` |
| `program_id` | `programs_id` |

### Tabla `exercises`
| Antes | Después |
|---|---|
| `id` | `exercises_id` |
| `easier_id` | `easier_exercises_id` |
| `harder_id` | `harder_exercises_id` |

### Tabla `energy_levels`
| Antes | Después |
|---|---|
| `id` | `energy_levels_id` |

### Tabla `feeling_levels`
| Antes | Después |
|---|---|
| `id` | `feeling_levels_id` |

### Tabla `workout_logs`
| Antes | Después |
|---|---|
| `id` | `workout_logs_id` |
| `session_id` | `sessions_id` |
| `user_id` | `users_id` |
| `energy_level_id` | `energy_levels_id` |
| `feeling_level_id` | `feeling_levels_id` |

### Tabla `workout_sets`
| Antes | Después |
|---|---|
| `id` | `workout_sets_id` |
| `workout_log_id` | `workout_logs_id` |
| `exercise_id` | `exercises_id` |

### Tabla `sets` (sin cambios en PK/FK, ya correcta)
| Antes | Después |
|---|---|
| `session_id` | `sessions_id` |

### Tabla `set_exercises` (sin cambios en PK, ya correcta)
| Antes | Después |
|---|---|
| `set_id` | sin cambio (ya es `set_id`) |
| `ex_id` | `exercises_id` |

## Implementación por capas

### 1. Migración de BD (`src/lib/migrate.ts`)

Añadir al final de `runMigrations()` un bloque de renombrados usando `ALTER TABLE ... RENAME COLUMN`. Se añade un helper `renameColumnIfExists` para idempotencia:

```typescript
async function renameColumnIfExists(table: string, oldName: string, newName: string): Promise<void> {
  const columns = await DB.query<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some(col => col.name === oldName);
  if (exists) {
    await DB.run(`ALTER TABLE ${table} RENAME COLUMN ${oldName} TO ${newName}`);
  }
}
```

### 2. Actualización de `CREATE TABLE` en migrate.ts

Todos los `CREATE TABLE IF NOT EXISTS` deben usar los nuevos nombres de columna para que las BDs nuevas se creen ya con el esquema correcto.

### 3. Código TypeScript

Actualizar todas las queries SQL y tipos en:
- `src/app/actions.ts`
- `src/app/workflow/[id]/page.tsx`
- `src/app/session/[id]/page.tsx`
- `src/app/page.tsx`
- `src/app/api/**/*.ts`
- `src/lib/adminAuth.ts`
- `src/lib/programExporter.ts`
- `src/lib/programImporter.ts`
- `src/types/index.ts`

### 4. Scripts

Actualizar queries en:
- `scripts/reimport-from-excel.ts`
- `scripts/migrate-to-blocks.ts`

### 5. Steering file

Actualizar `database-reference.md` con el nuevo esquema.

## Orden de ejecución de la migración

El orden importa para evitar conflictos (renombrar primero las PKs, luego las FKs que las referencian):

1. `users.id` → `users_id`
2. `programs.id` → `programs_id`
3. `sessions.id` → `sessions_id`
4. `exercises.id` → `exercises_id`
5. `energy_levels.id` → `energy_levels_id`
6. `feeling_levels.id` → `feeling_levels_id`
7. `workout_logs.id` → `workout_logs_id`
8. `workout_sets.id` → `workout_sets_id`
9. FKs en `user_programs`, `sessions`, `exercises`, `sets`, `set_exercises`, `workout_logs`, `workout_sets`

## Notas sobre `set_exercises.ex_id`

El campo `ex_id` en `set_exercises` es una FK a `exercises.id`. Tras el renombrado, pasará a llamarse `exercises_id`. Esto afecta también a las queries que usan `se.ex_id` en los JOINs.

## Notas sobre `exercises.easier_id` / `harder_id`

Son FKs auto-referenciales a `exercises.id`. Se renombran a `easier_exercises_id` y `harder_exercises_id` para seguir la convención `tabla_referenciada_id`.
