import { DB } from "@/lib/db";
import VideoPrefetcher from "@/components/VideoPrefetcher";
import SessionClient from "@/components/SessionClient";

export const dynamic = "force-dynamic";

interface SessionDetail {
  id: number;
  session_code: string;
  name: string;
  description: string;
  program_id: number;
}

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
  description: string | null;
  muscles: string | null;
  joints: string | null;
  easier_id: number | null;
  easier_name: string | null;
  harder_id: number | null;
  harder_name: string | null;
}

interface BlockRow {
  set_id: number;
  block_label: string | null;
  block_type: string | null;
  num_sets: number;
  block_order: number;
}

interface BlockExRow {
  ex_id: number;
  ex_order: number;
  reps: string | null;
  tiempo_ej: string | null;
  name: string;
  video_url: string | null;
  video_url_yt: string | null;
  description: string | null;
  muscles: string | null;
  joints: string | null;
  easier_id: number | null;
  easier_name: string | null;
  harder_id: number | null;
  harder_name: string | null;
}

function expandBlocks(blocks: (BlockRow & { exercises: BlockExRow[] })[]): ExerciseRow[] {
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
          description: ex.description,
          muscles: ex.muscles,
          joints: ex.joints,
          easier_id: ex.easier_id,
          easier_name: ex.easier_name,
          harder_id: ex.harder_id,
          harder_name: ex.harder_name,
        });
      }
    }
  }
  return result;
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [session] = await DB.query<SessionDetail>(
    "SELECT id, session_code, name, description, program_id FROM sessions WHERE id = ?",
    [id]
  );

  if (!session) {
    return <div style={{ padding: '1.5rem', textAlign: 'center', marginTop: '5rem' }}>Sesión no encontrada</div>;
  }

  // Load blocks from new model
  const rawBlocks = await DB.query<BlockRow>(
    "SELECT set_id, block_label, block_type, num_sets, block_order FROM sets WHERE session_id = ? ORDER BY block_order",
    [id]
  );

  const blocks = await Promise.all(
    rawBlocks.map(async (b) => {
      const exercises = await DB.query<BlockExRow>(
        `SELECT se.ex_id, se.ex_order, se.reps, se.tiempo_ej,
                e.name, e.video_url, e.video_url_yt, e.description, e.muscles, e.joints,
                e.easier_id, easy.name as easier_name,
                e.harder_id, hard.name as harder_name
         FROM set_exercises se
         JOIN exercises e ON se.ex_id = e.id
         LEFT JOIN exercises easy ON e.easier_id = easy.id
         LEFT JOIN exercises hard ON e.harder_id = hard.id
         WHERE se.set_id = ? ORDER BY se.ex_order`,
        [b.set_id]
      );
      return { ...b, exercises };
    })
  );

  const exercisesRaw = expandBlocks(blocks);
  const videoUrls = exercisesRaw.map(ex => ex.video_url);

  return (
    <>
      <SessionClient
        sessionId={String(session.id)}
        sessionName={session.name}
        sessionDescription={session.description}
        programId={session.program_id}
        exercisesRaw={exercisesRaw}
      />
      <VideoPrefetcher videoUrls={videoUrls} />
    </>
  );
}
