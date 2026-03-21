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
      SELECT s.id, s.session_code, s.name, s.description, COUNT(se.id) as exerciseCount
      FROM sessions s
      LEFT JOIN session_exercises se ON s.id = se.session_id
      WHERE s.program_id = ?
      GROUP BY s.id
      ORDER BY s.id ASC
    `, [programId]);
  }
  return DB.query<Session>(`
    SELECT s.id, s.session_code, s.name, s.description, COUNT(se.id) as exerciseCount
    FROM sessions s
    LEFT JOIN session_exercises se ON s.id = se.session_id
    GROUP BY s.id
    ORDER BY s.id ASC
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
  if (!programId) redirect('/programs');
  const [sessions, programName] = await Promise.all([
    getSessions(programId),
    getProgramName(programId),
  ]);
  return <HomeClient sessions={sessions} programId={programId} programName={programName} />;
}
