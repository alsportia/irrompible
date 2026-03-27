import * as XLSX from 'xlsx';
import * as path from 'path';

const RECURSOS = path.resolve(process.cwd(), '../recursos/Programas Mammoth Hunters');
const FILES = [
  'Unbreakable.xlsx',
  'Elite.xlsx',
  'Primal.xlsx',
  'Ring Master.xlsx',
  'Aurum.xlsx',
];

// ex_id -> Map<url, sources[]>
const urlsByEx = new Map<number, Map<string, string[]>>();
const namesByEx = new Map<number, string>();

for (const file of FILES) {
  const programName = file.replace('.xlsx', '');
  const wb = XLSX.readFile(path.join(RECURSOS, file));
  const sheets = wb.SheetNames.filter((n: string) =>
    n.toLowerCase().startsWith('ses') || n.toLowerCase().startsWith('sesión')
  );
  for (const s of sheets) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[s], { defval: '' });
    for (const r of rows) {
      const exId = Number(r['ex_id']);
      if (!exId) continue;
      const videoCol = Object.keys(r).find(k => k.toLowerCase().includes('vid')) ?? '';
      const url = String(r[videoCol] ?? '').trim();
      const name = String(r['Ejercicio'] ?? '').trim();
      if (name) namesByEx.set(exId, name);
      if (!url || !url.startsWith('http')) continue;
      if (!urlsByEx.has(exId)) urlsByEx.set(exId, new Map());
      const map = urlsByEx.get(exId)!;
      if (!map.has(url)) map.set(url, []);
      map.get(url)!.push(`${programName}/${s}`);
    }
  }
}

let conflicts = 0;
for (const [exId, urlMap] of urlsByEx) {
  if (urlMap.size > 1) {
    conflicts++;
    const name = namesByEx.get(exId) ?? '?';
    console.log(`ex_id=${exId} "${name}"`);
    for (const [url, sources] of urlMap) {
      console.log(`  ${url}`);
      console.log(`    -> ${sources.join(', ')}`);
    }
  }
}
console.log(`\nTotal ejercicios con URLs conflictivas: ${conflicts}`);
