# Documentación del Proyecto Irrompible

Bienvenido a la documentación técnica del proyecto Irrompible. Esta carpeta contiene especificaciones, diseños y referencias para el desarrollo y mantenimiento del proyecto.

## 📚 Documentación de Steering (Documentos Activos)

Estos son los documentos de especificación y referencia activos del proyecto:

### 1. **[architecture-overview.md](./steering/architecture-overview.md)**
Visión general de la arquitectura del proyecto.
- Stack tecnológico (Next.js, React, TypeScript, SQLite/Turso)
- Estructura de directorios
- Módulos principales
- Flujos clave de negocio
- Características especiales (PWA, progresiones, energía)

**Leer cuando:** Necesitas entender la arquitectura general del proyecto.

---

### 2. **[database-reference.md](./steering/database-reference.md)**
Referencia técnica completa de la base de datos.
- Configuración de BD (desarrollo/producción)
- Descripción detallada de cada tabla
- Relaciones y constraints
- Índices
- Tablas eliminadas (historial)

**Leer cuando:** Necesitas entender la estructura de datos, consultas SQL o migraciones.

---

### 3. **[authentication-flow.md](./steering/authentication-flow.md)**
Sistema de autenticación y autorización.
- Modelo de usuarios (roles, estados)
- Flujo de login
- Sesión del usuario (localStorage + context)
- Admin checks y permisos
- Inicialización de admin por defecto
- Variables de entorno de autenticación

**Leer cuando:** Trabajas con autenticación, login, roles o seguridad.

---

### 4. **[data-models.md](./steering/data-models.md)**
Modelos de datos TypeScript.
- Interfaces de entidades principales (User, Program, Session, Exercise, etc.)
- Lookup tables (EnergyLevel, FeelingLevel)
- Vistas compuestas (ExerciseRow)
- Relaciones entre entidades
- Enumeraciones y tipos

**Leer cuando:** Necesitas tipos TypeScript, interfaces o entender cómo se relacionan las entidades.

---

### 5. **[deployment.md](./steering/deployment.md)**
Configuración, despliegue y producción.
- Entornos (desarrollo/producción)
- Plataforma Railway
- Base de datos Turso
- Variables de entorno en producción
- Migraciones automáticas
- Monitoreo y errores comunes
- Checklist de despliegue

**Leer cuando:** Necesitas desplegar, configurar producción o troubleshoot issues.

---

### 6. **[api-endpoints.md](./steering/api-endpoints.md)**
Especificación de endpoints de la API.
- Base URLs
- Headers requeridos
- Autenticación (POST /api/auth/login)
- Programas (GET /api/programs)
- Sesiones (GET /api/sessions)
- Ejercicios (GET /api/session/{id}/exercises)
- Entrenamientos (POST, GET /api/workouts/*)
- Historiales

**Leer cuando:** Necesitas consumir o desarrollar endpoints de la API.

---

## 📋 Especificaciones (Historiales de Desarrollo)

Estas son las especificaciones completadas del proyecto. Documentan decisiones de diseño y requisitos implementados:

### Completadas ✓

- **[specs/program-block-model/](./specs/program-block-model/)** — Modelo de bloques (sets) para estructurar ejercicios en sesiones. **Estado:** Implementado
  
- **[specs/rename-pk-fields/](./specs/rename-pk-fields/)** — Renombrado de PKs a formato `<tabla>_id`. **Estado:** Implementado
  
- **[specs/user-roles-and-programs/](./specs/user-roles-and-programs/)** — Sistema de roles, autenticación por email y asignación de programas. **Estado:** Implementado
  
- **[specs/program-import-export/](./specs/program-import-export/)** — Import/export de programas desde/a Excel. **Estado:** Documentado

---

## 🚀 Cómo Usar Esta Documentación

### Para Nuevos Desarrolladores
1. Comienza por [architecture-overview.md](./steering/architecture-overview.md)
2. Luego lee [database-reference.md](./steering/database-reference.md)
3. Finalmente [data-models.md](./steering/data-models.md) para entender los tipos

### Para Trabajar con Autenticación
- Lee [authentication-flow.md](./steering/authentication-flow.md)
- Consulta [api-endpoints.md](./steering/api-endpoints.md) para endpoints relacionados

### Para Trabajar con Entrenamientos
- Estudia [database-reference.md](./steering/database-reference.md) (tablas: sets, set_exercises, workout_logs, workout_sets)
- Revisa [api-endpoints.md](./steering/api-endpoints.md) (endpoints de workouts)

### Para Desplegar
- Sigue [deployment.md](./steering/deployment.md) paso a paso
- Prepara variables de entorno
- Usa el checklist al final

### Para Consumir APIs
- Consulta [api-endpoints.md](./steering/api-endpoints.md)
- Cada endpoint incluye ejemplos de request/response

---

## 📁 Estructura

```
.kiro/
├── README.md                    # Este archivo
├── steering/                    # Documentación de referencia activa
│   ├── architecture-overview.md
│   ├── database-reference.md
│   ├── authentication-flow.md
│   ├── data-models.md
│   ├── deployment.md
│   └── api-endpoints.md
└── specs/                       # Especificaciones de features (historial)
    ├── program-block-model/
    ├── rename-pk-fields/
    ├── user-roles-and-programs/
    └── program-import-export/
```

---

## 🔄 Mantenimiento de Documentación

Cuando hagas cambios importantes al proyecto:

1. **Base de datos:** Actualiza [database-reference.md](./steering/database-reference.md)
2. **Modelos:** Actualiza [data-models.md](./steering/data-models.md)
3. **Autenticación:** Actualiza [authentication-flow.md](./steering/authentication-flow.md)
4. **APIs:** Actualiza [api-endpoints.