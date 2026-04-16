import { DB } from "@/lib/db";
import WorkoutTracker from "@/components/WorkoutTracker";
import { createWorkoutLog } from "@/app/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export interface ExerciseRow {
  set_id: number;
  block: string;
  block_type: string | null;
  set_number: number;
  ex_id: number;
  ex_order: number;
  tiempo_ej: string | null;
  reps: string | null;
  name: string;
  video_url: string | null;
  video_url_yt: string | null;
}

function normalizeSetNumbers(exercises: ExerciseRow[]): ExerciseRow[] {
  // Some legacy/migrated data may have set_number starting at 2 or with gaps.
  // Normalize per block (set_id) to 1..N so energy scaling and UI behave consistently.
  const mapBySetId = new Map<number, Map<number, number>>();
  for (const ex of exercises) {
    if (!mapBySetId.has(ex.set_id)) mapBySetId.set(ex.set_id, new Map());
    mapBySetId.get(ex.set_id)!.set(ex.set_number, 0);
  }
  for (const [setId, mapping] of mapBySetId) {
    const sorted = Array.from(mapping.keys()).sort((a, b) => a - b);
    sorted.forEach((oldNum, idx) => mapping.set(oldNum, idx + 1));
    mapBySetId.set(setId, mapping);
  }
  return exercises.map(ex => {
    const newNum = mapBySetId.get(ex.set_id)?.get(ex.set_number);
    return newNum ? { ...ex, set_number: newNum } : ex;
  });
}

function scaleTimeString(timeStr: string | null, pct: number): string | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  if (!clean) return timeStr;

  // Parse using the same conventions as the client: 1' (minutes) and 30'' (seconds).
  let seconds = 0;
  if (clean.includes("'") && !clean.includes("''")) {
    const val = parseInt(clean.replace("'", ""));
    seconds = isNaN(val) ? 0 : val * 60;
  } else if (clean.includes("''")) {
    const val = parseInt(clean.replace("''", ""));
    seconds = isNaN(val) ? 0 : val;
  } else {
    const val = parseInt(clean);
    seconds = isNaN(val) ? 0 : val;
  }

  if (seconds <= 0) return timeStr;
  const scaled = Math.max(5, Math.round(seconds * pct));
  // Keep minutes format only if it stays a clean minute and original looked like minutes.
  if (clean.includes("'") && !clean.includes("''") && scaled % 60 === 0) {
    return `${scaled / 60}'`;
  }
  return `${scaled}''`;
}

function applyEnergy(exercises: ExerciseRow[], pct: number): ExerciseRow[] {
  if (pct >= 1) return exercises;

  return exercises
    .map(ex => {
      let next = ex;
      if (ex.reps && ex.reps !== "0") {
        const n = parseInt(ex.reps);
        if (!isNaN(n) && n > 1) next = { ...next, reps: String(Math.max(1, Math.round(n * pct))) };
      }
      if (ex.tiempo_ej) {
        const scaled = scaleTimeString(ex.tiempo_ej, pct);
        if (scaled && scaled !== ex.tiempo_ej) next = { ...next, tiempo_ej: scaled };
      }
      return next;
    });
}

export default async function WorkflowPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ energy?: string; userId?: string; energyLabel?: string; resumeLogId?: string; startIndex?: string }>;
}) {
  const { id } = await params;
  const { energy, userId, energyLabel, resumeLogId, startIndex } = await searchParams;
  const energyPct = Math.min(1, Math.max(0.1, parseFloat(energy ?? "1") || 1));
  const userIdNum = parseInt(userId ?? "0") || 0;
  const energyLabelStr = energyLabel ? decodeURIComponent(energyLabel) : "¡A tope!";

  const rawExercises = await DB.query<ExerciseRow>(
    `SELECT st.set_id, st.block_label as block, st.block_type,
            se.set_number, se.exercises_id as ex_id, se.ex_order, se.reps, se.tiempo_ej,
            e.name, e.video_url, e.video_url_yt
     FROM sets st
     JOIN set_exercises se ON se.set_id = st.set_id
     JOIN exercises e ON se.exercises_id = e.exercises_id
     WHERE st.sessions_id = ?
     ORDER BY st.block_order, se.set_number, se.ex_order`,
    [id]
  );

  if (!rawExercises || rawExercises.length === 0) {
    redirect(`/session/${id}?error=empty`);
    return null;
  }

  const normalized = normalizeSetNumbers(rawExercises);
  const exercises = applyEnergy(normalized, energyPct);

  if (exercises.length === 0) {
    redirect(`/session/${id}?error=empty`);
    return null;
  }

  const logId = resumeLogId
    ? parseInt(resumeLogId)
    : await createWorkoutLog(parseInt(id), userIdNum, energyLabelStr);

  const initialIndex = startIndex ? Math.min(parseInt(startIndex) || 0, exercises.length - 1) : 0;

  return <WorkoutTracker sessionId={id} logId={logId} userId={userIdNum} exercises={exercises} initialIndex={initialIndex} />;
}
