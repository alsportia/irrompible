# Tareas de Implementación

## Task 1: Instalar dependencia xlsx y crear módulo exportador
- [x] Instalar `xlsx` (SheetJS): `npm install xlsx`
- [x] Crear `src/lib/programExporter.ts` con funciones `exportProgramToExcel(programId)` y `generateTemplateExcel()`
- [x] Consultas DB: programs + sessions + sets + set_exercises JOIN exercises
- [x] Construir workbook con 5 hojas: Programa, Sesiones, Ejercicios, Sets, Set_Exercises
- [x] Devolver `Buffer` del archivo

## Task 2: Crear módulo importador
- [x] Crear `src/lib/programImporter.ts`
- [x] Parsear y validar estructura del Excel (4 hojas, columnas obligatorias)
- [x] Validar valores: tipo_bloque ∈ {normal, circuit, superset}, bloque = letra mayúscula
- [x] Verificar referencias cruzadas entre hojas (id_sesion, id_ejercicio)
- [x] Detectar conflicto de nombre y devolver `ImportConflict` si procede
- [x] Lógica de importación en transacción: crear ejercicios nuevos → programa → sesiones → session_exercises
- [x] Generar session_code automático: `{slug}_s{n}`

## Task 3: API route de exportación
- [x] Crear `src/app/api/admin/programs/export/route.ts`
- [x] `GET ?id={programId}` → llama a `exportProgramToExcel`, devuelve xlsx con headers correctos
- [x] `GET ?template=true` → llama a `generateTemplateExcel`, devuelve plantilla vacía
- [x] Proteger con `requireAdmin`

## Task 4: API route de importación
- [x] Crear `src/app/api/admin/programs/import/route.ts`
- [x] `POST` multipart/form-data con campo `file`
- [x] Parámetros opcionales: `overwrite=true`, `newName`
- [x] Llamar a `programImporter`, manejar respuesta conflict vs success vs error
- [x] Proteger con `requireAdmin`

## Task 5: API route GET/PUT/DELETE por programa
- [x] Crear `src/app/api/admin/programs/[id]/route.ts`
- [x] `GET` → devuelve programa con sesiones y session_exercises
- [x] `PUT` → genera backup Excel, actualiza programa en transacción
- [x] `DELETE` → elimina en cascada (session_exercises → sessions → program)
- [x] Proteger con `requireAdmin`

## Task 6: Componente ProgramWizard
- [x] Crear `src/components/ProgramWizard.tsx`
- [x] Paso 1: formulario datos del programa (nombre, descripción, imagen_url)
- [x] Paso 2: gestión de sesiones (añadir, eliminar, reordenar)
- [x] Paso 3: ejercicios por sesión — buscador del catálogo, asignar bloque/tipo/series/reps, botones ↑↓
- [x] Paso 4: resumen y botón guardar
- [x] Modo edición: precarga datos del programa existente
- [x] Al guardar: POST /api/admin/programs (nuevo) o PUT /api/admin/programs/[id] (edición)

## Task 7: Componente ProgramImportExport
- [x] Crear `src/components/ProgramImportExport.tsx`
- [x] Botón "Descargar plantilla" → GET /api/admin/programs/export?template=true
- [x] Botón "Importar Excel" → input file + POST /api/admin/programs/import
- [x] Modal de conflicto: opciones renombrar o sobreescribir (con descarga automática del backup)
- [x] Indicador de carga y mensajes de éxito/error

## Task 8: Página /admin/programs
- [x] Crear `src/app/admin/programs/page.tsx`
- [x] Crear `src/components/AdminPrograms.tsx`
- [x] Lista de programas con columnas: nombre, nº sesiones, acciones (Editar, Exportar, Eliminar)
- [x] Integrar ProgramWizard y ProgramImportExport
- [x] Navegación: al guardar/cancelar wizard volver a la lista

## Task 9: Enlace desde panel /admin
- [x] Añadir botón "Gestionar programas" en `AdminClient.tsx` que navega a `/admin/programs`

## Task 10: Tipos TypeScript compartidos
- [x] Añadir a `src/types/index.ts` los tipos: `Session`, `SessionExercise`, `ExerciseRow`, `WizardSession`, `WizardExercise`, `ImportResult`, `ImportConflict`
