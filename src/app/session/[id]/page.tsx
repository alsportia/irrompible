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
  description: string | null;
  muscles: string | null;
  joints: string | null;
  easier_id: number | null;
  easier_name: string | null;
  harder_id: number | null;
  harder_name: string | null;
}

function normalizeSetNumbers(exercises: ExerciseRow[]): ExerciseRow[] {
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

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [session] = await DB.query<SessionDetail>(
    "SELECT sessions_id as id, session_code, name, description, programs_id as program_id FROM sessions WHERE sessions_id = ?",
    [id]
  );

  if (!session) {
    return <div style={{ padding: '1.5rem', textAlign: 'center', marginTop: '5rem' }}>Sesión no encontrada</div>;
  }

  // Load all rows directly — already expanded by (set_number, ex_order)
  const exercisesRaw = await DB.query<ExerciseRow>(
    `SELECT st.set_id, st.block_label as block, st.block_type,
            se.set_number, se.exercises_id as ex_id, se.ex_order, se.reps, se.tiempo_ej,
            e.name, e.video_url, e.video_url_yt, e.description, e.muscles, e.joints,
            e.easier_exercises_id as easier_id, easy.name as easier_name,
            e.harder_exercises_id as harder_id, hard.name as harder_name
     FROM sets st
     JOIN set_exercises se ON se.set_id = st.set_id
     JOIN exercises e ON se.exercises_id = e.exercises_id
     LEFT JOIN exercises easy ON e.easier_exercises_id = easy.exercises_id
     LEFT JOIN exercises hard ON e.harder_exercises_id = hard.exercises_id
     WHERE st.sessions_id = ?
     ORDER BY st.block_order, se.set_number, se.ex_order`,
    [id]
  );

  const exercisesNormalized = normalizeSetNumbers(exercisesRaw);
  const videoUrls = exercisesNormalized.map(ex => ex.video_url);

  return (
    <>
      <SessionClient
        sessionId={String(session.id)}
        sessionName={session.name}
        sessionDescription={session.description}
        programId={session.program_id}
        exercisesRaw={exercisesNormalized}
      />
      <VideoPrefetcher videoUrls={videoUrls} />
    </>
  );
}
