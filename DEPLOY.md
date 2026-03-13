# Guía de Despliegue en Vercel

## Opción 1: Vercel + Turso (Recomendada - GRATIS)

### 1. Preparar Turso (Base de datos SQLite en la nube)

```bash
# Instalar Turso CLI
brew install tursodatabase/tap/turso

# Crear cuenta (gratis)
turso auth signup

# Crear base de datos
turso db create unbreakable

# Obtener URL de conexión
turso db show unbreakable --url

# Crear token de autenticación
turso db tokens create unbreakable
```

### 2. Configurar variables de entorno en Vercel

En el dashboard de Vercel, añade estas variables:
- `TURSO_DATABASE_URL`: La URL que obtuviste
- `TURSO_AUTH_TOKEN`: El token que obtuviste

### 3. Subir datos a Turso

```bash
# Exportar tu base de datos local
sqlite3 data/unbreakable.db .dump > dump.sql

# Importar a Turso
turso db shell unbreakable < dump.sql
```

### 4. Desplegar en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desde la carpeta unbreakable-app
cd unbreakable-app
vercel

# Seguir las instrucciones en pantalla
```

---

## Opción 2: Railway (Alternativa - GRATIS con límites)

Railway soporta SQLite directamente con volúmenes persistentes.

1. Ve a https://railway.app
2. Conecta tu repositorio de GitHub
3. Selecciona la carpeta `unbreakable-app`
4. Railway detectará Next.js automáticamente
5. Añade un volumen en `/app/data` para persistir la base de datos

---

## Opción 3: Netlify (GRATIS pero requiere adaptación)

Similar a Vercel, necesitarás usar Turso o una base de datos externa.

---

## Recomendación

**Usa Vercel + Turso** porque:
- Vercel es el mejor hosting para Next.js (gratis hasta 100GB de ancho de banda)
- Turso es SQLite compatible (no necesitas cambiar código)
- Plan gratuito: 500 bases de datos, 9GB almacenamiento, 1 billón de lecturas/mes
- Latencia ultra baja
- Fácil de configurar

## Después del despliegue

Tu app estará disponible en una URL como:
`https://unbreakable-app.vercel.app`

Puedes:
- Añadirla a la pantalla de inicio en cualquier móvil (PWA)
- Funciona offline después de la primera carga
- Videos se cachean localmente
