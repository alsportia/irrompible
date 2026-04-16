import * as XLSX from 'xlsx';
import { DB } from './db';
import { exportProgramToExcel } from './programExporter';
import type { ImportResult, ImportConflict } from '@/types';

const VALID_BLOCK_TYPES = ['normal', 'circuit', 'superset', 'super_series', 'tabata', 'interval_repetitions_with_pause', 'interval_repetitions', 'to_the_one', 'spartan_race', 'paleo_run'];

interface ExcelPrograma { nombre: string; descripcion?: string; imagen_url?: string; }
interface ExcelSesion { id_sesion: number | string; numero_sesion: number; nombre_sesion?: string; }
interface ExcelEjercicio {
  id_ejercicio: number | string; nombre: string; musculos?: string; articulaciones?: string;
  descripcion?: string; video_url?: string; video_url_yt?: string;
}
interface ExcelSet {
  set_id: number | string; id_sesion: number | string; description?: string;
  block_label?: string; block_type?: string; num_sets: number; block_order: number;
}
interface ExcelSetEx {
  set_exercise_id: number | string; set_id: number | string; id_ejercicio: number | string;
  ex_order: number; repeticiones?: string; tiempo?: string;
}

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseSheet<T>(wb: XLSX.WorkBook, sheetName: string): T[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Hoja "${sheetName}" no encontrada en el archivo Excel`);
  return XLSX.utils.sheet_to_json<T>(ws, { defval: '' });
}

function validateColumns(rows: unknown[], required: string[], sheetName: string): void {
  if (rows.length === 0) return;
  const first = rows[0] as Record<string, unknown>;
  const keys = Object.keys(first);
  for (const col of required) {
    if (!keys.includes(col)) throw new Error(`Columna obligatoria "${col}" no encontrada en hoja "${sheetName}"`);
  }
}

export async function importProgramFromExcel(
  buffer: Buffer,
  options?: { overwrite?: boolean; newName?: string }
): Promise<ImportResult | ImportConflict> {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  // Parse sheets
  const programaRows = parseSheet<ExcelPrograma>(wb, 'Programa');
  const sesionesRows = parseSheet<ExcelSesion>(wb, 'Sesiones');
  const ejerciciosRows = parseSheet<ExcelEjercicio>(wb, 'Ejercicios');
  const setsRows = parseSheet<ExcelSet>(wb, 'Sets');
  const setExRows = parseSheet<ExcelSetEx>(wb, 'Set_Exercises');

  if (programaRows.length === 0) throw new Error('La hoja "Programa" está vacía');

  // Validate columns
  validateColumns(programaRows, ['nombre'], 'Programa');
  validateColumns(sesionesRows, ['id_sesion', 'numero_sesion'], 'Sesiones');
  validateColumns(ejerciciosRows, ['id_ejercicio', 'nombre'], 'Ejercicios');
  validateColumns(setsRows, ['set_id', 'id_sesion', 'num_sets', 'block_order'], 'Sets');
  validateColumns(setExRows, ['set_exercise_id', 'set_id', 'id_ejercicio', 'ex_order'], 'Set_Exercises');

  const programName = options?.newName || String(programaRows[0].nombre).trim();
  if (!programName) throw new Error('El nombre del programa es obligatorio');

  // Validate cross-references
  const excelExIds = new Set(ejerciciosRows.map(e => String(e.id_ejercicio)));
  const excelSesIds = new Set(sesionesRows.map(s => String(s.id_sesion)));
  const excelSetIds = new Set(setsRows.map(s => String(s.set_id)));

  for (let i = 0; i < setsRows.length; i++) {
    const row = setsRows[i];
    if (!excelSesIds.has(String(row.id_sesion))) {
      throw new Error(`Fila ${i + 2} de Sets: id_sesion "${row.id_sesion}" no existe en hoja Sesiones`);
    }
    if (row.block_type && !VALID_BLOCK_TYPES.includes(String(row.block_type))) {
      // Accept any block_type — legacy values are allowed
    }
  }

  for (let i = 0; i < setExRows.length; i++) {
    const row = setExRows[i];
    if (!excelExIds.has(String(row.id_ejercicio))) {
      throw new Error(`Fila ${i + 2} de Set_Exercises: id_ejercicio "${row.id_ejercicio}" no existe en hoja Ejercicios`);
    }
    if (!excelSetIds.has(String(row.set_id))) {
      throw new Error(`Fila ${i + 2} de Set_Exercises: set_id "${row.set_id}" no existe en hoja Sets`);
    }
  }

  // Check name conflict
  const existing = await DB.get<{ id: number; name: string }>('SELECT programs_id as id, name FROM programs WHERE name = ?', [programName]);
  if (existing && !options?.overwrite) {
    return { conflict: true, existingId: existing.id, existingName: existing.name };
  }

  // For the current DB schema, `set_exercises` stores one row per (set_number, exercise).
  // The Excel format stores `num_sets` in the Sets sheet, and one row per exercise in Set_Exercises.
  // On import we expand rows for set_number = 1..num_sets.

  const excelSetIdToNumSets = new Map<string, number>();
  for (const set of setsRows) {
    excelSetIdToNumSets.set(String(set.set_id), Math.max(1, Number(set.num_sets) || 1));
  }

  await DB.run('BEGIN');
  try {
    // If overwrite, delete existing program (backup should have been generated by caller)
    if (existing && options?.overwrite) {
      await DB.run('DELETE FROM sessions WHERE programs_id = ?', [existing.id]);
      await DB.run('DELETE FROM programs WHERE programs_id = ?', [existing.id]);
    }

    // Resolve exercises: create new ones, map excel id → db id
    const excelIdToDbId = new Map<string, number>();
    let exercisesCreated = 0;
    for (const ex of ejerciciosRows) {
      const exName = String(ex.nombre).trim();
      if (!exName) continue;
      const dbEx = await DB.get<{ exercises_id: number }>('SELECT exercises_id FROM exercises WHERE name = ?', [exName]);
      if (dbEx) {
        excelIdToDbId.set(String(ex.id_ejercicio), dbEx.exercises_id);
      } else {
        const result = await DB.run(
          'INSERT INTO exercises (name, muscles, joints, description, video_url, video_url_yt) VALUES (?,?,?,?,?,?)',
          [exName, ex.musculos || null, ex.articulaciones || null, ex.descripcion || null, ex.video_url || null, ex.video_url_yt || null]
        );
        excelIdToDbId.set(String(ex.id_ejercicio), result.id);
        exercisesCreated++;
      }
    }

    // Create program
    const slug = slugify(programName);
    const progResult = await DB.run(
      'INSERT INTO programs (name, description, image_url) VALUES (?,?,?)',
      [programName, programaRows[0].descripcion || null, programaRows[0].imagen_url || null]
    );
    const programId = progResult.id;

    // Create sessions and map excel session id → db session id
    const excelSesIdToDbId = new Map<string, number>();
    for (const ses of sesionesRows) {
      const num = Number(ses.numero_sesion) || 1;
      let sessionCode = `${slug}_s${num}`;
      const existingCode = await DB.get('SELECT sessions_id FROM sessions WHERE session_code = ?', [sessionCode]);
      if (existingCode) sessionCode = `${slug}_s${num}_${programId}`;
      const sesResult = await DB.run(
        'INSERT INTO sessions (session_code, name, programs_id) VALUES (?,?,?)',
        [sessionCode, ses.nombre_sesion || null, programId]
      );
      excelSesIdToDbId.set(String(ses.id_sesion), sesResult.id);
    }

    // Create sets and map excel set_id → db set_id
    const excelSetIdToDbId = new Map<string, number>();
    for (const set of setsRows) {
      const dbSessionId = excelSesIdToDbId.get(String(set.id_sesion));
      if (!dbSessionId) continue;
      const setResult = await DB.run(
        'INSERT INTO sets (sessions_id, description, block_label, block_type, block_order) VALUES (?,?,?,?,?)',
        [dbSessionId, set.description || null, set.block_label || null, set.block_type || 'normal', Number(set.block_order) || 1]
      );
      excelSetIdToDbId.set(String(set.set_id), setResult.id);
    }

    // Create set_exercises (expanded to include set_number)
    for (const se of setExRows) {
      const dbSetId = excelSetIdToDbId.get(String(se.set_id));
      const dbExId = excelIdToDbId.get(String(se.id_ejercicio));
      if (!dbSetId || !dbExId) continue;
      const numSets = excelSetIdToNumSets.get(String(se.set_id)) ?? 1;
      for (let setNumber = 1; setNumber <= numSets; setNumber++) {
        await DB.run(
          'INSERT INTO set_exercises (set_id, set_number, exercises_id, ex_order, reps, tiempo_ej) VALUES (?,?,?,?,?,?)',
          [dbSetId, setNumber, dbExId, Number(se.ex_order) || 1, se.repeticiones || null, se.tiempo || null]
        );
      }
    }

    await DB.run('COMMIT');
    return { programId, sessionsCreated: sesionesRows.length, exercisesCreated };
  } catch (e) {
    await DB.run('ROLLBACK');
    throw e;
  }
}

export async function generateBackupExcel(programId: number): Promise<Buffer> {
  return exportProgramToExcel(programId);
}
