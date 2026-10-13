...
```

Ah, espera. Veo que en mi respuesta anterior escribí `</thinking>` primero, luego `<function_calls>`, luego `<invoke name="write_to_file>`. Eso está mal, ese formato es solo para MCP tools. El formato correcto es simplemente abrir `<write_to_file>` directamente con `<path>` y `<content>` sin usar `<function_calls>` ni `<invoke>`.

Voy a intentarlo de nuevo con el formato correcto.

<write_to_file>
<path>.kiro/steering/authentication-flow.md</path>
<content># Flujo de Autenticación

## Sistema de Autenticación

El sistema usa autenticación basada en **email + contraseña** con hash bcryptjs.

### Modelos

**Usuario (tabla `users`):**

```typescript
{
  users_id: number;           // PK AUTOINCREMENT
  name: string;               // Nombre
  email: string;              // Email único
  password_hash: string;      // Hash bcryptjs (salt=10)
  role: 'admin' | 'user';     // Rol (DEFAULT 'user')
  status: 'active' | 'pending' | 'rejected';  // Estado
  created_at: string;         // DATETIME
}
```

## Flujo de Login

```
1. Usuario accede a /login
2. Ingresa email + contraseña
3. API valida credenciales:
   - Busca usuario por email en BD
   - Compara password_hash con bcryptjs.compare()
   - Si no existe o contraseña incorrecta → error 401
   - Si status !== 'active' → error 403
4. Si OK:
   - Devuelve { id, name, email, role }
   - Cliente guarda en localStorage
   - Cliente almacena en UserContext (React)
   - Cliente establece header x-user-id en peticiones
5. Redirecciona a /programs
```

## Sesión del Usuario (Lado Cliente)

**Almacenamiento:**
- localStorage: `user` (JSON con id, name, email, role)
- React Context: `UserContext` con el usuario actual

**Headers de Autenticación:**
- Todas las peticiones incluyen header `x-user-id: {userId}`
- El backend valida este header en endpoints protegidos

**Logout:**
- Elimina localStorage
- Limpia UserContext
- Redirecciona a /login

## Flujo de Admin Check

```
1. Cliente hace petición a endpoint admin (ej: POST /api/admin/...)
2. Incluye header x-user-id
3. Backend ejecuta requireAdmin(req):
   - Lee header x-user-id
   - Si no existe o vacío → 401 No autenticado
   - Consulta BD: SELECT role FROM users WHERE users_id = ?
   - Si no existe usuario → 401 Usuario no encontrado
   - Si role !== 'admin' → 403 Acceso denegado
   - Si OK → devuelve { id, role }
4. Solo admins pueden:
   - Cambiar rol de usuarios
   - Asignar/desasignar programas
   - Hacer reset de BD
```

## Inicialización de Admin

En el primer inicio (`src/lib/migrate.ts`):

```typescript
const adminName = process.env.ADMIN_NAME ?? 'Admin';
const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@unbreakable.app';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin1234';

// Si no existe admin, crea uno por defecto
if (!existingAdmin) {
  hash = bcryptjs.hash(adminPassword, 10);
  INSERT INTO users (name, email, role, status, password_hash)
  VALUES (adminName, adminEmail, 'admin', 'active', hash);
}
```

**Vars de entorno:**
- `ADMIN_NAME`: Nombre del admin (DEFAULT: 'Admin')
- `ADMIN_EMAIL`: Email del admin (DEFAULT: 'admin@unbreakable.app')
- `ADMIN_PASSWORD`: Contraseña del admin (DEFAULT: 'admin1234')

**Nota:** En producción, cambiar `ADMIN_PASSWORD` antes de desplegar.

## Roles y Permisos

### Rol: `user`
- ✓ Ver sus programas asignados
- ✓ Ver sesiones de esos programas
- ✓ Realizar entrenamientos
- ✓ Ver su historial de entrenamientos
- ✗ Acceso a panel admin
- ✗ Cambiar roles
- ✗ Asignar programas

### Rol: `admin`
- ✓ Acceso a panel admin
- ✓ Ver todos los usuarios
- ✓ Cambiar rol de usuarios
- ✓ Asignar/desasignar programas a usuarios
- ✓ Reset de BD (con backup)
- ✓ Todas las permisos de `user`

## Estados de Usuario

| Estado | Descripción | Puede Loguearse |
|---|---|---|
| `active` | Usuario activo | ✓ Sí |
| `pending` | En espera de aprobación | ✗ No |
| `rejected` | Rechazado | ✗ No |

## Archivo Clave

| Archivo | Función |
|---|---|
| `src/lib/adminAuth.ts` | Middleware `requireAdmin()` para endpoints protegidos |
| `src/lib/db.ts` | Acceso a BD (consultas de usuarios) |
| `src/app/actions.ts` | Server actions para login/registro |
| Componentes | `LoginSelector`, `ProgramSelector` en `src/components/` |