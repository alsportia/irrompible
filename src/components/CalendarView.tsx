"use client"

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Zap, Smile } from "lucide-react";
import { useUser } from "@/lib/userContext";

interface WorkoutDay {
  date: string;
  sessions_id: number;
  session_code: string;
  session_name: string;
  feeling_label: string | null;
  feeling_score: number | null;
}

// Extended type with energy info for the detail popup
interface WorkoutDetail extends WorkoutDay {
  energy_label: string | null;
  duration: number | null;
  program_name: string;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS = ['L','M','X','J','V','S','D'];

function getFeelingColor(score: number | null): string {
  if (!score) return 'var(--accent-primary)';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function fmtDuration(s: number | null): string {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

// CalendarView accepts optional userId prop; falls back to logged-in user
export default function CalendarView({ onClose, userId: propUserId }: { onClose: () => void; userId?: number }) {
  const { user } = useUser();
  const userId = propUserId ?? user?.id;

  const [workouts, setWorkouts] = useState<WorkoutDetail[]>([]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<WorkoutDetail | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/calendar?userId=${userId}`)
      .then(r => r.json())
      .then(setWorkouts);
  }, [userId]);

  // Map date key → all workouts that day (multiple sessions possible)
  const workoutMap = new Map<string, WorkoutDetail[]>();
  workouts.forEach(w => {
    const d = new Date(w.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!workoutMap.has(key)) workoutMap.set(key, []);
    workoutMap.get(key)!.push(w);
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const rows = Math.ceil((startDow + lastDay.getDate()) / 7);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(10, 26, 10, 0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', maxWidth: '28rem', margin: '0 auto' }} className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'rgba(5,15,5,0.9)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <X size={22} />
        </button>
        <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', flex: 1 }}>Historial de Entrenamientos</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <button onClick={prevMonth} style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '0.25rem 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {Array.from({ length: rows * 7 }).map((_, i) => {
            const dayNum = i - startDow + 1;
            if (dayNum < 1 || dayNum > lastDay.getDate()) return <div key={i} />;

            const key = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            const dayWorkouts = workoutMap.get(key);
            const workout = dayWorkouts?.[0] ?? null;
            const isToday = key === todayKey;
            const color = workout ? getFeelingColor(workout.feeling_score) : undefined;
            const hasMultiple = (dayWorkouts?.length ?? 0) > 1;

            return (
              <div key={i}
                onClick={() => workout && setSelected(workout)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  background: workout ? `${color}22` : isToday ? 'var(--bg-tertiary)' : 'transparent',
                  border: isToday ? '1px solid var(--accent-primary)' : workout ? `1px solid ${color}55` : '1px solid transparent',
                  cursor: workout ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'background 0.1s',
                }}>
                <span style={{ fontSize: '0.8rem', fontWeight: workout || isToday ? 700 : 400, color: workout ? color : isToday ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  {dayNum}
                </span>
                {workout && (
                  <div style={{ width: hasMultiple ? '8px' : '4px', height: '4px', borderRadius: '50%', background: color, marginTop: '1px' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Sensación · color del día</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Excelente', color: '#10b981' },
              { label: 'Bien', color: '#3b82f6' },
              { label: 'Normal', color: '#f59e0b' },
              { label: 'Duro / Muy Duro', color: '#ef4444' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent list */}
        {workouts.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Últimos entrenamientos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {workouts.slice(0, 10).map((w, i) => {
                const d = new Date(w.date);
                const color = getFeelingColor(w.feeling_score);
                return (
                  <button key={i} onClick={() => setSelected(w)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-sm)', background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{d.getDate()}/{d.getMonth()+1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.session_name || w.session_code}</div>
                      {'program_name' in w && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{(w as WorkoutDetail).program_name}</div>}
                    </div>
                    {w.feeling_label && <span style={{ fontSize: '0.72rem', fontWeight: 600, color, flexShrink: 0 }}>{w.feeling_label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day detail popup */}
      {selected && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: 'rgba(8,20,8,0.98)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '1.5rem 1.25rem', backdropFilter: 'blur(20px)' }}
            className="animate-fade-in">
            {/* Handle bar */}
            <div style={{ width: '2.5rem', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 1.25rem' }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>
                  {new Date(selected.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {'program_name' in selected && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{(selected as WorkoutDetail).program_name}</div>
                )}
              </div>
              <button onClick={() => setSelected(null)} style={{ padding: '0.25rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>{selected.session_name || selected.session_code}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {/* Feeling */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <Smile size={11} /> Sensación
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: getFeelingColor(selected.feeling_score) }}>
                  {selected.feeling_label ?? '—'}
                </div>
                {selected.feeling_score && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{selected.feeling_score} pts</div>
                )}
              </div>

              {/* Energy */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <Zap size={11} /> Energía
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {'energy_label' in selected ? ((selected as WorkoutDetail).energy_label ?? '—') : '—'}
                </div>
              </div>

              {/* Duration */}
              {'duration' in selected && (selected as WorkoutDetail).duration && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Duración</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{fmtDuration((selected as WorkoutDetail).duration)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
