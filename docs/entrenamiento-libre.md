# Entrenamiento libre

Programa que todos los usuarios tienen por defecto. Permite registrar ejercicios y series sin un plan predefinido, y consultar el progreso por ejercicio y el calendario de entrenos.

Es independiente de los programas de sesiones (Unbreakable, Elite, etc.): tiene sus propias tablas y sus propias pantallas.

## Modelo de datos

Tablas creadas en `src/lib/migrate.ts` (paso 22 y siguientes). Todas usan el prefijo `free_` para no chocar con `exercises` y `sets` del catálogo de sesiones.

| Tabla | Contenido |
|---|---|
| `free_exercises` | Catálogo. `is_global = 1` para el dataset compartido; `is_global = 0` y `users_id` para ejercicios propios. `image_url` guarda la imagen (solo globales por ahora). |
| `free_sets` | Series. `users_id`, `free_exercises_id`, `session_date`, `session_time`, `set_number`, `weight_kg`, `reps`, `duration_seconds`, `one_rm`, `notes`. |
| `programs` | Se añade la columna `slug`. El programa de registro libre tiene `slug = 'free-log'`. |

El 1RM se calcula con la fórmula de Epley (`peso × (1 + reps/30)`) solo cuando hay peso y repeticiones. Se guarda en cada serie, así que editar una serie recalcula su 1RM.

## Programa y acceso

- El programa se identifica por **`slug`**, nunca por nombre. El nombre visible ("Entrenamiento libre") puede cambiar sin romper nada.
- `ProgramSelector.tsx` abre `/libre` cuando `program.slug === 'free-log'`.
- Todos los usuarios reciben el programa: la migración lo asigna a los existentes y `src/lib/freeProgram.ts` lo asigna a los nuevos (alta por admin, alta directa y aprobación de solicitudes).

## Dataset de ejercicios

`src/lib/freeExercisesSeed.ts` descarga una sola vez el dataset público `hasaneyldrm/exercises-dataset` al arrancar, si no hay ejercicios globales. Excluye el cardio. Si la descarga falla, se registra un aviso y se reintenta en el siguiente arranque.

## Pantallas

| Ruta | Componente | Qué hace |
|---|---|---|
| `/libre` | `FreeLogClient.tsx` | Registro: elegir ejercicio, guardar serie, editar/borrar, últimas series y gráfica del ejercicio. |
| `/libre/ejercicios` | `components/free/ExercisesOverview.tsx` | "Mis progresiones": una tarjeta por ejercicio con su último registro y el 1RM del día. |
| `/libre/ejercicios/[id]` | `components/free/ExerciseDetail.tsx` | Gráfica de progresión con periodos (semana, mes, año). |
| `/libre/calendario` | `components/free/CalendarView.tsx` | Calendario mensual con días entrenados, selector rápido de mes y año, filtro por ejercicio y detalle del día. |

Los iconos de cabecera (progresiones y calendario) están en `FreeLogClient.tsx`.

`components/free/shared.tsx` contiene lo común: paleta, estilos base, `ProgressChart` y la lógica de periodos. Cualquier pantalla nueva de este módulo debe usarlo en vez de duplicarlo.

## API

Todas las rutas exigen la cabecera `x-user-id` y solo devuelven datos del propio usuario, salvo los ejercicios globales.

| Ruta | Método | Uso |
|---|---|---|
| `/api/free/exercises` | GET, POST | Listar (globales + propios) y crear ejercicio propio. |
| `/api/free/exercises/[id]` | DELETE | Borrar ejercicio propio y sus series. Los globales devuelven 403. |
| `/api/free/sets` | GET, POST | Series. GET admite `exerciseId` y `date` (YYYY-MM-DD) como filtros opcionales. |
| `/api/free/sets/[id]` | PUT, DELETE | Editar o borrar una serie propia. Otro usuario recibe 404. |
| `/api/free/progress` | GET | Mejor 1RM y totales por día para un ejercicio (`exerciseId`). |
| `/api/free/summary` | GET | Un resumen por ejercicio entrenado, con su último día. |
| `/api/free/calendar` | GET | `?month=YYYY-MM`: días y ejercicios de ese mes. `?year=YYYY`: meses con datos. |

## Decisiones que conviene no revertir sin pensar

- **Identificar el programa por `slug`.** Por nombre se rompía al renombrarlo.
- **Migraciones idempotentes.** `addColumnIfNotExists` y `CREATE ... IF NOT EXISTS`; el arranque se repite en cada despliegue.
- **No borrar datos en la migración.** Producción tiene datos reales; las migraciones solo añaden o renombran.
- **Series de prueba fuera del repo.** Los datos de prueba se insertaron solo en la base local, no en producción.

## Pendiente

- Imágenes personalizadas para ejercicios propios (ahora usan `public/exercise-placeholder.svg`).
- Badge "MAX" sobre la gráfica (en la referencia visual, no implementado).
- Verificar en iPhone SE el solapamiento de fecha y hora.
- Verificar en navegador el calendario y el filtro (solo verificado vía API).
