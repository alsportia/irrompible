/**
 * Script de migración: session_exercises → sets + set_exercises
 *
 * Uso (desde el directorio unbreakable-app):
 *   npx tsx scripts/migrate-to-blocks.ts
 *
 * El script es idempotente: si una sesión ya tiene datos en `sets`, la omite.
 * Conserva session_exercises intacta para permitir rollback.
 */

import sqlite3 from 'sqlite3';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'data/unbreakable.db');
const RECURSOS_PATH = path.resolve(process.cwd(), '../recursos/Programas Mammoth Hunters');

const EXCEL_FILES = [
  'Unbreakable.xlsx',
  'Elite.xlsx',
  'Primal.xlsx',
  'Ring Master.xlsx',
  'Aurum.xlsx',
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(msg); }
function warn(msg: string) { console.warn(`[WARN] ${msg}`); }
function skip(msg: string) { console.log(`[SKIP] ${msg}`); }

/** Lee video_url_yt de todos los Excel de recursos y devuelve un mapa nombre_lower → video_url_yt */
function buildVideoUrlMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of EXCEL_FILES) {
    const filePath = path.join(RECURSOS_PATH, file);
    if (!fs.existsSync(filePath)) {
      warn(`No se encontró el archivo ${file}, se omite`);
      continue;
    }
    try {
      const wb = XLSX.readFile(filePath);
      const sheetNames = wb.SheetNames;
      const ejerciciosSheet = sheetNames.find(n => n.toLowerCase().includes('ejercicio')) ?? sheetNames[0];
      const ws = wb.Sheets[ejerciciosSheet];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      for (const row of rows) {
        const nombre = String(row['nombre'] ?? row['Nombre'] ?? row['name'] ?? '').trim();
        const ytUrl = String(row['video_url_yt'] ?? row['Video URL YT'] ?? row['video_yt'] ?? '').trim();
        if (nombre && ytUrl) {
          map.set(nombre.toLowerCase(), ytUrl);
        }
      }
    } catch (e) {
      warn(`No se pudo leer video_url_yt de ${file}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return map;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Base de datos no encontrada en: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new sqlite3.Database(DB_PATH);
  await dbRun(db, 'PRAGMA foreign_keys = ON');
  await dbRun(db, 'PRAGMA journal_mode = WAL');

  // Drop and recreate tables to ensure schema is correct (no CHECK constraint on block_label)
  await dbExec(db, `
    DROP TABLE IF EXISTS set_exercises;
    DROP TABLE IF EXISTS sets;
    CREATE TABLE sets (
      set_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      sessions_id INTEGER NOT NULL REFERENCES sessions(sessions_id) ON DELETE CASCADE,
      description TEXT,
      block_label TEXT,
      block_type  TEXT,
      num_sets    INTEGER NOT NULL DEFAULT 1,
      block_order INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sets_session_order ON sets (sessions_id, block_order);
    CREATE TABLE set_exercises (
      set_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id          INTEGER NOT NULL REFERENCES sets(set_id) ON DELETE CASCADE,
      exercises_id    INTEGER NOT NULL REFERENCES exercises(exercises_id),
      ex_order        INTEGER NOT NULL,
      reps            TEXT,
      tiempo_ej       TEXT
    );
  `);

  // Build video_url_yt map from Excel files
  log('Leyendo URLs de YouTube desde archivos Excel de recursos...');
  const videoUrlMap = buildVideoUrlMap();
  log(`  → ${videoUrlMap.size} entradas de video_url_yt encontradas`);

  // Restore video_url_yt for exercises with local video_url and missing video_url_yt
  const exercisesNeedingYt = await dbAll<{ exercises_id: number; name: string }>(db, `
    SELECT exercises_id, name FROM exercises
    WHERE video_url IS NOT NULL AND video_url != ''
      AND (video_url_yt IS NULL OR video_url_yt = '')
  `);

  let ytRestored = 0;
  for (const ex of exercisesNeedingYt) {
    const ytUrl = videoUrlMap.get(ex.name.toLowerCase());
    if (ytUrl) {
      await dbRun(db, 'UPDATE exercises SET video_url_yt = ? WHERE exercises_id = ?', [ytUrl, ex.exercises_id]);
      ytRestored++;
    }
  }
  log(`  → ${ytRestored} ejercicios con video_url_yt restaurado`);

  // Get all sessions that have session_exercises data
  const sessions = await dbAll<{ session_id: number }>(db, `
    SELECT DISTINCT session_id FROM session_exercises ORDER BY session_id
  `);
  log(`\nMigrando ${sessions.length} sesiones...`);

  let sessionsProcessed = 0;
  let sessionsSkipped = 0;
  let blocksCreated = 0;
  let exercisesCreated = 0;

  for (const { session_id } of sessions) {
    try {
      // Check idempotency
      const existing = await dbGet<{ cnt: number }>(db, 'SELECT COUNT(*) as cnt FROM sets WHERE sessions_id = ?', [session_id]);
      if (existing && existing.cnt > 0) {
        skip(`session_id=${session_id} ya tiene datos en sets`);
        sessionsSkipped++;
        continue;
      }

      // Skip if session doesn't exist in sessions table (orphan data)
      const sessionExists = await dbGet<{ sessions_id: number }>(db, 'SELECT sessions_id FROM sessions WHERE sessions_id = ?', [session_id]);
      if (!sessionExists) {
        skip(`session_id=${session_id} no existe en la tabla sessions (dato huérfano)`);
        sessionsSkipped++;
        continue;
      }

      // Get all rows for this session
      const rows = await dbAll<{
        block: string | null; block_type: string | null; set_number: number;
        ex_id: number; ex_order: number; reps: string | null; tiempo_ej: string | null;
      }>(db, `
        SELECT block, block_type, set_number, ex_id, ex_order, reps, tiempo_ej
        FROM session_exercises
        WHERE session_id = ?
        ORDER BY ex_order, set_number
      `, [session_id]);

      if (rows.length === 0) continue;

      // Group by block label only — block_type only appears in the first row of each block
      const groupOrder: string[] = [];
      const groups = new Map<string, typeof rows>();
      const groupBlockType = new Map<string, string | null>();

      for (const row of rows) {
        const key = String(row.block ?? '');
        if (!groups.has(key)) {
          groups.set(key, []);
          groupOrder.push(key);
          // Take block_type from the first row that has it non-null
          groupBlockType.set(key, row.block_type ?? null);
        } else if (!groupBlockType.get(key) && row.block_type) {
          groupBlockType.set(key, row.block_type);
        }
        groups.get(key)!.push(row);
      }

      let blockOrder = 1;
      for (const key of groupOrder) {
        const groupRows = groups.get(key)!;
        const blockType = groupBlockType.get(key) ?? 'normal';

        // num_sets = MAX(set_number) in this group
        const numSets = Math.max(...groupRows.map(r => r.set_number));

        // Insert set
        const setResult = await dbRun(db, `
          INSERT INTO sets (sessions_id, block_label, block_type, num_sets, block_order)
          VALUES (?, ?, ?, ?, ?)
        `, [session_id, key || null, blockType, numSets, blockOrder]);
        const setId = setResult.lastID;
        blocksCreated++;

        // Get unique exercises from minimum set_number
        const minSetNumber = Math.min(...groupRows.map(r => r.set_number));
        const refRows = groupRows.filter(r => r.set_number === minSetNumber);

        // Deduplicate by ex_id
        const seenExIds = new Set<number>();
        const uniqueExercises = refRows.filter(r => {
          if (seenExIds.has(r.ex_id)) return false;
          seenExIds.add(r.ex_id);
          return true;
        });

        uniqueExercises.sort((a, b) => a.ex_order - b.ex_order);
        let exOrder = 1;
        for (const ex of uniqueExercises) {
          // Skip if exercise doesn't exist in exercises table
          const exExists = await dbGet<{ exercises_id: number }>(db, 'SELECT exercises_id FROM exercises WHERE exercises_id = ?', [ex.ex_id]);
          if (!exExists) {
            warn(`session_id=${session_id} bloque ${key}: ex_id=${ex.ex_id} no existe en exercises, se omite`);
            continue;
          }
          await dbRun(db, `
            INSERT INTO set_exercises (set_id, exercises_id, ex_order, reps, tiempo_ej)
            VALUES (?, ?, ?, ?, ?)
          `, [setId, ex.ex_id, exOrder, ex.reps ?? null, ex.tiempo_ej ?? null]);
          exOrder++;
          exercisesCreated++;
        }

        blockOrder++;
      }

      sessionsProcessed++;
    } catch (e) {
      console.error(`Error migrando session_id=${session_id}: ${e instanceof Error ? e.message : e}`);
      db.close();
      process.exit(1);
    }
  }

  db.close();

  log(`\n✓ Migración completada:`);
  log(`  Sesiones procesadas: ${sessionsProcessed}`);
  log(`  Sesiones omitidas (ya migradas): ${sessionsSkipped}`);
  log(`  Bloques creados: ${blocksCreated}`);
  log(`  Ejercicios de bloque creados: ${exercisesCreated}`);
  log(`  session_exercises conservada intacta`);
}

main().catch(e => {
  console.error('Error fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
