import { redirect } from "next/navigation";
import { DB } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

interface Session {
  id: number;
  session_code: string;
  name: string;
  description: string;
  exerciseCount?: number;
}

async function getSessions(programId?: string): Promise<Session[]> {
  if (programId) {
    return DB.query<Session>(`
      SELECT s.sessions_id as id, s.session_code, s.name, s.description,
             COALESCE((
               SELECT SUM(block_sets)
               FROM (SELECT COUNT(DISTINCT se.set_number) as block_sets
                     FROM sets st JOIN set_exercises se ON se.set_id = st.set_id
                     WHERE st.sessions_id = s.sessions_id GROUP BY st.set_id)
             ), 0) as exerciseCount
      FROM sessions s
      WHERE s.programs_id = ?
      GROUP BY s.sessions_id
      ORDER BY s.sessions_id ASC
    `, [programId]);
  }
  return DB.query<Session>(`
    SELECT s.sessions_id as id, s.session_code, s.name, s.description,
           COALESCE((
             SELECT SUM(block_sets)
             FROM (SELECT COUNT(DISTINCT se.set_number) as block_sets
                   FROM sets st JOIN set_exercises se ON se.set_id = st.set_id
                   WHERE st.sessions_id = s.sessions_id GROUP BY st.set_id)
           ), 0) as exerciseCount
    FROM sessions s
    GROUP BY s.sessions_id
    ORDER BY s.sessions_id ASC
  `);
}

async function getProgramName(programId?: string): Promise<string> {
  if (!programId) return "Unbreakable";
  const [prog] = await DB.query<{ name: string }>(
    "SELECT name FROM programs WHERE programs_id = ?",
    [programId]
  );
  return prog?.name ?? "Programa";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const { programId } = await searchParams;
  if (!programId) redirect('/programs');
  const [sessions, programName] = await Promise.all([
    getSessions(programId),
    getProgramName(programId),
  ]);
  return <HomeClient sessions={sessions} programId={programId} programName={programName} />;
}
