"use client"

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useUser } from "@/lib/userContext";

interface WorkoutDay {
  date: string;
  session_id: number;
  session_code: string;
  session_name: string;
  feeling_label: string | null;
  feeling_score: number | null;
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

export default function CalendarView({ onClose }: { onClose: () => void }) {
  const { user } = useUser();
  const [workouts, setWorkouts] = useState<WorkoutDay[]>([]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!user) return;
    fetch(`/api/calendar?userId=${user.id}`)
      .then(r => r.json())
      .then(setWorkouts);
  }, [user]);

  // Build a map of date string -> workout info
  const workoutMap = new Map<string, WorkoutDay>();
  workouts.forEach(w => {
    const d = new Date(w.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!workoutMap.has(key)) workoutMap.set(key, w);
  });

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first: 0=Mon..6=Sun
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalCells = startDow + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(10, 26, 10, 0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', maxWidth: '28rem', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
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
            if (dayNum < 1 || dayNum > lastDay.getDate()) {
              return <div key={i} />;
            }
            const key = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            const workout = workoutMap.get(key);
            const isToday = key === todayKey;
            const color = workout ? getFeelingColor(workout.feeling_score) : undefined;

            return (
              <div key={i} style={{
                aspectRatio: '1',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                background: workout ? `${color}22` : isToday ? 'var(--bg-tertiary)' : 'transparent',
                border: isToday ? '1px solid var(--accent-primary)' : workout ? `1px solid ${color}55` : '1px solid transparent',
                position: 'relative',
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: workout || isToday ? 700 : 400, color: workout ? color : isToday ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  {dayNum}
                </span>
                {workout && (
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: color, marginTop: '1px' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Sensación</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { label: 'Excelente', color: '#10b981' },
              { label: 'Bien', color: '#3b82f6' },
              { label: 'Normal', color: '#f59e0b' },
              { label: 'Duro', color: '#ef4444' },
              { label: 'Muy Duro', color: '#ef4444' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent workouts list */}
        {workouts.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Últimos entrenamientos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {workouts.slice(0, 10).map((w, i) => {
                const d = new Date(w.date);
                const color = getFeelingColor(w.feeling_score);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-sm)', background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{d.getDate()}/{d.getMonth()+1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{w.session_name || w.session_code}</div>
                      {w.feeling_label && <div style={{ fontSize: '0.75rem', color, marginTop: '0.1rem' }}>{w.feeling_label}</div>}
                    </div>
                    {w.feeling_score && <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{w.feeling_score}pts</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
