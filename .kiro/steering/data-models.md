# Modelos de Datos — TypeScript

## Entidades Principales

### User

```typescript
interface User {
  users_id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'rejected';
  created_at: string;
  // password_hash no se expone en cliente
}
```

### Program

```typescript
interface Program {
  programs_id: number;
  name: string;
  description?: string;
  image_url?: string;
}
```

### Session

```typescript
interface Session {
  sessions_id: number;
  session_code: string;
  name: string;
  description?: string;
  programs_id: number;
}
```

### Exercise

```typescript
interface Exercise {
  exercises_id: number;
  name: string;
  video_url?: string;          // URL local: /videos/Nombre.3gpp
  video_url_yt?: string;       // URL YouTube
  description?: string;
  muscles?: string;            // JSON array: ["cuádriceps", "glúteos"]
  joints?: string;             // JSON array
  easier_exercises_id?: number;  // Variante más fácil
  harder_exercises_id?: number;  // Variante más difícil
}
```

### Set (Bloque)

```typescript
interface Set {
  set_id: number;
  sessions_id: number;
  description?: string;
  block_label: string;         // "1", "2A", "3B"
  block_type?: string;         // "normal", "circuit", "superset", "tabata"
  block_order: number;
}
```

### SetExercise

```typescript
interface SetExercise {
  set_exercise_id: number;
  set_id: number;
  set_number: number;          // Número de serie (1, 2, 3...)
  exercises_id: number;
  ex_order: number;            // Orden dentro del set
  reps?: string;               // "8", "8-10"
  tiempo_ej?: string;          // "30''", "2'"
  peso: number;                // DEFAULT 0
}
```

### WorkoutLog

```typescript
interface WorkoutLog {
  workout_logs_id: number;
  sessions_id: number;
  users_id: number;
  energy_levels_id?: number;
  feeling_levels_id?: number;
  duration?: number;           // Segundos
  completed_at?: string;       // DATETIME o null si en progreso
  created_at: string;          // Inicio del entrenamiento
}
```

### WorkoutSet

```typescript
interface WorkoutSet {
  workout_sets_id: number;
  workout_logs_id: number;
  exercises_id: number;
  set_number?: number;         // Número de serie
  reps_done?: number;
  weight?: number;             // Kg
  time_taken?: number;         // Segundos
}
```

### EnergyLevel (Lookup)

```typescript
interface EnergyLevel {
  energy_levels_id: number;
  label: string;               // "¡A tope!", "Bien", "Cansado", "Muy Cansado"
  pct: number;                 // 1.0, 0.75, 0.50, 0.25
}
```

### FeelingLevel (Lookup)

```typescript
interface FeelingLevel {
  feeling_levels_id: number;
  label: string;               // "Excelente", "Bien", "Normal", "Duro", "Muy Duro"
  score: number;               // 100, 80, 60, 40, 20
}
```

## Vista Compuesta: ExerciseRow

Cuando se carga una sesión, se combina información de múltiples tablas:

```typescript
interface ExerciseRow {
  set_id: number;
  block: string;               // block_label
  block_type?: string;
  set_number: number;
  ex_id: number;               // exercises_id
  ex_order: number;
  tiempo_ej?: string;
  reps?: string;
  name: string;                // Nombre del ejercicio
  video_url?: string;
  video_url_yt?: string;
  description?: string;
  muscles?: string;
  joints?: string;
  easier_id?: number;          // easier_exercises_id
  easier_name?: string;        // Nombre de la variante fácil
  harder_id?: number;          // harder_exercises_id
  harder_name?: string;        // Nombre de la variante difícil
}
```

## Relaciones

```
users (1) ──→ (M) user_programs ←─ (1) programs
users (1) ──→ (M) workout_logs ←─ (1) sessions
programs (1) ──→ (M) sessions
sessions (1) ──→ (M) sets
sets (1) ──→ (M) set_exercises
exercises (1) ──→ (M) set_exercises
exercises (M) ←→ (1) exercises (easier/harder)
workout_logs (1) ──→ (M) workout_sets
exercises (1) ──→ (M) workout_sets
energy_levels (1) ←─ (M) workout_logs
feeling_levels (1) ←─ (M) workout_logs
```

## Enumeraciones

### UserRole
```typescript
type UserRole = 'admin' | 'user';
```

### UserStatus
```typescript
type UserStatus = 'active' | 'pending' | 'rejected';
```

### BlockType
```typescript
type BlockType = 'normal' | 'circuit' |