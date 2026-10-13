# Arquitectura — Visión General

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| **Frontend** | React | 19.2 |
| **Framework** | Next.js (App Router) | 16.1 |
| **Lenguaje** | TypeScript | 5 |
| **Base de Datos** | SQLite (dev) / Turso (prod) | sqlite3 5.1 / @libsql/client 0.14 |
| **Autenticación** | bcryptjs | 3.0 |
| **UI/Animaciones** | Framer Motion | 12.35 |
| **Iconos** | Lucide React | 0.577 |
| **PWA** | next-pwa | 5.6 |
| **Deploy** | Railway | — |

## Estructura de Directorios

```
irrompible/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── actions.ts          # Server actions (DB operations)
│   │   ├── session/[id]/       # Página de sesión
│   │   ├── programs/           # Página de programas
│   │   ├── workflow/[id]/      # Flujo de entrenamiento
│   │   ├── admin/              # Panel de administración
│   │   └── login/              # Autenticación
│   ├── components/             # Componentes React reutilizables
│   ├── lib/                    # Utilidades
│   │   ├── db.ts               # Singleton SQLite/Turso
│   │   ├── migrate.ts          # Migraciones de BD
│   │   ├── actions/            # Funciones server-side
│   │   └── adminAuth.ts        # Middleware de autenticación
│   └── types/                  # Tipos TypeScript compartidos
├── public/                     # Assets estáticos
├── scripts/                    # Scripts de utilidad
│   ├── reimport-from-excel.ts
│   ├── apply-video-corrections.ts
│   └── generate-video-conflicts-excel.ts
├── .kiro/                      # Documentación de especificaciones
├── seed.db                     # Base de datos semilla
└── data/                       # BD en desarrollo (generado)
```

## Módulos Principales

### 1. **Autenticación (Authentication Module)**
- Sistema de login con email + contraseña (bcryptjs)
- Roles: `admin`, `user`
- Estados de usuario: `active`, `pending`, `rejected`
- Persistencia: localStorage + header `x-user-id`

### 2. **Gestión de Programas (Programs Module)**
- Entidad `programs` con descripción e imagen
- Relación M:N `user_programs`: un usuario puede tener múltiples programas
- Cada programa agrupa sesiones de entrenamiento

### 3. **Sesiones y Ejercicios (Workout Structure)**
- `sessions`: sesiones de entrenamiento agrupadas por programa
- `sets`: bloques dentro de sesiones (con tipo: normal, circuit, superset, tabata, etc.)
- `set_exercises`: ejercicios dentro de sets (expandidos por serie)
- `exercises`: catálogo de ejercicios con videos locales/YouTube y progresiones (easier/harder)

### 4. **Tracking de Entrenamientos (Workout Tracking)**
- `workout_logs`: registro de sesión iniciada/completada con nivel de energía y sensación post-entrenamiento
- `workout_sets`: ejercicios realizados dentro de un entrenamiento con peso, reps y duración
- Historial de pesos por ejercicio para cada usuario

### 5. **Panel de Administración (Admin Module)**
- Gestión de usuarios (role, estado)
- Asignación de programas a usuarios
- Reset de base de datos con backup

## Flujos Clave de Negocio

### Flujo 1: Login → Seleccionar Programa → Sesión

```
Login (email/pwd)
  ↓
UserContext (id, name, email, role)
  ↓
Seleccionar programa
  ↓
Ver sesiones del programa
  ↓
Seleccionar sesión
```

### Flujo 2: Realizar Entrenamiento

```
Elegir sesión
  ↓
Seleccionar nivel de energía
  ↓
Cargar ejercicios (con energía aplicada)
  ↓
Crear workout_log
  ↓
Por cada ejercicio:
  - Cargar último peso usado
  - Ejecutar ejercicio
  - Guardar weight + time_taken + reps
  ↓
Completar entrenamiento
  ↓
Registrar sensación post-entrenamiento
```

### Flujo 3: Admin - Gestión de Usuarios y Programas

```
Admin Panel
  ↓
Listar usuarios + roles
  ↓
Cambiar rol (admin/user)
  ↓
Asignar/desasignar programas
  ↓
Reset de BD (con backup)
```

## Base de Datos

**Ubicación:**
- Desarrollo: `data/unbreakable.db` (local, SQLite)
- Producción: Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)

**Seed automático:**
- Si BD está vacía o no existe, se copia `seed.db` a `data/unbreakable.db`
- El seed contiene ejercicios, programas y sesiones (NO usuarios ni logs)

**Migraciones:**
- Incrementales en `src/lib/migrate.ts`
- Se ejecutan automáticamente al iniciar la app
- Incluyen: creación de tablas, renombrado de PKs, inserción de datos de referencia

## Deployment

- **Plataforma:** Railway
- **Variables de entorno:**
 - `TURSO_DATABASE_URL`: URL de la BD en Turso (producción)
 - `TURSO_AUTH_TOKEN`: Token de autenticación para Turso
 - `ADMIN_