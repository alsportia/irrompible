# Documento de Requisitos

## Introducción

Esta funcionalidad permite a los administradores de **unbreakable-app** crear, importar y exportar programas de entrenamiento completos mediante archivos Excel y un asistente visual (wizard). Un programa completo incluye sus sesiones y los ejercicios asignados a cada sesión con todos sus parámetros (bloque, tipo de bloque, número de serie, orden, repeticiones y tiempo).

El objetivo es eliminar la dependencia de scripts Python externos para cargar programas, y ofrecer una interfaz accesible para gestionar el catálogo de programas directamente desde el panel de administración.

---

## Glosario

- **Program**: Programa de entrenamiento. Entidad raíz que agrupa sesiones. Tabla `programs`.
- **Session**: Sesión de entrenamiento perteneciente a un programa. Tabla `sessions`.
- **Exercise**: Ejercicio del catálogo global. Tabla `exercises`.
- **SessionExercise**: Asignación de un ejercicio a una sesión con sus parámetros. Tabla `session_exercises`.
- **Block**: Letra que agrupa ejercicios dentro de una sesión (A, B, C, D…).
- **BlockType**: Tipo de agrupación del bloque. Valores permitidos: `normal`, `circuit`, `superset`.
- **ExcelTemplate**: Archivo `.xlsx` con cuatro hojas: `Programa`, `Sesiones`, `Ejercicios` y `Session_Exercises`.
- **Importer**: Módulo del sistema que procesa un ExcelTemplate y persiste los datos en la base de datos.
- **Exporter**: Módulo del sistema que lee un programa de la base de datos y genera un ExcelTemplate.
- **ProgramWizard**: Interfaz visual para crear y editar programas completos sin usar Excel.
- **Admin**: Usuario con rol `admin` en la aplicación.
- **Backup**: Copia de seguridad de un programa existente generada automáticamente antes de sobreescribirlo.

---

## Requisitos

### Requisito 1: Estructura del archivo Excel

**User Story:** Como administrador, quiero que el archivo Excel tenga un formato estándar con cuatro hojas bien definidas, para poder crear y editar programas fuera de la aplicación y luego importarlos.

#### Criterios de aceptación

1. THE ExcelTemplate SHALL contener exactamente cuatro hojas con los nombres `Programa`, `Sesiones`, `Ejercicios` y `Session_Exercises`.
2. THE ExcelTemplate SHALL definir en la hoja `Programa` las columnas: `nombre` (obligatorio), `descripcion` (opcional) e `imagen_url` (opcional).
3. THE ExcelTemplate SHALL definir en la hoja `Sesiones` las columnas: `id_sesion` (identificador interno para relacionar con Session_Exercises), `numero_sesion` (obligatorio) y `nombre_sesion` (opcional).
4. THE ExcelTemplate SHALL definir en la hoja `Ejercicios` las columnas: `id_ejercicio` (identificador interno para relacionar con Session_Exercises), `nombre` (obligatorio), `musculos` (opcional), `articulaciones` (opcional), `descripcion` (opcional), `video_url` (opcional) y `video_url_yt` (opcional).
5. THE ExcelTemplate SHALL definir en la hoja `Session_Exercises` las columnas: `id_sesion` (obligatorio, referencia a hoja Sesiones), `id_ejercicio` (obligatorio, referencia a hoja Ejercicios), `bloque` (obligatorio), `tipo_bloque` (obligatorio), `numero_serie` (obligatorio), `orden_ejercicio` (obligatorio), `repeticiones` (opcional) y `tiempo` (opcional).
6. WHEN el campo `tipo_bloque` de la hoja `Session_Exercises` contiene un valor, THE ExcelTemplate SHALL aceptar únicamente los valores `normal`, `circuit` o `superset`.
7. WHEN el campo `bloque` de la hoja `Session_Exercises` contiene un valor, THE ExcelTemplate SHALL aceptar únicamente letras mayúsculas (A, B, C, D…).
8. THE ExcelTemplate SHALL requerir que el valor del campo `id_ejercicio` en la hoja `Session_Exercises` coincida con un `id_ejercicio` existente en la hoja `Ejercicios`.
9. THE ExcelTemplate SHALL requerir que el valor del campo `id_sesion` en la hoja `Session_Exercises` coincida con un `id_sesion` existente en la hoja `Sesiones`.

---

### Requisito 2: Descarga de plantilla Excel

**User Story:** Como administrador, quiero descargar una plantilla Excel con todos los ejercicios actuales pre-cargados en la hoja `Ejercicios`, para poder empezar a construir un programa sin tener que copiar los ejercicios manualmente.

#### Criterios de aceptación

1. WHEN el Admin solicita la plantilla, THE Exporter SHALL generar un ExcelTemplate con la hoja `Programa` vacía, la hoja `Sesiones` vacía, la hoja `Session_Exercises` vacía y la hoja `Ejercicios` con todos los ejercicios existentes en la base de datos.
2. WHEN el Admin solicita la plantilla, THE Exporter SHALL completar la hoja `Ejercicios` con los campos `id_ejercicio`, `nombre`, `musculos`, `articulaciones`, `descripcion`, `video_url` y `video_url_yt` de cada ejercicio, usando el `id` de la DB como `id_ejercicio`.
3. THE Exporter SHALL devolver el archivo con el nombre `plantilla_programa.xlsx`.
4. THE Exporter SHALL completar la hoja `Ejercicios` con los datos actuales de la base de datos en el momento de la descarga.

---

### Requisito 3: Exportación de un programa existente

**User Story:** Como administrador, quiero exportar un programa existente a Excel, para poder revisarlo, modificarlo y volver a importarlo.

#### Criterios de aceptación

1. WHEN el Admin selecciona un programa para exportar, THE Exporter SHALL generar un ExcelTemplate con los datos del programa en la hoja `Programa`, sus sesiones en la hoja `Sesiones`, todos los ejercicios del catálogo en la hoja `Ejercicios` y las relaciones sesión-ejercicio en la hoja `Session_Exercises`.
2. WHEN el Admin selecciona un programa para exportar, THE Exporter SHALL incluir en la hoja `Session_Exercises` una fila por cada SessionExercise del programa, con todos sus campos.
3. THE Exporter SHALL devolver el archivo con el nombre `{nombre_programa}.xlsx` (nombre del programa en minúsculas con guiones en lugar de espacios).
4. FOR ALL programas exportados e importados sin modificaciones, THE Importer SHALL producir un programa equivalente al original (propiedad de ida y vuelta).

---

### Requisito 4: Importación desde Excel

**User Story:** Como administrador, quiero importar un programa completo desde un archivo Excel, para cargar programas nuevos o actualizados sin necesidad de scripts externos.

#### Criterios de aceptación

1. WHEN el Admin sube un archivo Excel válido, THE Importer SHALL crear un registro en `programs` con los datos de la hoja `Programa`.
2. WHEN el Admin sube un archivo Excel válido, THE Importer SHALL crear los registros en `sessions` con los datos de la hoja `Sesiones`.
3. WHEN el Admin sube un archivo Excel válido, THE Importer SHALL crear los registros en `session_exercises` con los datos de la hoja `Session_Exercises`, resolviendo los `id_sesion` e `id_ejercicio` del Excel a los IDs reales de la DB.
4. WHEN la hoja `Ejercicios` contiene un ejercicio cuyo nombre no existe en la base de datos, THE Importer SHALL crear el ejercicio nuevo antes de procesar la hoja `Session_Exercises`.
5. WHEN la hoja `Ejercicios` contiene un ejercicio cuyo nombre ya existe en la base de datos, THE Importer SHALL utilizar el ejercicio existente sin modificarlo.
6. WHEN el archivo Excel contiene un programa cuyo nombre ya existe en la base de datos, THE Importer SHALL preguntar al Admin si desea crear un programa nuevo con nombre modificado o sobreescribir el existente.
7. WHEN el Admin elige sobreescribir un programa existente, THE Importer SHALL generar automáticamente un Backup del programa original antes de realizar cualquier modificación.
8. WHEN el Admin elige sobreescribir un programa existente, THE Backup SHALL ser un ExcelTemplate descargable con todos los datos del programa original, nombrado `{nombre_programa}_backup_{timestamp}.xlsx`.
9. IF el archivo subido no tiene el formato ExcelTemplate esperado (hojas incorrectas, columnas faltantes), THEN THE Importer SHALL retornar un error descriptivo indicando qué parte del formato es incorrecta, sin crear ningún registro parcial.
10. IF una fila de la hoja `Session_Exercises` referencia un `id_ejercicio` que no existe en la hoja `Ejercicios`, THEN THE Importer SHALL retornar un error descriptivo indicando la fila y el id no encontrado, sin crear ningún registro parcial.
11. IF el campo `tipo_bloque` de una fila contiene un valor no permitido, THEN THE Importer SHALL retornar un error descriptivo indicando la fila y el valor inválido, sin crear ningún registro parcial.
12. THE Importer SHALL ejecutar toda la importación dentro de una transacción de base de datos, de forma que un error en cualquier paso revierta todos los cambios.

---

### Requisito 5: Wizard de creación y edición de programas

**User Story:** Como administrador, quiero crear y editar programas completos desde la interfaz de la aplicación sin usar Excel, para gestionar programas de forma rápida y visual.

#### Criterios de aceptación

1. THE ProgramWizard SHALL presentar al Admin un formulario con los campos `nombre` (obligatorio), `descripcion` (opcional) e `imagen_url` (opcional) para definir el programa.
2. THE ProgramWizard SHALL permitir al Admin añadir múltiples sesiones al programa, cada una con un `nombre_sesion` opcional y un `numero_sesion` asignado automáticamente.
3. THE ProgramWizard SHALL permitir al Admin añadir ejercicios a cada sesión seleccionándolos del catálogo de ejercicios existente en la base de datos.
4. THE ProgramWizard SHALL permitir al Admin asignar a cada ejercicio de la sesión los campos: `bloque` (letra A–Z), `tipo_bloque` (normal/circuit/superset), `numero_serie` y `repeticiones` o `tiempo`.
5. THE ProgramWizard SHALL permitir al Admin reordenar los ejercicios dentro de una sesión mediante botones de subir y bajar, actualizando el campo `ex_order` automáticamente.
6. WHEN el Admin reordena ejercicios, THE ProgramWizard SHALL mantener el campo `ex_order` como una secuencia de enteros consecutivos sin huecos.
7. WHEN el Admin guarda el programa nuevo, THE ProgramWizard SHALL validar que el nombre del programa no esté vacío y que cada sesión tenga al menos un ejercicio.
8. THE ProgramWizard SHALL permitir al Admin cargar un programa existente para editarlo, mostrando todos sus datos actuales precargados en el formulario.
9. WHEN el Admin guarda cambios sobre un programa existente, THE ProgramWizard SHALL generar automáticamente un Backup del programa original antes de aplicar los cambios.
10. IF el nombre del programa nuevo ya existe en la base de datos, THEN THE ProgramWizard SHALL mostrar un mensaje de error sin guardar el programa.
11. WHEN el Admin guarda el programa correctamente, THE ProgramWizard SHALL crear o actualizar los registros en `programs`, `sessions` y `session_exercises` en una única transacción.

---

### Requisito 6: Integración en el panel de administración

**User Story:** Como administrador, quiero acceder a la gestión de programas desde el panel de administración, pero en una página dedicada para no sobrecargar el panel principal.

#### Criterios de aceptación

1. THE Admin panel (`/admin`) SHALL mostrar un enlace o botón que navegue a la página de gestión de programas (`/admin/programs`).
2. THE página `/admin/programs` SHALL ser una página dedicada con acceso a las funciones: importar programa, exportar programa, descargar plantilla y crear/editar programa mediante wizard.
3. WHEN una operación de importación o exportación está en curso, THE Admin SHALL ver un indicador de progreso o carga.
4. WHEN una operación finaliza con éxito, THE Admin SHALL ver un mensaje de confirmación.
5. WHEN una operación finaliza con error, THE Admin SHALL ver el mensaje de error descriptivo retornado por el Importer o el Exporter.
6. THE Admin SHALL poder descargar el archivo exportado directamente desde el navegador sin necesidad de pasos adicionales.
7. WHEN el Importer detecta un conflicto de nombre de programa, THE Admin SHALL ver un diálogo modal con las opciones: renombrar el programa nuevo o sobreescribir el existente.

---

### Requisito 7: Seguridad y control de acceso

**User Story:** Como sistema, quiero que solo los administradores puedan importar, exportar y crear programas, para proteger la integridad de los datos.

#### Criterios de aceptación

1. WHEN una petición a los endpoints de importación, exportación o plantilla no incluye un `x-user-id` válido con rol `admin`, THE System SHALL retornar un error HTTP 403.
2. THE System SHALL validar el rol del usuario en cada petición a los endpoints de gestión de programas, sin depender únicamente del estado del cliente.
