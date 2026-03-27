# Documento de Requisitos

## Introducción

Esta feature rediseña el modelo de datos de programas de entrenamiento en la app Unbreakable para eliminar la redundancia actual de la tabla `session_exercises`, donde cada fila representa un par (ejercicio × número de serie). El nuevo modelo introduce la entidad **bloque** (`sets`) como unidad de repetición, de modo que un bloque agrupa sus ejercicios una sola vez y declara cuántas veces se repite. Esto simplifica drásticamente el wizard de creación de programas, reduce el volumen de datos y hace el modelo más expresivo.

El alcance incluye: migración de datos, nuevas tablas `sets` y `set_exercises`, actualización del wizard de 4 pasos (`ProgramWizard`), adaptación del flujo de entrenamiento (`WorkoutTracker` / `workflow/[id]/page.tsx`), y actualización de la importación/exportación Excel.

---

## Glosario

- **Bloque**: Unidad de entrenamiento dentro de una sesión. Agrupa uno o más ejercicios que se ejecutan juntos y se repiten un número determinado de veces. Representado por la tabla `sets`.
- **Set**: Sinónimo de bloque en el contexto de la base de datos (nombre de la tabla `sets`).
- **set_id**: Clave primaria de la tabla `sets`. Se usa con el mismo nombre en todas las tablas que la referencian.
- **set_exercise_id**: Clave primaria de la tabla `set_exercises`.
- **block_label**: Etiqueta de un solo carácter que identifica el bloque dentro de una sesión (p. ej. "A", "B", "C"). Limitado a 1 carácter.
- **block_type**: Tipo de bloque. Valores válidos: `normal`, `circuit`, `superset`, `super_series`, `tabata`, `interval_repetitions`, `interval_repetitions_with_pause`, `to_the_one`, `spartan_race`, `paleo_run`.
- **num_sets**: Número de veces que se repite el bloque completo.
- **block_order**: Posición ordinal del bloque dentro de la sesión (1, 2, 3…).
- **ex_order**: Posición ordinal del ejercicio dentro del bloque (1, 2, 3…).
- **session_exercises**: Tabla legacy que queda deprecada tras la migración.
- **ProgramWizard**: Componente React de 4 pasos para crear y editar programas (`ProgramWizard.tsx`).
- **WorkoutTracker**: Componente React que gestiona el flujo de entrenamiento activo (`WorkoutTracker.tsx`).
- **Expansión en memoria**: Proceso por el que el servidor convierte los bloques del nuevo modelo en una lista plana de (ejercicio × serie) para mantener la navegación paso a paso del WorkoutTracker.
- **Script de migración**: Script TypeScript/Node que transforma los datos de `session_exercises` al nuevo modelo.
- **video_url_yt**: Campo de la tabla `exercises` que almacena la URL de YouTube del vídeo de demostración.
- **video_url**: Campo de la tabla `exercises` que almacena la ruta del vídeo local.

---

## Requisitos

### Requisito 1: Nuevo esquema de base de datos

**User Story:** Como administrador, quiero que el modelo de datos represente bloques de entrenamiento como entidades propias, para poder definir un bloque una sola vez con sus ejercicios y el número de repeticiones.

#### Criterios de aceptación

1. THE Sistema SHALL crear la tabla `sets` con las columnas: `set_id INTEGER PRIMARY KEY`, `sessions_id INTEGER NOT NULL`, `description TEXT`, `block_label TEXT`, `block_type TEXT`, `num_sets INTEGER NOT NULL DEFAULT 1`, `block_order INTEGER NOT NULL`.
2. THE Sistema SHALL crear la tabla `set_exercises` con las columnas: `set_exercise_id INTEGER PRIMARY KEY`, `set_id INTEGER NOT NULL`, `exercises_id INTEGER NOT NULL`, `ex_order INTEGER NOT NULL`, `reps TEXT`, `tiempo_ej TEXT`.
3. THE Sistema SHALL definir una clave foránea de `sets.sessions_id` hacia `sessions.sessions_id` con `ON DELETE CASCADE`.
4. THE Sistema SHALL definir una clave foránea de `set_exercises.set_id` hacia `sets.set_id` con `ON DELETE CASCADE`.
5. THE Sistema SHALL definir una clave foránea de `set_exercises.exercises_id` hacia `exercises.exercises_id`.
6. THE Sistema SHALL usar el mismo nombre de campo para PKs y FKs en todas las tablas (p. ej. `set_id` se llama `set_id` tanto en `sets` como en `set_exercises`).
7. WHEN se crea la tabla `sets`, THE Sistema SHALL crear un índice sobre `(sessions_id, block_order)` para optimizar las consultas de sesión.

---

### Requisito 2: Script de migración de datos

**User Story:** Como administrador, quiero migrar los datos existentes de `session_exercises` al nuevo modelo, para no perder ningún programa ni sesión durante la transición.

#### Criterios de aceptación

1. WHEN se ejecuta el script de migración, THE Migrador SHALL agrupar las filas de `session_exercises` por `(session_id, block, block_type)` y crear un registro en `sets` por cada grupo distinto.
2. WHEN se crea un registro en `sets`, THE Migrador SHALL calcular `num_sets` como el valor máximo de `set_number` dentro del grupo `(session_id, block, block_type)`.
3. WHEN se crea un registro en `sets`, THE Migrador SHALL asignar `block_label` desde el campo `block` de `session_exercises` y `block_type` desde el campo `block_type`.
4. WHEN se crea un registro en `sets`, THE Migrador SHALL asignar `block_order` según el orden de aparición del bloque dentro de la sesión (primer `ex_order` mínimo del grupo).
5. WHEN se crean registros en `set_exercises`, THE Migrador SHALL insertar una fila por cada ejercicio único dentro del bloque (usando `set_number = 1` como referencia), preservando `ex_id`, `ex_order`, `reps` y `tiempo_ej`.
6. WHEN la migración finaliza sin errores, THE Migrador SHALL conservar la tabla `session_exercises` intacta (sin borrarla) para permitir rollback.
7. IF un ejercicio tiene `video_url` con ruta local y `video_url_yt` es NULL o vacío, THEN THE Migrador SHALL restaurar `video_url_yt` leyendo los datos de los archivos Excel de programas ubicados en `recursos/Programas Mammoth Hunters/` (Unbreakable.xlsx, Elite.xlsx, Primal.xlsx, etc.), que contienen la columna `video_url_yt` original de cada ejercicio.
8. THE Migrador SHALL ejecutarse de forma idempotente: si se ejecuta dos veces, no duplicará registros en `sets` ni `set_exercises`.
9. WHEN el script detecta que `sets` ya contiene datos para una sesión, THE Migrador SHALL omitir esa sesión y registrar un aviso en la salida estándar.

---

### Requisito 3: Actualización del wizard de creación/edición de programas

**User Story:** Como administrador, quiero definir bloques con sus ejercicios y número de repeticiones en el wizard, para no tener que introducir manualmente una fila por cada (ejercicio × serie).

#### Criterios de aceptación

1. WHEN el usuario accede al paso 3 del wizard (asignación de ejercicios), THE ProgramWizard SHALL mostrar los ejercicios agrupados por bloque, no como filas individuales por serie.
2. THE ProgramWizard SHALL permitir al usuario definir, para cada bloque: `block_label` (1 carácter), `block_type`, `num_sets` y `description` (campo de texto opcional visible en el wizard).
3. THE ProgramWizard SHALL permitir añadir uno o más ejercicios a cada bloque, con campos `ex_id`, `ex_order`, `reps` y `tiempo_ej` por ejercicio.
4. THE ProgramWizard SHALL permitir reordenar bloques dentro de una sesión mediante controles de subir/bajar.
5. THE ProgramWizard SHALL permitir reordenar ejercicios dentro de un bloque mediante controles de subir/bajar.
6. THE ProgramWizard SHALL permitir añadir y eliminar bloques dentro de una sesión.
7. THE ProgramWizard SHALL permitir añadir y eliminar ejercicios dentro de un bloque.
8. WHEN el usuario guarda el programa, THE ProgramWizard SHALL enviar al servidor la estructura de bloques con sus ejercicios (no filas individuales por serie).
9. WHEN se carga un programa existente en modo edición, THE ProgramWizard SHALL reconstruir la vista de bloques desde los datos de `sets` y `set_exercises`.
10. THE ProgramWizard SHALL mostrar en el resumen (paso 4) el número de bloques por sesión y el `num_sets` de cada bloque.
11. IF el usuario intenta guardar con un bloque sin ejercicios, THEN THE ProgramWizard SHALL mostrar un mensaje de error indicando el bloque y la sesión afectados.
12. IF el usuario intenta guardar con un ejercicio sin seleccionar en un bloque, THEN THE ProgramWizard SHALL mostrar un mensaje de error indicando la posición del ejercicio.

---

### Requisito 4: API de programas actualizada

**User Story:** Como sistema, quiero que los endpoints de creación, edición y lectura de programas usen el nuevo modelo de bloques, para mantener la consistencia entre la UI y la base de datos.

#### Criterios de aceptación

1. WHEN se recibe una petición `POST /api/admin/programs`, THE API SHALL insertar los bloques en `sets` y los ejercicios en `set_exercises` (no en `session_exercises`).
2. WHEN se recibe una petición `PUT /api/admin/programs/[id]`, THE API SHALL eliminar los bloques y ejercicios existentes del programa y reinsertarlos desde el cuerpo de la petición.
3. WHEN se recibe una petición `GET /api/admin/programs/[id]`, THE API SHALL devolver las sesiones con sus bloques (`sets`) y los ejercicios de cada bloque (`set_exercises`).
4. THE API SHALL validar que `num_sets` es un entero mayor o igual a 1 antes de insertar en `sets`.
5. THE API SHALL validar que `block_type` pertenece a la lista de valores válidos antes de insertar en `sets`.
6. IF `block_type` no es válido, THEN THE API SHALL devolver HTTP 400 con un mensaje descriptivo indicando los valores aceptados.

---

### Requisito 5: Flujo de entrenamiento activo

**User Story:** Como usuario, quiero que el entrenamiento activo funcione igual que antes (navegación paso a paso por ejercicio × serie), aunque los datos ahora vengan del nuevo modelo.

#### Criterios de aceptación

1. WHEN se carga la página `workflow/[id]`, THE Servidor SHALL consultar `sets` y `set_exercises` para obtener los bloques de la sesión.
2. WHEN se obtienen los bloques, THE Servidor SHALL expandir cada bloque en memoria generando una entrada por cada par `(ejercicio × número de serie)`, ordenadas por `block_order`, `set_number` (1..`num_sets`), `ex_order`.
3. THE Servidor SHALL pasar la lista expandida al `WorkoutTracker` con la misma forma de datos que actualmente (`block`, `block_type`, `set_number`, `exercises_id`, `ex_order`, `tiempo_ej`, `reps`, `name`, `video_url`, `video_url_yt`).
4. WHEN se aplica el nivel de energía, THE Servidor SHALL escalar `num_sets` y `reps` antes de la expansión en memoria, de modo que la expansión ya refleje los valores ajustados.
5. THE WorkoutTracker NO SHALL requerir cambios en su lógica interna de navegación como resultado de esta feature.

---

### Requisito 6: Importación y exportación Excel

**User Story:** Como administrador, quiero importar y exportar programas en Excel usando el nuevo modelo de bloques, para mantener la compatibilidad con el flujo de trabajo existente.

#### Criterios de aceptación

1. WHEN se exporta un programa, THE Exportador SHALL generar una hoja `Sets` con columnas: `set_id`, `id_sesion`, `description`, `block_label`, `block_type`, `num_sets`, `block_order`.
2. WHEN se exporta un programa, THE Exportador SHALL generar una hoja `Set_Exercises` con columnas: `set_exercise_id`, `set_id`, `id_ejercicio`, `ex_order`, `repeticiones`, `tiempo`.
3. WHEN se exporta un programa, THE Exportador SHALL mantener las hojas `Programa`, `Sesiones` y `Ejercicios` con el mismo formato actual.
4. WHEN se importa un archivo Excel con hojas `Sets` y `Set_Exercises`, THE Importador SHALL insertar los datos en las tablas `sets` y `set_exercises`.
5. THE Importador SHALL requerir que el archivo Excel tenga las hojas `Sets` y `Set_Exercises` con el nuevo formato. Los archivos Excel de programas existentes deberán ser regenerados con el nuevo formato antes de ser importados; no se soporta la conversión automática desde el formato legacy `Session_Exercises`.
6. THE Importador SHALL validar que todas las columnas obligatorias de `Sets` y `Set_Exercises` están presentes antes de procesar.
7. IF falta alguna columna obligatoria, THEN THE Importador SHALL devolver un error descriptivo indicando la hoja y la columna que falta.
8. THE Exportador SHALL generar un archivo Excel válido que, al ser reimportado, produzca un programa equivalente al original (propiedad de ida y vuelta).

---

### Requisito 7: Compatibilidad y deprecación de `session_exercises`

**User Story:** Como desarrollador, quiero que la tabla `session_exercises` quede deprecada de forma controlada, para poder eliminarla en una fase posterior sin romper la aplicación.

#### Criterios de aceptación

1. WHEN se completa la migración, THE Sistema SHALL mantener la tabla `session_exercises` en la base de datos sin modificarla.
2. THE API de programas SHALL dejar de escribir en `session_exercises` tras la migración.
3. THE Flujo de entrenamiento SHALL dejar de leer de `session_exercises` tras la migración.
4. THE ProgramWizard SHALL dejar de enviar datos en el formato de `session_exercises` tras la migración.
5. WHERE se desee eliminar `session_exercises` en el futuro, THE Sistema SHALL poder hacerlo sin afectar a ninguna funcionalidad activa.
