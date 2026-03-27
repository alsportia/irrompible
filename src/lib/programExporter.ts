import * as XLSX from 'xlsx';
import { DB } from './db';

interface ProgramRow { id: number; name: string; description: string | null; image_url: string | null; }
interface SessionRow { id: number; numero_sesion: number; name: string | null; }
interface SetRow {
  set_id: number; sessions_id: number; description: string | null;
  block_label: string | null; block_type: string | null; num_sets: number; block_order: number;
}
interface SetExRow {
  set_exercise_id: number; set_id: number; ex_id: number;
  ex_order: number; reps: string | null; tiempo_ej: string | null;
}
interface ExRow {
  id: number; name: string; muscles: string | null; joints: string | null;
  description: string | null; video_url: string | null; video_url_yt: string | null;
}

function buildWorkbook(
  program: ProgramRow | null,
  sessions: SessionRow[],
  exercises: ExRow[],
  sets: SetRow[],
  setExercises: SetExRow[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Programa
  const programData = program
    ? [{ nombre: program.name, descripcion: program.description ?? '', imagen_url: program.image_url ?? '' }]
    : [{ nombre: '', descripcion: '', imagen_url: '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(programData), 'Programa');

  // Sheet 2: Sesiones
  const sessionData = sessions.map((s, i) => ({
    id_sesion: s.id,
    numero_sesion: s.numero_sesion ?? i + 1,
    nombre_sesion: s.name ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessionData.length ? sessionData : [{ id_sesion: '', numero_sesion: '', nombre_sesion: '' }]), 'Sesiones');

  // Sheet 3: Ejercicios
  const exerciseData = exercises.map(e => ({
    id_ejercicio: e.id,
    nombre: e.name,
    musculos: e.muscles ?? '',
    articulaciones: e.joints ?? '',
    descripcion: e.description ?? '',
    video_url: e.video_url ?? '',
    video_url_yt: e.video_url_yt ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exerciseData.length ? exerciseData : [{ id_ejercicio: '', nombre: '', musculos: '', articulaciones: '', descripcion: '', video_url: '', video_url_yt: '' }]), 'Ejercicios');

  // Sheet 4: Sets
  const setsData = sets.map(s => ({
    set_id: s.set_id,
    id_sesion: s.sessions_id,
    description: s.description ?? '',
    block_label: s.block_label ?? '',
    block_type: s.block_type ?? 'normal',
    num_sets: s.num_sets,
    block_order: s.block_order,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(setsData.length ? setsData : [{ set_id: '', id_sesion: '', description: '', block_label: '', block_type: '', num_sets: '', block_order: '' }]), 'Sets');

  // Sheet 5: Set_Exercises
  const setExData = setExercises.map(se => ({
    set_exercise_id: se.set_exercise_id,
    set_id: se.set_id,
    id_ejercicio: se.ex_id,
    ex_order: se.ex_order,
    repeticiones: se.reps ?? '',
    tiempo: se.tiempo_ej ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(setExData.length ? setExData : [{ set_exercise_id: '', set_id: '', id_ejercicio: '', ex_order: '', repeticiones: '', tiempo: '' }]), 'Set_Exercises');

  return wb;
}

export async function exportProgramToExcel(programId: number): Promise<Buffer> {
  const program = await DB.get<ProgramRow>('SELECT programs_id as id, name, description, image_url FROM programs WHERE programs_id = ?', [programId]);
  if (!program) throw new Error(`Programa con id ${programId} no encontrado`);

  const sessions = await DB.query<SessionRow & { session_code: string }>(
    'SELECT sessions_id as id, name, session_code FROM sessions WHERE programs_id = ? ORDER BY sessions_id',
    [programId]
  );
  const sessionsWithNum: SessionRow[] = sessions.map((s, i) => {
    const match = s.session_code?.match(/_s(\d+)$/);
    return { id: s.id, name: s.name, numero_sesion: match ? parseInt(match[1]) : i + 1 };
  });

  const sessionIds = sessions.map(s => s.id);

  const sets = sessionIds.length
    ? await DB.query<SetRow>(
        `SELECT set_id, sessions_id, description, block_label, block_type, num_sets, block_order
         FROM sets WHERE sessions_id IN (${sessionIds.map(() => '?').join(',')})
         ORDER BY sessions_id, block_order`,
        sessionIds
      )
    : [];

  const setIds = sets.map(s => s.set_id);
  const setExercises = setIds.length
    ? await DB.query<SetExRow>(
        `SELECT set_exercise_id, set_id, exercises_id as ex_id, ex_order, reps, tiempo_ej
         FROM set_exercises WHERE set_id IN (${setIds.map(() => '?').join(',')})
         ORDER BY set_id, ex_order`,
        setIds
      )
    : [];

  const exercises = await DB.query<ExRow>(
    'SELECT exercises_id as id, name, muscles, joints, description, video_url, video_url_yt FROM exercises ORDER BY name'
  );

  const wb = buildWorkbook(program, sessionsWithNum, exercises, sets, setExercises);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export async function generateTemplateExcel(): Promise<Buffer> {
  const exercises = await DB.query<ExRow>(
    'SELECT exercises_id as id, name, muscles, joints, description, video_url, video_url_yt FROM exercises ORDER BY name'
  );
  const wb = buildWorkbook(null, [], exercises, [], []);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
