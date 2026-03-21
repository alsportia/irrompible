import * as XLSX from 'xlsx';
import { DB } from './db';

interface ProgramRow { id: number; name: string; description: string | null; image_url: string | null; }
interface SessionRow { id: number; numero_sesion: number; name: string | null; }
interface SERow {
  session_id: number; ex_id: number; block: string | null; block_type: string | null;
  set_number: number | null; ex_order: number | null; reps: string | null; tiempo_ej: string | null;
}
interface ExRow {
  id: number; name: string; muscles: string | null; joints: string | null;
  description: string | null; video_url: string | null; video_url_yt: string | null;
}

function buildWorkbook(
  program: ProgramRow | null,
  sessions: SessionRow[],
  exercises: ExRow[],
  sessionExercises: SERow[]
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

  // Sheet 4: Session_Exercises
  const seData = sessionExercises.map(se => ({
    id_sesion: se.session_id,
    id_ejercicio: se.ex_id,
    bloque: se.block ?? '',
    tipo_bloque: se.block_type ?? 'normal',
    numero_serie: se.set_number ?? 1,
    orden_ejercicio: se.ex_order ?? 1,
    repeticiones: se.reps ?? '',
    tiempo: se.tiempo_ej ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(seData.length ? seData : [{ id_sesion: '', id_ejercicio: '', bloque: '', tipo_bloque: '', numero_serie: '', orden_ejercicio: '', repeticiones: '', tiempo: '' }]), 'Session_Exercises');

  return wb;
}

export async function exportProgramToExcel(programId: number): Promise<Buffer> {
  const program = await DB.get<ProgramRow>('SELECT id, name, description, image_url FROM programs WHERE id = ?', [programId]);
  if (!program) throw new Error(`Programa con id ${programId} no encontrado`);

  const sessions = await DB.query<SessionRow & { session_code: string }>(
    'SELECT id, name, session_code FROM sessions WHERE program_id = ? ORDER BY id',
    [programId]
  );
  // Derive numero_sesion from session_code or position
  const sessionsWithNum: SessionRow[] = sessions.map((s, i) => {
    const match = s.session_code?.match(/_s(\d+)$/);
    return { id: s.id, name: s.name, numero_sesion: match ? parseInt(match[1]) : i + 1 };
  });

  const sessionIds = sessions.map(s => s.id);
  const sessionExercises = sessionIds.length
    ? await DB.query<SERow>(
        `SELECT session_id, ex_id, block, block_type, set_number, ex_order, reps, tiempo_ej
         FROM session_exercises WHERE session_id IN (${sessionIds.map(() => '?').join(',')})
         ORDER BY session_id, ex_order`,
        sessionIds
      )
    : [];

  const exercises = await DB.query<ExRow>(
    'SELECT id, name, muscles, joints, description, video_url, video_url_yt FROM exercises ORDER BY name'
  );

  const wb = buildWorkbook(program, sessionsWithNum, exercises, sessionExercises);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export async function generateTemplateExcel(): Promise<Buffer> {
  const exercises = await DB.query<ExRow>(
    'SELECT id, name, muscles, joints, description, video_url, video_url_yt FROM exercises ORDER BY name'
  );
  const wb = buildWorkbook(null, [], exercises, []);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
