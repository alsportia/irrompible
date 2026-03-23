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
export type BlockType =
  | 'normal' | 'circuit' | 'superset' | 'super_series'
  | 'tabata' | 'interval_repetitions' | 'interval_repetitions_with_pause'
  | 'to_the_one' | 'spartan_race' | 'paleo_run';

export interface WizardBlockExercise {
  tempId: string;
  ex_id: number;
  ex_name: string;
  ex_order: number;
  reps: string;
  tiempo_ej: string;
}

export interface WizardBlock {
  tempId: string;
  block_label: string;   // 1 carácter, p.ej. "A"
  block_type: BlockType;
  num_sets: number;      // >= 1
  description: string;   // opcional, visible en wizard
  block_order: number;
  exercises: WizardBlockExercise[];
}

export interface WizardSession {
  tempId: string;
  numero_sesion: number;
  nombre_sesion: string;
  blocks: WizardBlock[];
}

export interface WizardState {
  program: { name: string; description: string; image_url: string };
  sessions: WizardSession[];
  activeSessionIndex: number;
}

// Legacy wizard types (kept for reference during migration)
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

// Full program with sessions for wizard/edit (new block model)
export interface ProgramFull extends Program {
  sessions: SessionFull[];
}

export interface SessionFull extends Session {
  blocks: BlockFull[];
}

export interface BlockFull {
  set_id: number;
  block_label: string;
  block_type: string;
  num_sets: number;
  description: string | null;
  block_order: number;
  exercises: BlockExerciseFull[];
}

export interface BlockExerciseFull {
  set_exercise_id: number;
  ex_id: number;
  ex_name: string;
  ex_order: number;
  reps: string | null;
  tiempo_ej: string | null;
}
