import * as XLSX from 'xlsx';
import * as path from 'path';

const RECURSOS = path.resolve(process.cwd(), '../recursos/Programas Mammoth Hunters');

function getVideoCol(first: Record<string, unknown>): string {
  return 'Vídeo' in first ? 'Vídeo'
    : 'vídeo' in first ? 'vídeo'
    : 'Video' in first ? 'Video'
    : 'Vídeos';
}

const wb = XLSX.readFile(path.join(RECURSOS, 'Ring Master.xlsx'));
const sheets = wb.SheetNames.filter((n: string) => n.toLowerCase().startsWith('ses'));

// Collect all unique (ex_id, name, url) combos
type Combo = { exId: number; name: string; url: string; sessions: string[] };
const combos = new Map<string, Combo>();

for (const s of sheets) {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[s], { defval: '' });
  if (rows.length === 0) continue;
  const videoCol = getVideoCol(rows[0]);
  for (const r of rows) {
    const exId = Number(r['ex_id']);
    if (!exId) continue;
    const name = String(r['Ejercicio'] ?? '').trim();
    const url = String(r[videoCol] ?? '').trim();
    const key = `${exId}|${name}|${url}`;
    if (!combos.has(key)) combos.set(key, { exId, name, url, sessions: [] });
    const entry = combos.get(key)!;
    if (!entry.sessions.includes(s)) entry.sessions.push(s);
  }
}

// Group by ex_id and find those with multiple names or multiple URLs
const byExId = new Map<number, Combo[]>();
for (const v of combos.values()) {
  if (!byExId.has(v.exId)) byExId.set(v.exId, []);
  byExId.get(v.exId)!.push(v);
}

let conflicts = 0;
for (const [exId, entries] of byExId) {
  const names = new Set(entries.map(e => e.name));
  const urls = new Set(entries.map(e => e.url).filter(u => u.startsWith('http')));
  if (names.size > 1 || urls.size > 1) {
    conflicts++;
    console.log(`\nex_id=${exId} — ${names.size} nombre(s), ${urls.size} URL(s) distintas`);
    for (const e of entries) {
      if (!e.url.startsWith('http') && !e.name) continue;
      console.log(`  nombre="${e.name}" url="${e.url || '(vacía)'}" sesiones=${e.sessions.join(',')}`);
    }
  }
}
console.log(`\nTotal ex_ids con conflicto en Ring Master: ${conflicts}`);
