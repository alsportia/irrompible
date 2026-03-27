# Diseño Técnico: Importación/Exportación de Programas

## Visión general

La funcionalidad se divide en tres capas:

1. **API Routes** — endpoints Next.js en `/api/admin/programs/` para importar, exportar y gestionar programas
2. **Lib modules** — lógica de negocio reutilizable: `programImporter.ts`, `programExporter.ts`
3. **UI** — página dedicada `/admin/programs` con el wizard y las acciones de importar/exportar

La librería Excel a usar es **`xlsx`** (SheetJS), ya disponible en el ecosistema Node/Next.js sin dependencias nativas.

---

## Cambios en la base de datos

### Migración necesaria

La tabla `sessions` tiene `session_code TEXT NOT NULL UNIQUE` que ya no se usa en el código. Para poder crear sesiones sin ese campo, hay que hacerlo nullable o eliminarlo. Se optará por hacerlo nullable en la migración para no romper datos existentes.

```sql
-- En src/lib/migrate.ts se añadirá:
-- SQLite no permite DROP COLUMN en versiones antiguas, se recrea la tabla
-- Alternativa más segura: permitir NULL en session_code
-- Como SQLite no soporta ALTER COLUMN, se usará un valor auto-generado al insertar
```

Estrategia: al crear sesiones desde el importer/wizard, se generará un `session_code` automático con el patrón `{program_slug}_s{numero}` para mantener compatibilidad con el constraint UNIQUE NOT NULL existente.

---

## Estructura de archivos nuevos

```
src/
├── app/
│   ├── admin/
│   │   └── programs/
│   │       └── page.tsx                  # Página dedicada /admin/programs
│   └── api/
│       └── admin/
│           └── programs/
│               ├── route.ts              # GET (list) — ya existe, se amplía
│               ├── import/
│               │   └── route.ts          # POST multipart/form-data
│               ├── export/
│               │   └── route.ts          # GET ?id=X o template
│               └── [id]/
│                   └── route.ts          # GET, PUT, DELETE por programa
├── components/
│   ├── AdminPrograms.tsx                 # Página principal /admin/programs
│   ├── ProgramWizard.tsx                 # Wizard crear/editar programa
│   └── ProgramImportExport.tsx           # Sección importar/exportar/plantilla
└── lib/
    ├── programImporter.ts                # Lógica de importación desde Excel
    └── programExporter.ts               # Lógica de exportación a Excel
```

---

## Formato del archivo Excel (4 hojas)

### Hoja `Programa`
| nombre | descripcion | imagen_url |
|--------|-------------|------------|
| Mi Programa | Descripción | https://... |

### Hoja `Sesiones`
| id_sesion | numero_sesion | nombre_sesion |
|-----------|---------------|---------------|
| 1 | 1 | Sesión 1 |
| 2 | 2 | Sesión 2 |

`id_sesion` es un identificador interno del Excel (no el ID de la DB). Permite que `Set_Exercises` referencie sesiones sin depender de IDs de DB.

### Hoja `Ejercicios`
| id_ejercicio | nombre | musculos | articulaciones | descripcion | video_url | video_url_yt |
|---|---|---|---|---|---|---|
| 1 | Sentadilla | Cuádriceps | Rodilla | ... | /videos/... | https://yt... |

`id_ejercicio` es el `exercises_id` real de la DB cuando se exporta, o un ID temporal cuando se añaden ejercicios nuevos en la plantilla.

### Hoja `Set_Exercises`
| id_sesion | id_ejercicio | bloque | tipo_bloque | numero_serie | orden_ejercicio | repeticiones | tiempo |
|---|---|---|---|---|---|---|---|
| 1 | 42 | A | normal | 1 | 1 | 10 | |
| 1 | 15 | A | circuit | 1 | 2 | | 30s |

---

## API Routes

### `GET /api/admin/programs`
Lista todos los programas. Ya existe, no cambia.

### `GET /api/admin/programs/export?id={programId}`
Genera y devuelve el Excel del programa indicado.
- Respuesta: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Nombre del archivo: `{nombre_programa}.xlsx`

### `GET /api/admin/programs/export?template=true`
Genera y devuelve la plantilla vacía con todos los ejercicios en la hoja `Ejercicios`.
- Nombre del archivo: `plantilla_programa.xlsx`

### `POST /api/admin/programs/import`
Recibe un archivo Excel via `multipart/form-data`.
- Body: `FormData` con campo `file` (el .xlsx)
- Body opcional: `overwrite=true` para sobreescribir programa existente
- Respuesta éxito: `{ programId, sessionsCreated, exercisesCreated }`
- Respuesta conflicto: `{ conflict: true, existingId, message }` → el cliente muestra el modal
- Respuesta error: `{ error: string, details?: string }`

### `GET /api/admin/programs/[id]`
Devuelve un programa con todas sus sesiones, sets y set_exercises.

### `PUT /api/admin/programs/[id]`
Actualiza un programa existente. Genera backup automático antes de modificar.

### `DELETE /api/admin/programs/[id]`
Elimina un programa y todas sus sesiones/sets/set_exercises en cascada.

---

## Módulo `programExporter.ts`

```typescript
export async function exportProgramToExcel(programId: number): Promise<Buffer>
export async function generateTemplateExcel(): Promise<Buffer>
```

Internamente:
1. Consulta `programs`, `sessions`, `sets` + `set_exercises` JOIN `exercises`
2. Construye el workbook con las 5 hojas usando SheetJS
3. Devuelve el buffer del archivo

---

## Módulo `programImporter.ts`

```typescript
interface ImportResult {
  programId: number;
  sessionsCreated: number;
  exercisesCreated: number;
}

interface ImportConflict {
  conflict: true;
  existingId: number;
  existingName: string;
}

export async function importProgramFromExcel(
  buffer: Buffer,
  options?: { overwrite?: boolean; newName?: string }
): Promise<ImportResult | ImportConflict>
```

Flujo interno:
1. Parsear el Excel y validar estructura (4 hojas, columnas obligatorias)
2. Validar valores: `tipo_bloque` ∈ {normal, circuit, superset}, `bloque` = letra mayúscula
3. Verificar referencias cruzadas entre hojas
4. Comprobar si el nombre del programa ya existe en la DB
   - Si existe y no hay `overwrite`: devolver `ImportConflict`
   - Si existe y `overwrite=true`: generar backup, eliminar programa existente
5. Dentro de una transacción:
   a. Crear ejercicios nuevos (los que no existen por nombre)
   b. Crear el programa
   c. Crear sesiones (generando `session_code` automático)
   d. Crear `sets` y `set_exercises` resolviendo IDs del Excel a IDs reales de DB

---

## Componente `ProgramWizard.tsx`

Estado interno (React):
```typescript
interface WizardState {
  program: { name: string; description: string; image_url: string }
  sessions: WizardSession[]
  activeSessionIndex: number
}

interface WizardSession {
  tempId: string          // UUID local, no va a la DB
  numero_sesion: number
  nombre_sesion: string
  exercises: WizardExercise[]
}

interface WizardExercise {
  ex_id: number
  ex_name: string         // solo para mostrar en UI
  bloque: string
  tipo_bloque: 'normal' | 'circuit' | 'superset'
  set_number: number
  ex_order: number
  reps: string
  tiempo_ej: string
}
```

Pasos del wizard:
1. **Datos del programa** — nombre, descripción, imagen
2. **Sesiones** — lista de sesiones, añadir/eliminar, navegar entre ellas
3. **Ejercicios por sesión** — para la sesión activa: buscar ejercicio del catálogo, asignar bloque/tipo/series/reps, reordenar con ↑↓
4. **Resumen y guardar** — vista previa antes de confirmar

Al guardar, llama a `PUT /api/admin/programs/[id]` (edición) o `POST /api/admin/programs` (creación).

---

## Página `/admin/programs`

Componente `AdminPrograms.tsx` con tres secciones:

1. **Lista de programas** — tabla con nombre, nº sesiones, botones: Editar (wizard), Exportar, Eliminar
2. **Acciones** — botones: "Nuevo programa" (abre wizard), "Importar Excel", "Descargar plantilla"
3. **Wizard** — se muestra en lugar de la lista cuando se crea/edita

El panel `/admin` existente añade un botón/enlace "Gestionar programas" que navega a `/admin/programs`.

---

## Gestión de backups

Los backups se generan como archivos Excel en memoria y se ofrecen para descarga inmediata al admin. No se persisten en el servidor (no hay sistema de ficheros persistente en Railway). El flujo es:

1. Admin solicita sobreescribir → servidor genera backup Excel en memoria
2. Respuesta incluye el backup como base64 o como descarga previa
3. Cliente descarga el backup automáticamente antes de confirmar la sobreescritura
4. Admin confirma → se ejecuta la importación con `overwrite=true`

---

## Dependencias nuevas

- **`xlsx`** (SheetJS) — `npm install xlsx` — para leer y escribir archivos Excel
- **`uuid`** — ya disponible en Next.js — para generar IDs temporales en el wizard

---

## Consideraciones de migración

El campo `session_code` en la tabla `sessions` tiene constraint `NOT NULL UNIQUE`. Al crear sesiones desde el importer/wizard se generará automáticamente como:

```
{program_name_slug}_s{numero_sesion}
```

Ejemplo: programa "Aurum", sesión 3 → `aurum_s3`

Si hay colisión (programa con nombre similar ya existente), se añade un sufijo numérico: `aurum_s3_2`.
