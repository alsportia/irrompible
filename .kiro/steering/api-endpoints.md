# API Endpoints — Especificación

## Base URL

- **Desarrollo:** `http://localhost:3000`
- **Producción:** `https://irrompible.railway.app`

## Headers Requeridos

```
x-user-id: {userId}  # En todas las peticiones autenticadas
Content-Type: application/json
```

## Autenticación

### POST /api/auth/login

Login con email + contraseña.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "users_id": 1,
  "name": "John Doe",
  "email": "user@example.com",
  "role": "user",
  "created_at": "2026-10-13T12:00:00Z"
}
```

**Errors:**
- 400: Email vacío o inválido
- 401: Credenciales incorrectas
- 403: Usuario no activo

---

## Programas

### GET /api/programs

Obtener programas asignados al usuario actual.

**Request:**
```
Headers: x-user-id
```

**Response (200):**
```json
[
  {
    "programs_id": 1,
    "name": "Unbreakable",
    "description": "Programa de fortaleza",
    "image_url": "https://..."
  }
]
```

---

## Sesiones

### GET /api/sessions?program_id={id}

Obtener sesiones de un programa.

**Request:**
```
Headers: x-user-id
Query: program_id (INTEGER, required)
```

**Response (200):**
```json
[
  {
    "sessions_id": 1,
    "session_code": "unbreakable_s1",
    "name": "Sesión 1",
    "description": "Descripción...",
    "programs_id": 1
  }
]
```

---

## Ejercicios (Sesión)

### GET /api/session/{sessionId}/exercises

Obtener ejercicios de una sesión (sin energía aplicada).

**Request:**
```
Headers: x-user-id
Params: sessionId (INTEGER)
```

**Response (200):**
```json
[
  {
    "set_id": 1,
    "block": "1",
    "block_type": "normal",
    "set_number": 1,
    "ex_id": 42,
    "ex_order": 1,
    "tiempo_ej": "30''",
    "reps": "8-10",
    "name": "Sentadilla",
    "video_url": "/videos/sentadilla.3gpp",
    "video_url_yt": "https://youtube.com/...",
    "description": "Técnica...",
    "muscles": "[\"cuádriceps\", \"glúteos\"]",
    "joints": "[\"rodilla\", \"cadera\"]",
    "easier_id": 41,
    "easier_name": "Sentadilla asistida",
    "harder_id": 43,
    "harder_name": "Sentadilla con peso"
  }
]
```

---

## Entrenamientos (Workouts)

### POST /api/workouts/start

Iniciar un entrenamiento con un nivel de energía.

**Request:**
```json
{
  "sessions_id": 1,
  "energy_levels_id": 2
}
```

**Response (200):**
```json
{
  "workout_logs_id": 100,
  "sessions_id": 1,
  "users_id": 5,
  "energy_levels_id": 2,
  "created_at": "2026-10-13T12:30:00Z"
}
```

---

### POST /api/workouts/{logId}/exercise

Guardar un ejercicio completado.

**Request:**
```json
{
  "exercises_id": 42,
  "set_number": 1,
  "weight": 70.5,
  "time_taken": 45
}
```

**Response (200):**
```json
{
  "workout_sets_id": 500,
  "workout_logs_id": 100,
  "exercises_id": 42,
  "set_number": 1,
  "weight": 70.5,
  "time_taken": 45
}
```

---

### POST /api/workouts/{logId}/finish

Completar un entrenamiento.

**Request:**
```json
{
  "duration": 1200,
  "feeling_levels_id": 3
}
```

**Response (200):**
```json
{
  "workout_logs_id": 100,
  "completed_at": "2026-10-13T12:50:00Z",
  "duration": 1200,
  "feeling_levels_id": 3
}
```

---

### GET /api/workouts/{userId}/history

Obtener historial de entrenamientos.

**Request:**
```
Headers: x-user-id
Params: userId
```

**Response (200):**
```json
[
  {
    "workout_logs_id": 100,
    "sessions_id": 1,
    "duration": 1200,
    "completed_at": "2026-10-13T12:50:00Z",
    "energy_level": "Bien",
    "feeling_level": "Normal"
  }
]
```

---

### GET /api/exercises/{exerciseId}/last-weight

Obtener último peso usado en un ejercicio.

**Request:**
```
Headers: x-user-id
Params: exerciseId
```

**Response (200):**
```json
{
  "weight": 70.5,
  "date": "2026-10-12T15:30:00Z"
}