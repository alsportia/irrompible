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

function applyEnergy(exercises: ExerciseRow[], pct: number): ExerciseRow[] {
  if (pct >= 1) return exercises;

  const maxSetPerBlock = new Map<number, number>();
  for (const ex of exercises) {
    maxSetPerBlock.set(ex.set_id, Math.max(maxSetPerBlock.get(ex.set_id) ?? 0, ex.set_number));
  }

  return exercises
    .filter(ex => {
      const maxSet = maxSetPerBlock.get(ex.set_id) ?? 1;
      return ex.set_number <= Math.max(1, Math.round(maxSet * pct));
    })
    .map(ex => {
      if (ex.reps && ex.reps !== "0") {
        const n = parseInt(ex.reps);
        if (!isNaN(n) && n > 1) return { ...ex, reps: String(Math.max(1, Math.round(n * pct))) };
      }
      return ex;
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

  const exercises = applyEnergy(rawExercises, energyPct);

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
