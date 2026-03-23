import { DB } from "@/lib/db";
import WorkoutTracker from "@/components/WorkoutTracker";
import { createWorkoutLog } from "@/app/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface ExerciseRow {
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

interface BlockRow {
  set_id: number;
  block_label: string | null;
  block_type: string | null;
  num_sets: number;
  block_order: number;
  exercises: BlockExRow[];
}

interface BlockExRow {
  ex_id: number;
  ex_order: number;
  reps: string | null;
  tiempo_ej: string | null;
  name: string;
  video_url: string | null;
  video_url_yt: string | null;
}

function expandBlocks(blocks: BlockRow[]): ExerciseRow[] {
  const result: ExerciseRow[] = [];
  const sorted = [...blocks].sort((a, b) => a.block_order - b.block_order);
  for (const block of sorted) {
    const sortedEx = [...block.exercises].sort((a, b) => a.ex_order - b.ex_order);
    for (let s = 1; s <= block.num_sets; s++) {
      for (const ex of sortedEx) {
        result.push({
          set_id: block.set_id,
          block: block.block_label ?? "",
          block_type: block.block_type,
          set_number: s,
          ex_id: ex.ex_id,
          ex_order: ex.ex_order,
          tiempo_ej: ex.tiempo_ej,
          reps: ex.reps,
          name: ex.name,
          video_url: ex.video_url,
          video_url_yt: ex.video_url_yt,
        });
      }
    }
  }
  return result;
}

function applyEnergy(blocks: BlockRow[], pct: number): BlockRow[] {
  if (pct >= 1) return blocks;
  return blocks.map(block => {
    const scaledSets = Math.max(1, Math.round(block.num_sets * pct));
    const scaledExercises = block.exercises.map(ex => {
      if (ex.reps && ex.reps !== "0") {
        const n = parseInt(ex.reps);
        if (!isNaN(n) && n > 1) {
          return { ...ex, reps: String(Math.max(1, Math.round(n * pct))) };
        }
      }
      return ex;
    });
    return { ...block, num_sets: scaledSets, exercises: scaledExercises };
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

  // Load blocks from new model
  const rawBlocks = await DB.query<{
    set_id: number; block_label: string | null; block_type: string | null;
    num_sets: number; block_order: number;
  }>(
    "SELECT set_id, block_label, block_type, num_sets, block_order FROM sets WHERE session_id = ? ORDER BY block_order",
    [id]
  );

  if (!rawBlocks || rawBlocks.length === 0) {
    redirect(`/session/${id}?error=empty`);
    return null;
  }

  // Load exercises for each block
  const blocks: BlockRow[] = await Promise.all(
    rawBlocks.map(async (b) => {
      const exercises = await DB.query<BlockExRow>(
        `SELECT se.ex_id, se.ex_order, se.reps, se.tiempo_ej, e.name, e.video_url, e.video_url_yt
         FROM set_exercises se JOIN exercises e ON se.ex_id = e.id
         WHERE se.set_id = ? ORDER BY se.ex_order`,
        [b.set_id]
      );
      return { ...b, exercises };
    })
  );

  const scaledBlocks = applyEnergy(blocks, energyPct);
  const exercises = expandBlocks(scaledBlocks);

  if (exercises.length === 0) {
    redirect(`/session/${id}?error=empty`);
    return null;
  }

  const logId = resumeLogId
    ? parseInt(resumeLogId)
    : await createWorkoutLog(parseInt(id), userIdNum, energyLabelStr);

  const initialIndex = startIndex ? Math.min(parseInt(startIndex) || 0, exercises.length - 1) : 0;

  return <WorkoutTracker sessionId={id} logId={logId} exercises={exercises} initialIndex={initialIndex} />;
}
