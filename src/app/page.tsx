import Link from "next/link";
import { DB } from "@/lib/db";
import { Dumbbell, Calendar, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface Session {
  id: string;
  name: string;
  description: string;
  exerciseCount?: number;
}

async function getSessions(): Promise<Session[]> {
  const sessions = await DB.query<Session>(`
    SELECT s.id, s.name, s.description, COUNT(se.id) as exerciseCount
    FROM sessions s
    LEFT JOIN session_exercises se ON s.id = se.session_id
    GROUP BY s.id
    ORDER BY CAST(REPLACE(s.id, 'sesion_', '') AS INTEGER) ASC
  `);
  return sessions;
}

export default async function Home() {
  const sessions = await getSessions();

  return (
    <main className="min-h-screen p-6 pb-24 max-w-md mx-auto animate-fade-in relative">
      {/* Header Background Decoration */}
      <div className="absolute top-[-100px] left-[-50px] w-64 h-64 bg-accent-glow rounded-full mix-blend-screen filter blur-[80px] opacity-60 pointer-events-none" />
      
      <header className="pt-8 pb-10 flex items-center justify-between relative z-10">
        <div>
          <h1 className="heading-display text-4xl mb-1">Unbreakable</h1>
          <p className="text-text-secondary text-sm font-medium">Programa de Entrenamiento</p>
        </div>
        <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-accent-primary">
          <Dumbbell size={24} />
        </div>
      </header>

      <section className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Calendar size={18} className="text-accent-primary" />
          <h2 className="heading-display text-xl">Tus Sesiones</h2>
        </div>

        <div className="grid gap-4">
          {sessions.map((session) => (
            <Link href={`/session/${session.id}`} key={session.id}>
              <div className="card glass-panel relative overflow-hidden group">
                {/* Subtle gradient border effect on hover via CSS child */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent-primary to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
                
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="heading-display text-xl mb-1">{session.name}</h3>
                    <p className="text-text-secondary text-sm line-clamp-2 pr-4">
                      {session.description || "Entrenamiento programado."}
                    </p>
                    <div className="mt-3 flex gap-2">
                       <span className="text-xs font-semibold bg-[rgba(255,255,255,0.05)] text-text-secondary px-2 py-1 rounded-md">
                         {session.exerciseCount} bloques
                       </span>
                    </div>
                  </div>
                  <div className="text-accent-primary bg-[rgba(59,130,246,0.1)] p-2 rounded-full transform group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
