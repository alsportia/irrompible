/**
 * Script de reimportación: borra sesiones/sets de todos los programas
 * y los reimporta desde los Excel originales al nuevo modelo (sets + set_exercises).
 *
 * Uso (desde el directorio unbreakable-app):
 *   npx tsx scripts/reimport-from-excel.ts
 */

import sqlite3 from 'sqlite3';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'data/unbreakable.db');
const RECURSOS_PATH = path.resolve(process.cwd(), '../recursos/Programas Mammoth Hunters');

// Map Excel filename → program name in DB
const PROGRAM_FILES: { file: string; programName: string }[] = [
  { file: 'Unbreakable.xlsx',  programName: 'Unbreakable' },
  { file: 'Elite.xlsx',        programName: 'Elite' },
  { file: 'Primal.xlsx',       programName: 'Primal' },
  { file: 'Ring Master.xlsx',  programName: 'Ring Master' },
  { file: 'Aurum.xlsx',        programName: 'Aurum' },
];

// ─── Promisified DB helpers ──────────────────────────────────────────────────

function dbAll<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows as T[]));
  });
}

function dbGet<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row as T));
  });
}

function dbRun(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<{ lastID: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID });
    });
  });
}

function dbExec(db: sqlite3.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => err ? reject(err) : resolve());
  });
}

// ─── Excel parsing ───────────────────────────────────────────────────────────

interface ExcelRow {
  block: string;
  block_type: string;
  set_number: number;
  ex_id: number;
  ex_order: number;
  tiempo_ej: number | string;
  reps: number | string;
  video_url_yt: string;
}

interface ParsedSession {
  rows: ExcelRow[];
  description: string | null;
}

function parseSessionSheet(ws: XLSX.WorkSheet): ParsedSession {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  if (rawRows.length === 0) return { rows: [], description: null };

  // Detect column name variants (Aurum uses Bloque/Bloque_type)
  const first = rawRows[0];
  const blockCol   = 'block'      in first ? 'block'      : 'Bloque';
  const btCol      = 'block_type' in first ? 'block_type' : 'Bloque_type';
  const setCol     = 'Set';
  const exIdCol    = 'ex_id';
  const exOrderCol = 'ex_order';
  const tiempoCol  = 'tiempo ej.';
  const repsCol    = 'reps';
  const videoCol   = 'Vídeo' in first ? 'Vídeo' : ('vídeo' in first ? 'vídeo' : ('Video' in first ? 'Video' : 'Vídeos'));

  // The session description is a long text stored in one of the unnamed/extra columns.
  // We scan all rows and all non-standard columns to find the longest text value.
  const standardCols = new Set([blockCol, btCol, setCol, 'Ejercicio', exIdCol, exOrderCol, tiempoCol, repsCol, videoCol]);
  let description: string | null = null;
  let maxLen = 10; // minimum length to consider
  for (const r of rawRows) {
    for (const [key, val] of Object.entries(r)) {
      if (standardCols.has(key)) continue;
      const str = String(val ?? '').trim();
      if (str.length > maxLen) {
        maxLen = str.length;
        description = str;
      }
    }
  }

  const rows = rawRows
    .filter(r => r[exIdCol] && Number(r[exIdCol]) > 0)
    .map(r => ({
      block:      String(r[blockCol] ?? ''),
      block_type: String(r[btCol] ?? '').trim(),
      set_number: Number(r[setCol]) || 1,
      ex_id:      Number(r[exIdCol]),
      ex_order:   Number(r[exOrderCol]) || 1,
      tiempo_ej:  r[tiempoCol] as string | number ?? '',
      reps:       r[repsCol] as string | number ?? '',
      video_url_yt: String(r[videoCol] ?? '').trim(),
    }));

  return { rows, description };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Base de datos no encontrada en: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new sqlite3.Database(DB_PATH);
  await dbRun(db, 'PRAGMA foreign_keys = ON');
  await dbRun(db, 'PRAGMA journal_mode = WAL');

  // Ensure new tables exist (recreate clean)
  await dbExec(db, `
    DROP TABLE IF EXISTS set_exercises;
    DROP TABLE IF EXISTS sets;
    CREATE TABLE sets (
      set_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      description TEXT,
      block_label TEXT,
      block_type  TEXT,
      block_order INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sets_session_order ON sets (session_id, block_order);
    CREATE TABLE set_exercises (
      set_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id          INTEGER NOT NULL REFERENCES sets(set_id) ON DELETE CASCADE,
      set_number      INTEGER NOT NULL,
      ex_id           INTEGER NOT NULL REFERENCES exercises(id),
      ex_order        INTEGER NOT NULL,
      reps            TEXT,
      tiempo_ej       TEXT
    );
  `);

  let totalSessions = 0;
  let totalBlocks = 0;
  let totalExercises = 0;

  for (const { file, programName } of PROGRAM_FILES) {
    const filePath = path.join(RECURSOS_PATH, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[WARN] No se encontró ${file}, se omite`);
      continue;
    }

    const program = await dbGet<{ id: number }>(db, 'SELECT id FROM programs WHERE name = ?', [programName]);
    if (!program) {
      console.warn(`[WARN] Programa "${programName}" no encontrado en DB, se omite`);
      continue;
    }

    console.log(`\nProcesando ${file} (program_id=${program.id})...`);

    const wb = XLSX.readFile(filePath);
    const sessionSheets = wb.SheetNames.filter(n =>
      n.toLowerCase().startsWith('sesion') || n.toLowerCase().startsWith('sesión')
    );

    // Delete existing sessions for this program
    // Must delete dependent rows first (workout_logs don't have CASCADE)
    const existingSessions = await dbAll<{ id: number }>(db, 'SELECT id FROM sessions WHERE program_id = ?', [program.id]);
    for (const s of existingSessions) {
      await dbRun(db, 'DELETE FROM workout_sets WHERE workout_log_id IN (SELECT id FROM workout_logs WHERE session_id = ?)', [s.id]).catch(() => {});
      await dbRun(db, 'DELETE FROM workout_logs WHERE session_id = ?', [s.id]).catch(() => {});
    }
    await dbRun(db, 'DELETE FROM sessions WHERE program_id = ?', [program.id]);

    const slug = slugify(programName);

    for (let i = 0; i < sessionSheets.length; i++) {
      const sheetName = sessionSheets[i];
      const sessionNum = i + 1;
      const ws = wb.Sheets[sheetName];
      const { rows, description } = parseSessionSheet(ws);

      if (rows.length === 0) {
        console.log(`  [SKIP] ${sheetName}: sin datos`);
        continue;
      }

      // Create session
      const sessionCode = `${slug}_s${sessionNum}`;
      const sesResult = await dbRun(db, 'INSERT INTO sessions (session_code, name, description, program_id) VALUES (?,?,?,?)',
        [sessionCode, sheetName, description, program.id]);
      const sessionId = sesResult.lastID;

      // Update video_url_yt for exercises that have it in the Excel
      for (const row of rows) {
        if (row.video_url_yt && row.video_url_yt.startsWith('http')) {
          await dbRun(db, 'UPDATE exercises SET video_url_yt = ? WHERE id = ? AND (video_url_yt IS NULL OR video_url_yt = "")',
            [row.video_url_yt, row.ex_id]);
        }
      }

      // Group rows by block label (preserving order of first appearance)
      const blockOrder: string[] = [];
      const blockGroups = new Map<string, ExcelRow[]>();
      const blockTypes = new Map<string, string>();

      for (const row of rows) {
        const key = String(row.block);
        if (!blockGroups.has(key)) {
          blockGroups.set(key, []);
          blockOrder.push(key);
          blockTypes.set(key, '');
        }
        // Take first non-empty block_type
        if (!blockTypes.get(key) && row.block_type) {
          blockTypes.set(key, row.block_type);
        }
        blockGroups.get(key)!.push(row);
      }

      let bOrder = 1;
      for (const blockKey of blockOrder) {
        const groupRows = blockGroups.get(blockKey)!;
        const blockType = blockTypes.get(blockKey) || 'normal';

        // Insert set (no num_sets — rows in set_exercises carry set_number)
        const setResult = await dbRun(db,
          'INSERT INTO sets (session_id, block_label, block_type, block_order) VALUES (?,?,?,?)',
          [sessionId, blockKey, blockType, bOrder]);
        const setId = setResult.lastID;
        totalBlocks++;

        // Insert all distinct (set_number, ex_id, ex_order) rows
        for (const row of groupRows) {
          const exExists = await dbGet<{ id: number }>(db, 'SELECT id FROM exercises WHERE id = ?', [row.ex_id]);
          if (!exExists) {
            console.warn(`  [WARN] ${sheetName} bloque ${blockKey}: ex_id=${row.ex_id} no existe, se omite`);
            continue;
          }
          const tiempoVal = row.tiempo_ej !== '' && Number(row.tiempo_ej) !== 0 ? String(row.tiempo_ej) : null;
          const repsVal   = row.reps !== '' && row.reps !== 0 && row.reps !== '0' ? String(row.reps) : null;
          await dbRun(db,
            'INSERT INTO set_exercises (set_id, set_number, ex_id, ex_order, reps, tiempo_ej) VALUES (?,?,?,?,?,?)',
            [setId, row.set_number, row.ex_id, row.ex_order, repsVal, tiempoVal]);
          totalExercises++;
        }

        bOrder++;
      }

      totalSessions++;
    }

    console.log(`  ✓ ${sessionSheets.length} sesiones importadas`);
  }

  db.close();

  console.log(`\n✓ Reimportación completada:`);
  console.log(`  Sesiones creadas: ${totalSessions}`);
  console.log(`  Bloques creados: ${totalBlocks}`);
  console.log(`  Ejercicios de bloque creados: ${totalExercises}`);
}

main().catch(e => {
  console.error('Error fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
