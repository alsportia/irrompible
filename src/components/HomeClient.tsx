"use client"

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, User, Dumbbell, ChevronLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import LoginSelector from "./LoginSelector";
import CalendarView from "./CalendarView";
import { getCompletedSessionIds, unmarkSessionCompleted } from "@/app/actions";

interface Session {
  id: number;
  name: string;
  description: string;
  exerciseCount?: number;
}

export default function HomeClient({ sessions, programId, programName }: { sessions: Session[]; programId: string; programName?: string }) {
  const { user, setUser } = useUser();
  const router = useRouter();
  const [showCalendar, setShowCalendar] = useState(false);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const nextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getCompletedSessionIds(user.id).then(setCompletedIds);
  }, [user]);

  // Scroll to the first pending session on load
  useEffect(() => {
    if (!user || completedIds.length === 0) return;
    const t = setTimeout(() => {
      nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(t);
  }, [completedIds, user]);

  const handleUnmark = async (e: React.MouseEvent, sessionId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    await unmarkSessionCompleted(user.id, sessionId);
    setCompletedIds(prev => prev.filter(id => id !== sessionId));
  };

  if (!user) return <LoginSelector />;

  const firstPendingIndex = sessions.findIndex(s => !completedIds.includes(s.id));

  return (
    <>
      {showCalendar && <CalendarView onClose={() => setShowCalendar(false)} />}

      <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: '28rem', margin: '0 auto', position: 'relative', overflow: 'hidden' }} className="animate-fade-in">
        <div style={{ position: 'absolute', top: '-100px', left: '-50px', width: '16rem', height: '16rem', background: 'var(--accent-glow)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6, pointerEvents: 'none', zIndex: 0 }} />

        <header style={{ paddingTop: '2.5rem', paddingBottom: '1.5rem', paddingLeft: '1.25rem', paddingRight: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 10, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h1 className="heading-display" style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>{programName ?? "Unbreakable"}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Hola, {user.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={() => router.push('/programs')} title="Volver a programas"
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
              <ChevronLeft size={20} />
            </button>
            <Link href="/exercises"
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backdropFilter: 'blur(12px)', cursor: 'pointer', textDecoration: 'none' }}>
              <Dumbbell size={20} />
            </Link>
            <button onClick={() => setShowCalendar(true)}
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
              <CalendarDays size={20} />
            </button>
            <button onClick={() => setUser(null)} title="Cambiar usuario"
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
              <User size={20} />
            </button>
          </div>
        </header>

        <section style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.25rem 4rem', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {sessions.map((session, i) => {
              const done = completedIds.includes(session.id);
              const isNext = i === firstPendingIndex;
              return (
                <div key={session.id} ref={isNext ? nextRef : undefined}>
                  <SessionCard
                    session={session}
                    programId={programId}
                    done={done}
                    highlight={isNext}
                    onUnmark={done ? (e) => handleUnmark(e, session.id) : undefined}
                  />
                </div>
              );
            })}
          </div>

          {firstPendingIndex === -1 && sessions.length > 0 && (
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

function SessionCard({ session, programId, done, highlight, onUnmark }: {
  session: Session;
  programId: string;
  done?: boolean;
  highlight?: boolean;
  onUnmark?: (e: React.MouseEvent) => void;
}) {
  const bg = done
    ? 'rgba(8, 22, 8, 0.82)'
    : highlight
      ? 'rgba(20, 50, 20, 0.88)'
      : 'rgba(12, 32, 12, 0.85)';

  const borderColor = done
    ? 'rgba(255,255,255,0.06)'
    : highlight
      ? 'rgba(232,245,233,0.35)'
      : 'rgba(255,255,255,0.1)';

  return (
    <Link href={`/session/${session.id}?programId=${programId}`} style={{ textDecoration: 'none' }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1rem 1rem 1.25rem',
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        transition: 'background 0.15s ease',
      }}>
        {/* Checkmark or number */}
        <div style={{
          width: '2.25rem',
          height: '2.25rem',
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: done ? 'rgba(102,187,106,0.15)' : 'rgba(255,255,255,0.06)',
          border: `2px solid ${done ? '#66bb6a' : 'rgba(255,255,255,0.15)'}`,
        }}>
          {done
            ? <span style={{ color: '#66bb6a', fontSize: '1rem', fontWeight: 700, lineHeight: 1 }}>✓</span>
            : <ChevronRight size={16} color="var(--text-secondary)" />
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 700,
            fontSize: '1.05rem',
            letterSpacing: '-0.01em',
            margin: 0,
            color: done ? 'var(--text-secondary)' : 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {session.name}
          </h3>
          {session.description && (
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              marginTop: '0.2rem',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical' as any,
              opacity: done ? 0.7 : 1,
            }}>
              {session.description}
            </p>
          )}
          <div style={{ marginTop: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              {session.exerciseCount} series
            </span>
          </div>
        </div>

        {/* Unmark button */}
        {done && onUnmark && (
          <button
            onClick={onUnmark}
            title="Desmarcar como completada"
            style={{ padding: '0.4rem', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <RotateCcw size={14} />
          </button>
        )}

        {/* "Toca hoy" badge */}
        {highlight && (
          <div style={{ position: 'absolute', top: '-1px', right: '1rem', background: 'var(--accent-primary)', color: '#0a1a0a', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.15rem 0.5rem', borderRadius: '0 0 6px 6px' }}>
            Siguiente
          </div>
        )}
      </div>
    </Link>
  );
}
