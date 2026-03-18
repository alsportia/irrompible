"use client"

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, User, Dumbbell, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import LoginSelector from "./LoginSelector";
import CalendarView from "./CalendarView";
import { getCompletedSessionIds } from "@/app/actions";

interface Session {
  id: string;
  name: string;
  description: string;
  exerciseCount?: number;
}

export default function HomeClient({ sessions, programId }: { sessions: Session[]; programId?: string }) {
  const { user, setUser } = useUser();
  const router = useRouter();
  const [showCalendar, setShowCalendar] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const nextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getCompletedSessionIds(user.id).then(setCompletedIds);
  }, [user]);

  // Scroll to the next pending session on load
  useEffect(() => {
    if (!user || completedIds.length === 0) return;
    // Small delay to let layout settle
    const t = setTimeout(() => {
      nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(t);
  }, [completedIds, user]);

  if (!user) return <LoginSelector />;

  // Split sessions: done vs pending
  const doneSessions = sessions.filter(s => completedIds.includes(s.id));
  const pendingSessions = sessions.filter(s => !completedIds.includes(s.id));

  return (
    <>
      {showCalendar && <CalendarView onClose={() => setShowCalendar(false)} />}

      <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: '28rem', margin: '0 auto', position: 'relative', overflow: 'hidden' }} className="animate-fade-in">
        {/* Glow */}
        <div style={{ position: 'absolute', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none', zIndex: 0 }} />

        {/* Header — fixed */}
        <header style={{ paddingTop: '2.5rem', paddingBottom: '1.5rem', paddingLeft: '1.25rem', paddingRight: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 10, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h1 className="heading-display" style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Unbreakable</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Hola, {user.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Back to programs */}
            <button onClick={() => router.push('/programs')}
              title="Volver a programas"
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
              <ChevronLeft size={20} />
            </button>
            {/* Exercises icon */}
            <Link href="/exercises"
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backdropFilter: 'blur(12px)', cursor: 'pointer', textDecoration: 'none' }}>
              <Dumbbell size={20} />
            </Link>
            {/* Calendar icon */}
            <button onClick={() => setShowCalendar(true)}
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
              <CalendarDays size={20} />
            </button>
            {/* User icon */}
            <button onClick={() => setUser(null)}
              title="Cambiar usuario"
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Sessions — scrollable */}
        <section style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem 4rem', position: 'relative', zIndex: 10 }}>
          {/* Completed sessions (above, scrollable up) */}
          {doneSessions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '0.875rem' }}>
              {doneSessions.map(session => (
                <SessionCard key={session.id} session={session} done />
              ))}
            </div>
          )}

          {/* Next session marker */}
          {pendingSessions.length > 0 && (
            <div ref={nextRef}>
              {/* Divider */}
              {doneSessions.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                  <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-primary)' }}>Siguiente</span>
                  <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {pendingSessions.map((session, i) => (
                  <SessionCard key={session.id} session={session} highlight={i === 0} />
                ))}
              </div>
            </div>
          )}

          {pendingSessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏆</p>
              <p style={{ fontWeight: 600 }}>¡Programa completado!</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function SessionCard({ session, done, highlight }: { session: Session; done?: boolean; highlight?: boolean }) {
  return (
    <Link href={`/session/${session.id}`}>
      <div className="card glass-panel" style={{ cursor: 'pointer', opacity: done ? 0.55 : 1, position: 'relative', border: highlight ? '1px solid rgba(59,130,246,0.4)' : undefined }}>
        {highlight && (
          <div style={{ position: 'absolute', top: '-1px', left: '1rem', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.15rem 0.5rem', borderRadius: '0 0 6px 6px' }}>
            Toca hoy
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, paddingRight: '1rem' }}>
            <h3 className="heading-display" style={{ fontSize: '1.125rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {done && <span style={{ fontSize: '0.8rem' }}>✓</span>}
              {session.name}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
              {session.description || "Entrenamiento programado."}
            </p>
            <div style={{ marginTop: '0.625rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                {session.exerciseCount} series
              </span>
            </div>
          </div>
          <div style={{ color: done ? 'var(--text-secondary)' : 'var(--accent-primary)', background: done ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.1)', padding: '0.5rem', borderRadius: '50%', flexShrink: 0 }}>
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </Link>
  );
}
