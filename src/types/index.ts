import type { User } from "@/lib/userContext";

export interface Program {
  id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
}

export interface UserWithPrograms extends User {
  programs: Program[];
}

export interface Session {
  id: number;
  session_code: string;
  name?: string | null;
  description?: string | null;
  program_id: number;
}

export interface SessionExercise {
  id: number;
  session_id: number;
  block?: string | null;
  block_type?: string | null;
  set_number?: number | null;
  ex_id?: number | null;
  ex_order?: number | null;
  tiempo_ej?: string | null;
  reps?: string | null;
}

export interface ExerciseRow {
  id: number;
  name: string;
  video_url?: string | null;
  video_url_yt?: string | null;
  description?: string | null;
  muscles?: string | null;
  joints?: string | null;
  easier_id?: number | null;
  harder_id?: number | null;
}

// Wizard types
export interface WizardExercise {
  tempId: string;
  ex_id: number;
  ex_name: string;
  bloque: string;
  tipo_bloque: 'normal' | 'circuit' | 'superset';
  set_number: number;
  ex_order: number;
  reps: string;
  tiempo_ej: string;
}

export interface WizardSession {
  tempId: string;
  numero_sesion: number;
  nombre_sesion: string;
  exercises: WizardExercise[];
}

export interface WizardState {
  program: { name: string; description: string; image_url: string };
  sessions: WizardSession[];
  activeSessionIndex: number;
}

// Importer types
export interface ImportResult {
  programId: number;
  sessionsCreated: number;
  exercisesCreated: number;
}

export interface ImportConflict {
  conflict: true;
  existingId: number;
  existingName: string;
}

// Full program with sessions for wizard/edit
export interface ProgramFull extends Program {
  sessions: SessionFull[];
}

export interface SessionFull extends Session {
  exercises: SessionExerciseFull[];
}

export interface SessionExerciseFull extends SessionExercise {
  ex_name?: string;
}
