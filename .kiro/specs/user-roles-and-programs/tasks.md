# Plan de Implementación: User Roles and Programs

## Overview

Implementación incremental que extiende el sistema de usuarios de Unbreakable para soportar autenticación por email, roles (`admin`/`user`), control de acceso a programas y panel de administración. Cada tarea construye sobre la anterior, terminando con la integración completa.

## Tasks

- [x] 1. Migración de base de datos
  - [x] 1.1 Crear script de migración idempotente en `src/lib/migrate.ts`
    - Añadir columnas `email TEXT UNIQUE` y `role TEXT NOT NULL DEFAULT 'user'` a la tabla `users` (con comprobación previa de existencia para compatibilidad SQLite)
    - Crear tabla `programs` con `INSERT OR IGNORE INTO programs (name) VALUES ('Unbreakable')`
    - Crear tabla `user_programs` con clave primaria compuesta y `ON DELETE CASCADE`
    - Asignar programa "Unbreakable" a todos los usuarios existentes sin programas asignados
    - Exportar función `runMigrations()` que ejecute todos los pasos en orden
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.2 Integrar `runMigrations()` en el arranque de la app
    - Llamar a `runMigrations()` en `DB.getInstance()` o en un módulo de inicialización importado desde `src/lib/db.ts`
    - _Requirements: 7.1, 7.5_

  - [ ]* 1.3 Escribir property test para Property 8: Migración idempotente
    - **Property 8: Migración es idempotente**
    - **Validates: Requirements 7.5**
    - Ejecutar `runMigrations()` N veces y verificar que el estado final de la BD es idéntico

  - [ ]* 1.4 Escribir property test para Property 9: Asignación de programas en migración
    - **Property 9: Asignación de programas en migración**
    - **Validates: Requirements 7.4**
    - Para cualquier usuario existente antes de la migración, verificar que tiene acceso a "Unbreakable" después

- [x] 2. Helper de autorización server-side
  - [x] 2.1 Crear `src/lib/adminAuth.ts` con la función `requireAdmin(req)`
    - Leer header `x-user-id`, consultar BD, verificar `role = 'admin'`
    - Devolver el objeto `{id, role}` si es admin, o `NextResponse` con 401/403 si no
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 2.2 Escribir property test para Property 5: Endpoint admin rechaza no autenticados
    - **Property 5: Endpoint admin rechaza usuarios no autenticados**
    - **Validates: Requirements 8.1, 8.3**
    - Para cualquier petición sin `x-user-id` válido, verificar respuesta HTTP 401

  - [ ]* 2.3 Escribir property test para Property 6: Endpoint admin rechaza rol `user`
    - **Property 6: Endpoint admin rechaza usuarios con rol `user`**
    - **Validates: Requirements 8.2, 8.3**
    - Para cualquier usuario con `role = 'user'`, verificar respuesta HTTP 403

- [x] 3. Endpoints de autenticación
  - [x] 3.1 Crear `src/app/api/auth/login/route.ts` — POST
    - Validar que el body contiene `email` no vacío (400 si vacío)
    - Buscar usuario por email en BD; devolver `{id, name, email, role}` con 200 o 404
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ]* 3.2 Escribir property test para Property 1: Login por email es función total
    - **Property 1: Login por email es una función total sobre usuarios registrados**
    - **Validates: Requirements 1.3, 1.6**
    - Para cualquier email almacenado en la BD, verificar que el endpoint devuelve 200 con `{id, name, email, role}`

  - [ ]* 3.3 Escribir property test para Property 2: Email vacío o no registrado es rechazado
    - **Property 2: Email vacío o no registrado es rechazado**
    - **Validates: Requirements 1.4, 1.5**
    - Para cualquier string vacío o email no registrado, verificar que el endpoint devuelve 400 o 404

  - [x] 3.4 Crear `src/app/api/auth/validate/route.ts` — GET
    - Leer header `x-user-id`, consultar BD, devolver `{valid: true}` con 200 o `{valid: false}` con 401
    - _Requirements: 8.4_

- [x] 4. Endpoint de programas del usuario
  - [x] 4.1 Crear `src/app/api/programs/route.ts` — GET
    - Leer header `x-user-id`, devolver los programas asignados a ese usuario via JOIN `user_programs`
    - Devolver array vacío `[]` si el usuario no tiene programas asignados
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 4.2 Escribir property test para Property 4: Consulta de programas devuelve solo los asignados
    - **Property 4: Consulta de programas devuelve solo los asignados**
    - **Validates: Requirements 3.3, 3.5**
    - Para cualquier usuario y conjunto de programas asignados, verificar que la respuesta contiene exactamente esos programas

- [ ] 5. Checkpoint — Verificar base de datos y endpoints de auth
  - Asegurarse de que todos los tests pasan hasta este punto. Consultar al usuario si hay dudas.

- [x] 6. Actualización de UserContext
  - [x] 6.1 Actualizar la interfaz `User` en `src/lib/userContext.tsx`
    - Añadir campos `email: string` y `role: 'admin' | 'user'` al tipo `User`
    - Añadir validación de sesión al cargar desde `localStorage`: llamar a `/api/auth/validate` con `x-user-id`; si devuelve 401, limpiar el contexto
    - _Requirements: 1.6, 2.5, 8.4_

  - [x] 6.2 Crear `src/types/index.ts` con los tipos `Program` y `UserWithPrograms`
    - _Requirements: 3.2_

- [x] 7. Componente LoginSelector
  - [x] 7.1 Crear `src/components/LoginSelector.tsx`
    - Input de email + botón de login; llamar a `POST /api/auth/login`
    - Mostrar "Introduce tu email" si el campo está vacío
    - Mostrar "Email no encontrado" si la respuesta es 404
    - Al login exitoso, llamar a `setUser({id, name, email, role})` y redirigir a `/programs`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 7.2 Actualizar `src/components/HomeClient.tsx` para usar `LoginSelector` en lugar de `UserSelector`
    - Reemplazar el import y el render de `UserSelector` por `LoginSelector`
    - _Requirements: 1.2_

- [x] 8. Componente ProgramSelector
  - [x] 8.1 Crear `src/components/ProgramSelector.tsx`
    - Al montar, llamar a `GET /api/programs` con header `x-user-id`
    - Mostrar un botón por cada programa; al pulsar, navegar a `/?programId={id}`
    - Mostrar "No tienes programas asignados. Contacta con el administrador." si el array está vacío
    - Mostrar nombre del usuario autenticado
    - Mostrar botón de acceso al Panel Admin si `user.role === 'admin'`
    - Incluir botón de cerrar sesión que llame a `setUser(null)` y redirija a `/`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 3.4_

  - [x] 8.2 Crear `src/app/programs/page.tsx`
    - Server Component que renderiza `ProgramSelector`
    - _Requirements: 4.1_

- [x] 9. Actualización de HomeClient para recibir programId
  - [x] 9.1 Modificar `src/app/page.tsx` para leer `programId` de `searchParams`
    - Pasar `programId` a `HomeClient` como prop
    - Filtrar sesiones por programa si `programId` está presente (JOIN con tabla de sesiones del programa o filtro por nombre)
    - _Requirements: 4.3_

  - [x] 9.2 Actualizar `src/components/HomeClient.tsx` para aceptar prop `programId`
    - Añadir `programId` a la firma del componente y usarlo en la lógica de sesiones
    - _Requirements: 4.3_

- [x] 10. Actualización de API /api/users
  - [x] 10.1 Modificar `src/app/api/users/route.ts`
    - `GET`: devolver `id, name, email, role` en lugar de solo `id, name`
    - `POST`: aceptar campo `email` en el body; asignar `role: 'user'` por defecto
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 10.2 Escribir property test para Property 3: Rol por defecto en creación de usuario
    - **Property 3: Rol por defecto en creación de usuario**
    - **Validates: Requirements 2.2, 2.3**
    - Para cualquier usuario creado sin especificar rol, verificar que `role = 'user'` en la BD

- [x] 11. Endpoints de administración
  - [x] 11.1 Crear `src/app/api/admin/users/route.ts` — GET
    - Usar `requireAdmin` para proteger el endpoint
    - Devolver lista completa de usuarios con `id, name, email, role`
    - _Requirements: 5.1, 8.1, 8.2, 8.3_

  - [x] 11.2 Crear `src/app/api/admin/users/[id]/role/route.ts` — PATCH
    - Usar `requireAdmin`; validar que el rol recibido es `admin` o `user`
    - Actualizar `role` en la BD y devolver el usuario actualizado
    - _Requirements: 5.2, 5.3, 5.5, 8.1, 8.2_

  - [ ]* 11.3 Escribir property test para Property 7: Cambio de rol es persistente y consistente
    - **Property 7: Cambio de rol es persistente y consistente**
    - **Validates: Requirements 5.3, 5.5**
    - Para cualquier usuario y rol válido, verificar que tras el PATCH la BD refleja el nuevo rol

  - [x] 11.4 Crear `src/app/api/admin/users/[id]/programs/route.ts` — GET y PUT
    - `GET`: devolver programas asignados al usuario (requiere admin)
    - `PUT`: reemplazar los programas asignados al usuario con el array recibido (requiere admin)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2_

  - [x] 11.5 Crear `src/app/api/admin/programs/route.ts` — GET
    - Usar `requireAdmin`; devolver todos los programas disponibles
    - _Requirements: 6.1, 8.1, 8.2_

- [x] 12. Panel de administración
  - [x] 12.1 Crear `src/components/AdminClient.tsx`
    - Cargar lista de usuarios desde `GET /api/admin/users`
    - Para cada usuario: mostrar nombre, email, rol actual y programas asignados
    - Permitir cambiar el rol con un selector; llamar a `PATCH /api/admin/users/[id]/role`
    - Permitir asignar/revocar programas con checkboxes; llamar a `PUT /api/admin/users/[id]/programs`
    - Mostrar confirmación antes de revocar el último programa de un usuario
    - Actualizar la UI de forma optimista sin recargar la página
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 12.2 Crear `src/app/admin/page.tsx`
    - Server Component que verifica el rol del usuario (redirige a `/programs` si no es admin)
    - Renderiza `AdminClient`
    - _Requirements: 5.4, 8.2_

- [x] 13. Checkpoint final — Integración completa
  - Asegurarse de que todos los tests pasan. Verificar el flujo completo: login → selección de programa → home → admin. Consultar al usuario si hay dudas.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los property tests usan `fast-check` con mínimo 100 iteraciones por propiedad
- Cada property test debe incluir el comentario: `// Feature: user-roles-and-programs, Property N: <texto>`
- La validación de permisos admin siempre se hace server-side consultando la BD, nunca confiando en el cliente
