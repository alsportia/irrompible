import { DB } from "@/lib/db";
import WorkoutTracker from "@/components/WorkoutTracker";
import { createWorkoutLog } from "@/app/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface ExerciseRow {
  block: string;
  block_type: string | null;
  set_number: number;
  ex_id: string;
  ex_order: number;
  tiempo_ej: string | null;
  reps: string | null;
  name: string;
  video_url: string | null;
}

function applyEnergy(exercises: ExerciseRow[], pct: number): ExerciseRow[] {
  if (pct >= 1) return exercises;

  const maxSetPerBlock = new Map<string, number>();
  exercises.forEach(e => {
    maxSetPerBlock.set(e.block, Math.max(maxSetPerBlock.get(e.block) ?? 0, e.set_number));
  });

  return exercises
    .map(ex => {
      if (ex.reps && ex.reps !== '0') {
        const n = parseInt(ex.reps);
        if (!isNaN(n) && n > 1) return { ...ex, reps: String(Math.max(1, Math.round(n * pct))) };
      }
      return ex;
    })
    .filter(ex => {
      const maxSet = maxSetPerBlock.get(ex.block) ?? 1;
      if (maxSet <= 1) return true;
      return ex.set_number <= Math.max(1, Math.round(maxSet * pct));
    });
}

export default async function WorkflowPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ energy?: string; userId?: string; energyLabel?: string }>;
}) {
  const { id } = await params;
  const { energy, userId, energyLabel } = await searchParams;
  const energyPct = Math.min(1, Math.max(0.1, parseFloat(energy ?? '1') || 1));
  const userIdNum = parseInt(userId ?? '0') || 0;
  const energyLabelStr = energyLabel ? decodeURIComponent(energyLabel) : '¡A tope!';

  const rawExercises = await DB.query<ExerciseRow>(`
    SELECT se.block, se.block_type, se.set_number, se.ex_id, se.ex_order, se.tiempo_ej, se.reps, e.name, e.video_url
    FROM session_exercises se
    JOIN exercises e ON se.ex_id = e.ex_id
    WHERE se.session_id = ?
    ORDER BY se.block, se.set_number, se.ex_order
  `, [id]);

  if (!rawExercises || rawExercises.length === 0) {
    redirect(`/session/${id}?error=empty`);
    return null;
  }

  const exercises = applyEnergy(rawExercises, energyPct);
  const logId = await createWorkoutLog(id, userIdNum, energyLabelStr);

  return <WorkoutTracker sessionId={id} logId={logId} exercises={exercises} />;
}
