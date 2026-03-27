# Tasks: Renombrar campos ID de tablas

## Task 1: Actualizar migrate.ts — helper y renombrados de BD

- [x] Añadir helper `renameColumnIfExists` en `src/lib/migrate.ts`
- [x] Añadir bloque de `ALTER TABLE ... RENAME COLUMN` al final de `runMigrations()` para todas las tablas y columnas del mapa de renombrados
- [x] Actualizar todos los `CREATE TABLE IF NOT EXISTS` en `migrate.ts` para usar los nuevos nombres de columna (para BDs nuevas)

## Task 2: Actualizar actions.ts

- [x] Actualizar todas las queries SQL en `src/app/actions.ts`

## Task 3: Actualizar páginas de la app

- [x] `src/app/workflow/[id]/page.tsx`
- [x] `src/app/session/[id]/page.tsx`
- [x] `src/app/page.tsx`
- [x] `src/app/exercises/page.tsx`

## Task 4: Actualizar rutas API

- [x] `src/app/api/auth/login/route.ts`
- [x] `src/app/api/auth/register/route.ts`
- [x] `src/app/api/auth/validate/route.ts`
- [x] `src/app/api/programs/route.ts`
- [x] `src/app/api/users/route.ts`
- [x] `src/app/api/calendar/route.ts`
- [x] `src/app/api/admin/users/route.ts`
- [x] `src/app/api/admin/users/[id]/route.ts`
- [x] `src/app/api/admin/users/[id]/status/route.ts`
- [x] `src/app/api/admin/users/[id]/programs/route.ts`
- [x] `src/app/api/admin/exercises/route.ts`
- [x] `src/app/api/admin/exercises/[id]/route.ts`
- [x] `src/app/api/admin/programs/route.ts`
- [x] `src/app/api/admin/programs/[id]/route.ts`
- [x] `src/app/api/public/programs/route.ts`
- [x] `src/lib/adminAuth.ts`

## Task 5: Actualizar librerías

- [x] `src/lib/programExporter.ts`
- [x] `src/lib/programImporter.ts`

## Task 6: Actualizar tipos TypeScript

- [ ] `src/types/index.ts`: revisar si hay campos que necesiten actualización

## Task 7: Actualizar scripts

- [x] `scripts/reimport-from-excel.ts`
- [x] `scripts/migrate-to-blocks.ts`
- [x] `scripts/apply-video-corrections.ts`

## Task 8: Actualizar steering file

- [x] Actualizar `unbreakable-app/.kiro/steering/database-reference.md`
