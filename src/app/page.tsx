import { DB } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

interface Session {
  id: string;
  name: string;
  description: string;
  exerciseCount?: number;
}

async function getSessions(programId?: string): Promise<Session[]> {
  if (programId) {
    return DB.query<Session>(`
      SELECT s.id, s.name, s.description, COUNT(se.id) as exerciseCount
      FROM sessions s
      JOIN program_sessions ps ON ps.session_id = s.id
      LEFT JOIN session_exercises se ON s.id = se.session_id
      WHERE ps.program_id = ?
      GROUP BY s.id
      ORDER BY LENGTH(s.id), s.id ASC
    `, [programId]);
  }
  return DB.query<Session>(`
    SELECT s.id, s.name, s.description, COUNT(se.id) as exerciseCount
    FROM sessions s
    LEFT JOIN session_exercises se ON s.id = se.session_id
    GROUP BY s.id
    ORDER BY CAST(REPLACE(s.id, 'sesion_', '') AS INTEGER) ASC
  `);
}

async function getProgramName(programId?: string): Promise<string> {
  if (!programId) return "Unbreakable";
  const [prog] = await DB.query<{ name: string }>(
    "SELECT name FROM programs WHERE id = ?",
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
  const [sessions, programName] = await Promise.all([
    getSessions(programId),
    getProgramName(programId),
  ]);
  return <HomeClient sessions={sessions} programId={programId} programName={programName} />;
}
