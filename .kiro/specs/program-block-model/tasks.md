# Plan de Tareas: program-block-model

## Tarea 1: Nuevas tablas en la base de datos

**Archivo**: `unbreakable-app/src/lib/migrate.ts`

Añadir al sistema de migraciones las dos nuevas tablas y el índice:

- `sets` (set_id, session_id, description, block_label, block_type, num_sets, block_order) con FK a `sessions.id ON DELETE CASCADE` y CHECK `length(block_label) <= 1`.
- `set_exercises` (set_exercise_id, set_id, ex_id, ex_order, reps, tiempo_ej) con FK a `sets.set_id ON DELETE CASCADE` y FK a `exercises.id`.
- Índice `idx_sets_session_order` sobre `(session_id, block_order)`.

La migración debe ser idempotente (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

**Requisitos**: 1.1 – 1.7

---

## Tarea 2: Script de migración de datos

**Archivo**: `unbreakable-app/scripts/migrate-to-blocks.ts`

Script Node/TypeScript ejecutable de forma independiente que:

1. Lee `session_exercises` y agrupa por `(session_id, block, block_type)`.
2. Para cada grupo crea un registro en `sets` con `num_sets = MAX(set_number)` y `block_order` según el `ex_order` mínimo del grupo.
3. Inserta en `set_exercises` los ejercicios únicos del grupo (referencia `set_number = 1`), preservando `ex_id`, `ex_order`, `reps`, `tiempo_ej`.
4. Es idempotente: si una sesión ya tiene datos en `sets`, la omite y registra `[SKIP] session_id=X`.
5. Restaura `video_url_yt` leyendo los Excel de `recursos/Programas Mammoth Hunters/` para ejercicios con `video_url` local y `video_url_yt` NULL.
6. Conserva `session_exercises` intacta.
7. Ante error de BD aborta con código de salida 1; ante error de lectura de Excel registra `[WARN]` y continúa.

**Requisitos**: 2.1 – 2.9

---

## Tarea 3: API GET /api/admin/programs/[id]

**Archivo**: `unbreakable-app/src/app/api/admin/programs/[id]/route.ts`

Modificar el handler GET para que devuelva las sesiones con sus bloques y ejercicios desde `sets` y `set_exercises` en lugar de `session_exercises`:

```json
{ "sessions": [{ "blocks": [{ "set_id", "block_label", "block_type", "num_sets", "description", "block_order", "exercises": [...] }] }] }
```

**Requisitos**: 4.3

---

## Tarea 4: API POST /api/admin/programs

**Archivo**: `unbreakable-app/src/app/api/admin/programs/route.ts`

Modificar el handler POST para:

- Aceptar `sessions[].blocks[]` con la estructura `WizardBlock`.
- Insertar en `sets` y `set_exercises` (no en `session_exercises`).
- Validar `num_sets >= 1` → HTTP 400 si no cumple.
- Validar `block_type` en lista de valores válidos → HTTP 400 si no cumple.

**Requisitos**: 4.1, 4.4, 4.5, 4.6

---

## Tarea 5: API PUT /api/admin/programs/[id]

**Archivo**: `unbreakable-app/src/app/api/admin/programs/[id]/route.ts`

Modificar el handler PUT para:

- Borrar los `sets` de las sesiones del programa (cascade elimina `set_exercises`).
- Reinsertar sesiones, `sets` y `set_exercises` desde el body.
- Aplicar las mismas validaciones que el POST.
- Mantener el backup Excel previo a la modificación.

**Requisitos**: 4.2, 4.4, 4.5, 4.6

---

## Tarea 6: Expansión en memoria en workflow/[id]/page.tsx

**Archivo**: `unbreakable-app/src/app/workflow/[id]/page.tsx`

- Reemplazar la consulta a `session_exercises` por una consulta a `sets` + `set_exercises`.
- Implementar `expandBlocks(blocks)`: genera una fila por cada par `(ejercicio × serie)` ordenada por `block_order → set_number → ex_order`.
- Adaptar `applyEnergy` para escalar `num_sets` y `reps` sobre los bloques antes de la expansión.
- Pasar la lista expandida al `WorkoutTracker` con la misma forma de datos actual (`block`, `block_type`, `set_number`, `ex_id`, `ex_order`, `tiempo_ej`, `reps`, `name`, `video_url`, `video_url_yt`).
- `WorkoutTracker` no requiere cambios internos.

**Requisitos**: 5.1 – 5.5

---

## Tarea 7: Actualización del ProgramWizard

**Archivo**: `unbreakable-app/src/components/ProgramWizard.tsx`

Rediseñar el paso de asignación de ejercicios (paso 3 actual) para trabajar con bloques:

- Estado interno: `sessions[].blocks[]` con `WizardBlock[]`.
- UI por bloque: campos `block_label` (1 char), `block_type` (selector), `num_sets` (número), `description` (texto opcional).
- UI por ejercicio dentro del bloque: selector de ejercicio, `reps`, `tiempo_ej`.
- Botones ↑↓ para reordenar bloques y ejercicios.
- Botones "Añadir bloque" / "Eliminar bloque" y "Añadir ejercicio" / "Eliminar ejercicio".
- Validación antes de guardar: bloque sin ejercicios → error; ejercicio sin seleccionar → error.
- Resumen (paso 4): muestra nº de bloques, `block_label`, `num_sets` y ejercicios por bloque.
- Modo edición: reconstruye la vista de bloques desde los datos de `sets` y `set_exercises` devueltos por el GET.
- Envía al servidor la estructura de bloques (no filas por serie).

**Requisitos**: 3.1 – 3.12

---

## Tarea 8: Exportador Excel actualizado

**Archivo**: `unbreakable-app/src/lib/programExporter.ts`

- Reemplazar la hoja `Session_Exercises` por las hojas `Sets` y `Set_Exercises`.
- Hoja `Sets`: columnas `set_id`, `id_sesion`, `description`, `block_label`, `block_type`, `num_sets`, `block_order`.
- Hoja `Set_Exercises`: columnas `set_exercise_id`, `set_id`, `id_ejercicio`, `ex_order`, `repeticiones`, `tiempo`.
- Mantener hojas `Programa`, `Sesiones`, `Ejercicios` sin cambios.
- Leer datos desde `sets` y `set_exercises`.

**Requisitos**: 6.1 – 6.3, 6.8

---

## Tarea 9: Importador Excel actualizado

**Archivo**: `unbreakable-app/src/lib/programImporter.ts`

- Requerir hojas `Sets` y `Set_Exercises` (eliminar soporte de `Session_Exercises`).
- Validar columnas obligatorias de ambas hojas antes de procesar; error descriptivo si falta alguna.
- Insertar en `sets` y `set_exercises` mapeando IDs de Excel a IDs de BD.
- Mantener la validación de hojas `Programa`, `Sesiones` y `Ejercicios`.

**Requisitos**: 6.4 – 6.7

---

## Orden de implementación recomendado

```
Tarea 1 → Tarea 2 → Tarea 3 → Tarea 4 → Tarea 5 → Tarea 6 → Tarea 7 → Tarea 8 → Tarea 9
```

Las tareas 3, 4 y 5 pueden trabajarse en paralelo una vez completada la Tarea 1.
Las tareas 8 y 9 son independientes entre sí y pueden hacerse en paralelo tras la Tarea 1.
La Tarea 7 (wizard) depende de las Tareas 3, 4 y 5 para poder probar el flujo completo.
