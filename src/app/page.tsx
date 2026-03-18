import { DB } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

interface Session {
  id: string;
  name: string;
  description: string;
  exerciseCount?: number;
}

async function getSessions(): Promise<Session[]> {
  return DB.query<Session>(`
    SELECT s.id, s.name, s.description, COUNT(se.id) as exerciseCount
    FROM sessions s
    LEFT JOIN session_exercises se ON s.id = se.session_id
    GROUP BY s.id
    ORDER BY CAST(REPLACE(s.id, 'sesion_', '') AS INTEGER) ASC
  `);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const { programId } = await searchParams;
  const sessions = await getSessions();
  return <HomeClient sessions={sessions} programId={programId} />;
}
