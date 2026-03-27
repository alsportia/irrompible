/**
 * Lee el Excel revisado (video-conflicts.xlsx) y actualiza video_url_yt en la BD:
 * - Si una fila tiene "x" en Correcto → actualiza el ejercicio con esa URL
 * - Si un exercise_id aparece en el Excel pero ninguna fila tiene "x" → borra la URL
 *
 * Uso: npx tsx scripts/apply-video-corrections.ts
 */

import * as XLSX from 'xlsx';
import sqlite3 from 'sqlite3';
import * as path from 'path';

const EXCEL_PATH = path.resolve(process.cwd(), 'scripts/video-conflicts.xlsx');
const DB_PATH = path.resolve(process.cwd(), 'data/unbreakable.db');

function dbRun(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, err => err ? reject(err) : resolve());
  });
}

function dbGet<T>(db: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row as T));
  });
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  // Group by exercise_id
  const byId = new Map<number, { url: string; correct: boolean }[]>();
  for (const r of rows) {
    const exId = Number(r['exercise_id']);
    if (!exId) continue;
    const url = String(r['video_url_yt'] ?? '').trim();
    const correct = String(r['Correcto'] ?? '').trim().toLowerCase() === 'x';
    if (!byId.has(exId)) byId.set(exId, []);
    byId.get(exId)!.push({ url, correct });
  }

  const db = new sqlite3.Database(DB_PATH);

  let updated = 0;
  let cleared = 0;
  let notFound = 0;

  for (const [exId, entries] of byId) {
    const correctEntry = entries.find(e => e.correct);
    const ex = await dbGet<{ exercises_id: number; name: string; video_url_yt: string | null }>(
      db, 'SELECT exercises_id, name, video_url_yt FROM exercises WHERE exercises_id = ?', [exId]
    );

    if (!ex) {
      console.log(`[NOT FOUND] ex_id=${exId}`);
      notFound++;
      continue;
    }

    if (correctEntry) {
      await dbRun(db, 'UPDATE exercises SET video_url_yt = ? WHERE exercises_id = ?', [correctEntry.url, exId]);
      console.log(`[UPDATE] ${exId} "${ex.name}"\n  ${ex.video_url_yt ?? '(vacío)'} → ${correctEntry.url}`);
      updated++;
    } else {
      await dbRun(db, 'UPDATE exercises SET video_url_yt = NULL WHERE exercises_id = ?', [exId]);
      console.log(`[CLEAR]  ${exId} "${ex.name}" → NULL (ninguna URL correcta)`);
      cleared++;
    }
  }

  db.close();
  console.log(`\nResumen: ${updated} actualizados, ${cleared} borrados, ${notFound} no encontrados`);
}

main().catch(e => { console.error(e); process.exit(1); });
