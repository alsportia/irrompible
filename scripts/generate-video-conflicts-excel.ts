/**
 * Genera un Excel con todos los ejercicios que tienen URLs de YouTube
 * distintas para el mismo ex_id, cruzando todos los programas.
 *
 * Uso: npx tsx scripts/generate-video-conflicts-excel.ts
 * Output: scripts/video-conflicts.xlsx
 */

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

const RECURSOS = path.resolve(process.cwd(), '../recursos/Programas Mammoth Hunters');
const OUTPUT = path.resolve(process.cwd(), 'scripts/video-conflicts.xlsx');

const FILES = [
  'Unbreakable.xlsx',
  'Elite.xlsx',
  'Primal.xlsx',
  'Ring Master.xlsx',
  'Aurum.xlsx',
];

function getVideoCol(first: Record<string, unknown>): string {
  return 'Vídeo' in first ? 'Vídeo'
    : 'vídeo' in first ? 'vídeo'
    : 'Video' in first ? 'Video'
    : 'Vídeos';
}

// ex_id -> Map<url, { programs: Set<string>, name: string }>
const urlsByEx = new Map<number, Map<string, { programs: Set<string>; name: string }>>();

for (const file of FILES) {
  const programName = file.replace('.xlsx', '');
  const filePath = path.join(RECURSOS, file);
  if (!fs.existsSync(filePath)) { console.warn(`[WARN] No encontrado: ${file}`); continue; }

  const wb = XLSX.readFile(filePath);
  const sheets = wb.SheetNames.filter((n: string) =>
    n.toLowerCase().startsWith('ses') || n.toLowerCase().startsWith('sesión')
  );

  for (const s of sheets) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[s], { defval: '' });
    if (rows.length === 0) continue;
    const videoCol = getVideoCol(rows[0]);

    for (const r of rows) {
      const exId = Number(r['ex_id']);
      if (!exId) continue;
      const url = String(r[videoCol] ?? '').trim();
      if (!url.startsWith('http')) continue;
      const name = String(r['Ejercicio'] ?? '').trim();

      if (!urlsByEx.has(exId)) urlsByEx.set(exId, new Map());
      const urlMap = urlsByEx.get(exId)!;
      if (!urlMap.has(url)) urlMap.set(url, { programs: new Set(), name });
      urlMap.get(url)!.programs.add(programName);
    }
  }
}

// Build rows — only exercises with more than one distinct URL
type Row = { Programa: string; exercise_id: number; name: string; video_url_yt: string; Correcto: string };
const rows: Row[] = [];

// Sort by ex_id for readability
const sortedExIds = [...urlsByEx.entries()]
  .filter(([, urlMap]) => urlMap.size > 1)
  .sort((a, b) => a[0] - b[0]);

for (const [exId, urlMap] of sortedExIds) {
  for (const [url, { programs, name }] of urlMap) {
    rows.push({
      Programa: [...programs].sort().join(', '),
      exercise_id: exId,
      name,
      video_url_yt: url,
      Correcto: '',
    });
  }
}

console.log(`Ejercicios con conflicto: ${sortedExIds.length}`);
console.log(`Total filas: ${rows.length}`);

(async () => {
// Create workbook with ExcelJS for hyperlink support
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Conflictos');

worksheet.columns = [
  { header: 'Programa',     key: 'Programa',     width: 30 },
  { header: 'exercise_id',  key: 'exercise_id',  width: 12 },
  { header: 'name',         key: 'name',         width: 40 },
  { header: 'video_url_yt', key: 'video_url_yt', width: 55 },
  { header: 'Correcto',     key: 'Correcto',     width: 10 },
];

// Style header row
const headerRow = worksheet.getRow(1);
headerRow.font = { bold: true };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

// Track row index to apply alternating group colors
let lastExId = -1;
let groupColor = false;

for (const r of rows) {
  if (r.exercise_id !== lastExId) {
    groupColor = !groupColor;
    lastExId = r.exercise_id;
  }

  const row = worksheet.addRow({
    Programa: r.Programa,
    exercise_id: r.exercise_id,
    name: r.name,
    video_url_yt: r.video_url_yt,
    Correcto: '',
  });

  // Set hyperlink on the video_url_yt cell
  const urlCell = row.getCell('video_url_yt');
  urlCell.value = { text: r.video_url_yt, hyperlink: r.video_url_yt };
  urlCell.font = { color: { argb: 'FF0563C1' }, underline: true };

  // Alternating group background for readability
  if (groupColor) {
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    });
    // Re-apply hyperlink style (fill overrides font)
    urlCell.font = { color: { argb: 'FF0563C1' }, underline: true };
  }
}

await workbook.xlsx.writeFile(OUTPUT);
console.log(`\nExcel generado en: ${OUTPUT}`);
})();
