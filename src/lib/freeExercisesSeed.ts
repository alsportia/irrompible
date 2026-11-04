import { DB } from './db';
import { translateExerciseName } from './i18n/exerciseNames';

// Dataset público de ejercicios. Se descarga una sola vez: si ya hay ejercicios globales, no hace nada.
const DATASET_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';
const DATASET_URL = `${DATASET_BASE}/data/exercises.json`;

type DatasetItem = Record<string, unknown>;

function instructionsToText(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.join('\n');
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const text = obj.es ?? obj.en ?? Object.values(obj)[0];
    if (Array.isArray(text)) return text.join('\n');
    return typeof text === 'string' ? text : null;
  }
  return null;
}

// Rellena name_es de los globales que aún no lo tienen (idempotente, se repite sin efecto)
export async function fillSpanishNames(): Promise<void> {
  const rows = await DB.query<{ free_exercises_id: number; name: string }>(
    `SELECT free_exercises_id, name FROM free_exercises WHERE is_global = 1 AND name_es IS NULL`
  );
  for (const r of rows) {
    await DB.run(`UPDATE free_exercises SET name_es = ? WHERE free_exercises_id = ?`, [translateExerciseName(r.name), r.free_exercises_id]);
  }
}

export async function seedFreeExercises(): Promise<void> {
  const existing = await DB.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM free_exercises WHERE is_global = 1`
  );
  if (existing && Number(existing.count) > 0) return;

  console.log('[free] Descargando dataset de ejercicios...');
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Dataset HTTP ${res.status}`);
  const dataset = (await res.json()) as DatasetItem[];
  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw new Error('El dataset descargado está vacío o no es válido');
  }

  let inserted = 0;
  for (const item of dataset) {
    const bodyPart = String(item.body_part ?? item.bodyPart ?? 'general');
    const category = String(item.category ?? '');
    const target = String(item.target ?? '');
    // Se excluye el cardio puro, igual que en albilbo
    if (bodyPart.toLowerCase() === 'cardio' || category.toLowerCase() === 'cardio' || target.toLowerCase().includes('cardiovascular')) {
      continue;
    }

    const name = String(item.name ?? 'Ejercicio sin nombre');
    const measureType = /plank|hold|isom/i.test(name) ? 'time' : 'reps';
    const rawGif = typeof item.gif_url === 'string' ? item.gif_url : '';
    const gifFile = rawGif ? rawGif.split('/').pop() : '';
    const gifUrl = gifFile ? `${DATASET_BASE}/videos/${gifFile}` : null;
    // La imagen estática tiene el mismo nombre base que el GIF, en la carpeta images/
    const imageUrl = gifUrl ? gifUrl.replace('/videos/', '/images/').replace(/\.gif$/, '.jpg') : null;
    const muscleGroup = Array.isArray(item.secondary_muscles)
      ? item.secondary_muscles.join(', ')
      : (typeof item.muscle_group === 'string' ? item.muscle_group : null);

    await DB.run(
      `INSERT OR IGNORE INTO free_exercises
        (external_id, name, body_part, equipment, target, muscle_group, measure_type, gif_url, image_url, instructions, is_global, users_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
      [
        item.id != null ? String(item.id) : null,
        name,
        bodyPart,
        typeof item.equipment === 'string' ? item.equipment : null,
        target || null,
        muscleGroup,
        measureType,
        gifUrl,
        imageUrl,
        instructionsToText(item.instructions),
      ]
    );
    inserted++;
  }
  console.log(`[free] ${inserted} ejercicios globales insertados.`);
}
