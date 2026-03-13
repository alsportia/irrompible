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

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // 1. Fetch exercises for this session in order
  const exercises = await DB.query<ExerciseRow>(`
    SELECT se.block, se.block_type, se.set_number, se.ex_id, se.ex_order, se.tiempo_ej, se.reps, e.name, e.video_url
    FROM session_exercises se
    JOIN exercises e ON se.ex_id = e.ex_id
    WHERE se.session_id = ?
    ORDER BY se.block, se.ex_order, se.set_number
  `, [id]);

  if (!exercises || exercises.length === 0) {
    redirect(`/session/${id}?error=empty`);
    return null;
  }

  // 2. Initialize a new Workout Log
  const logId = await createWorkoutLog(id);

  // 3. Render the interactive tracker
  return <WorkoutTracker sessionId={id} logId={logId} exercises={exercises} />;
}
