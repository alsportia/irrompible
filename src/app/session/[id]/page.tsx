import { DB } from "@/lib/db";
import VideoPrefetcher from "@/components/VideoPrefetcher";
import SessionClient from "@/components/SessionClient";

export const dynamic = "force-dynamic";

interface SessionDetail {
  id: number;
  session_code: string;
  name: string;
  description: string;
}

interface ExerciseRow {
  block: string;
  block_type: string | null;
  set_number: number;
  ex_id: number;
  ex_order: number;
  tiempo_ej: string | null;
  reps: string | null;
  name: string;
  video_url: string | null;
  description: string | null;
  muscles: string | null;
  joints: string | null;
  easier_id: number | null;
  easier_name: string | null;
  harder_id: number | null;
  harder_name: string | null;
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [session] = await DB.query<SessionDetail>(
    "SELECT id, session_code, name, description FROM sessions WHERE id = ?",
    [id]
  );

  if (!session) {
    return <div style={{ padding: '1.5rem', textAlign: 'center', marginTop: '5rem' }}>Sesión no encontrada</div>;
  }

  const exercisesRaw = await DB.query<ExerciseRow>(`
    SELECT se.block, se.block_type, se.set_number, se.ex_id, se.ex_order, se.tiempo_ej, se.reps,
           e.name, e.video_url, e.description, e.muscles, e.joints,
           e.easier_id, easy.name as easier_name,
           e.harder_id, hard.name as harder_name
    FROM session_exercises se
    JOIN exercises e ON se.ex_id = e.id
    LEFT JOIN exercises easy ON e.easier_id = easy.id
    LEFT JOIN exercises hard ON e.harder_id = hard.id
    WHERE se.session_id = ?
    ORDER BY se.block, se.ex_order, se.set_number
  `, [id]);

  const videoUrls = exercisesRaw.map(ex => ex.video_url);

  return (
    <>
      <SessionClient
        sessionId={session.id}
        sessionName={session.name}
        sessionDescription={session.description}
        exercisesRaw={exercisesRaw}
      />
      <VideoPrefetcher videoUrls={videoUrls} />
    </>
  );
}
