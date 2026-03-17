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
    <main style={{ minHeight: '100dvh', padding: '0 1.25rem 6rem', maxWidth: '28rem', margin: '0 auto', position: 'relative' }} className="animate-fade-in">
      {/* Glow decoration */}
      <div style={{ position: 'absolute', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none' }} />

      {/* Header */}
      <header style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div>
          <h1 className="heading-display" style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Unbreakable</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Programa de Entrenamiento</p>
        </div>
        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', backdropFilter: 'blur(12px)' }}>
          <Dumbbell size={22} />
        </div>
      </header>

      {/* Sessions */}
      <section style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Calendar size={18} color="var(--accent-primary)" />
          <h2 className="heading-display" style={{ fontSize: '1.25rem' }}>Tus Sesiones</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {sessions.map((session) => (
            <Link href={`/session/${session.id}`} key={session.id}>
              <div className="card glass-panel" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <h3 className="heading-display" style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{session.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                      {session.description || "Entrenamiento programado."}
                    </p>
                    <div style={{ marginTop: '0.625rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                        {session.exerciseCount} series
                      </span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--accent-primary)', background: 'rgba(59,130,246,0.1)', padding: '0.5rem', borderRadius: '50%', flexShrink: 0 }}>
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
