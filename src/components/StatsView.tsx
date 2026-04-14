"use client"

import { useState, useEffect } from "react";
import { X, Flame, Clock, Dumbbell, TrendingUp, Calendar, Award, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useUser } from "@/lib/userContext";
import CalendarView from "./CalendarView";

interface StatsSummary {
  total_workouts: number;
  total_duration_s: number;
  avg_duration_s: number;
  first_workout: string | null;
  last_workout: string | null;
  avg_feeling: number | null;
}

interface ProgramStat { program_name: string; count: number; total_duration_s: number; }
interface MuscleStat { name: string; count: number; }
interface MaxWeight { exercise_name: string; max_weight: number; last_date: string; }
interface WorkoutHistory {
  workout_logs_id: number;
  completed_at: string;
  duration: number | null;
  session_name: string;
  session_code: string;
  program_name: string;
  feeling_label: string | null;
  feeling_score: number | null;
  energy_label: string | null;
  sets_done: number;
}
interface WeekdayStat { weekday: number; count: number; }

interface StatsData {
  summary: StatsSummary;
  byProgram: ProgramStat[];
  muscles: MuscleStat[];
  maxWeights: MaxWeight[];
  history: WorkoutHistory[];
  streak: number;
  byWeekday: WeekdayStat[];
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function fmtDuration(s: number): string {
  if (!s) return '0 min';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getFeelingColor(score: number | null): string {
  if (!score) return 'var(--text-secondary)';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(10,25,10,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}

export default function StatsView({ userId, userName, onClose }: { userId: number; userName?: string; onClose: () => void }) {
  const { user } = useUser();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllWeights, setShowAllWeights] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetch(`/api/stats/${userId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const handleExport = () => {
    const a = document.createElement('a');
    a.href = `/api/stats/${userId}/export`;
    a.setAttribute('x-user-id', String(user?.id ?? 0));
    // Use fetch to include auth header, then trigger download
    fetch(`/api/stats/${userId}/export`, { headers: { 'x-user-id': String(user?.id ?? 0) } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stats_${userName ?? 'mis_stats'}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      });
  };

  const s = data?.summary;
  const totalHours = s ? (s.total_duration_s / 3600).toFixed(1) : '0';
  const avgMin = s ? Math.round(s.avg_duration_s / 60) : 0;

  // Weekday bar chart
  const weekdayMap: Record<number, number> = {};
  data?.byWeekday.forEach(w => { weekdayMap[w.weekday] = w.count; });
  const maxWd = Math.max(...Object.values(weekdayMap), 1);

  // Muscle bar chart
  const maxMuscle = data?.muscles[0]?.count ?? 1;

  const visibleWeights = showAllWeights ? data?.maxWeights : data?.maxWeights.slice(0, 5);
  const visibleHistory = showAllHistory ? data?.history : data?.history.slice(0, 8);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(10,26,10,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', maxWidth: '28rem', margin: '0 auto', overflowY: 'auto' }} className="animate-fade-in">

      {/* Calendar overlay — rendered on top */}
      {showCalendar && <CalendarView userId={userId} onClose={() => setShowCalendar(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'rgba(5,15,5,0.9)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <X size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.05rem' }}>
            {userName ? `Stats de ${userName}` : 'Mis Estadísticas'}
          </div>
          {/* Programa(s) activos */}
          {data && data.byProgram.length > 0 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {data.byProgram.map(p => p.program_name).join(' · ')}
              {s?.first_workout && ` · desde ${fmtDate(s.first_workout)}`}
            </div>
          )}
        </div>
        {/* Botón calendario */}
        <button onClick={() => setShowCalendar(true)}
          style={{ padding: '0.5rem', color: 'var(--accent-primary)', background: 'rgba(232,245,233,0.08)', border: '1px solid rgba(232,245,233,0.15)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}
          title="Ver calendario">
          <Calendar size={18} />
        </button>
        {/* Botón exportar CSV */}
        <button onClick={handleExport}
          style={{ padding: '0.5rem', color: 'var(--accent-primary)', background: 'rgba(232,245,233,0.08)', border: '1px solid rgba(232,245,233,0.15)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex' }}
          title="Exportar CSV">
          <Download size={18} />
        </button>
        {data && data.streak > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem' }}>
            <Flame size={14} color="#fb923c" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fb923c' }}>{data.streak}</span>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Cargando...
        </div>
      )}

      {!loading && data && (
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <StatCard icon={<Dumbbell size={12} />} label="Entrenamientos" value={String(s?.total_workouts ?? 0)} sub={s?.last_workout ? `Último: ${fmtShortDate(s.last_workout)}` : undefined} />
            <StatCard icon={<Clock size={12} />} label="Tiempo total" value={`${totalHours}h`} sub={`Media: ${avgMin} min/sesión`} />
            <StatCard icon={<TrendingUp size={12} />} label="Sensación media" value={s?.avg_feeling ? `${Math.round(s.avg_feeling)}pts` : '—'} sub={s?.avg_feeling ? (s.avg_feeling >= 80 ? 'Excelente' : s.avg_feeling >= 60 ? 'Bien' : s.avg_feeling >= 40 ? 'Normal' : 'Duro') : undefined} />
            <StatCard icon={<Flame size={12} />} label="Racha actual" value={`${data.streak} día${data.streak !== 1 ? 's' : ''}`} sub="días consecutivos" />
          </div>

          {/* Por programa */}
          {data.byProgram.length > 0 && (
            <section>
              <SectionTitle icon={<Award size={14} />} label="Por programa" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.byProgram.map(p => (
                  <div key={p.program_name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(10,25,10,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{p.program_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{fmtDuration(p.total_duration_s)} totales</div>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', color: 'var(--accent-primary)' }}>{p.count}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Día de la semana */}
          {data.byWeekday.length > 0 && (
            <section>
              <SectionTitle icon={<Calendar size={14} />} label="Día favorito" />
              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'flex-end', height: '4rem' }}>
                {[1,2,3,4,5,6,0].map(wd => {
                  const count = weekdayMap[wd] ?? 0;
                  const pct = count / maxWd;
                  return (
                    <div key={wd} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '100%', background: count > 0 ? `rgba(232,245,233,${0.15 + pct * 0.7})` : 'rgba(255,255,255,0.05)', borderRadius: '3px 3px 0 0', height: `${Math.max(4, pct * 48)}px`, transition: 'height 0.3s ease' }} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{WEEKDAYS[wd]}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Músculos trabajados */}
          {data.muscles.length > 0 && (
            <section>
              <SectionTitle icon={<Dumbbell size={14} />} label="Músculos trabajados" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {data.muscles.map(m => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '6rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(m.count / maxMuscle) * 100}%`, background: 'var(--accent-primary)', borderRadius: '3px', opacity: 0.7 + (m.count / maxMuscle) * 0.3 }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', width: '1.5rem', textAlign: 'right', flexShrink: 0 }}>{m.count}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Peso máximo por ejercicio */}
          {data.maxWeights.length > 0 && (
            <section>
              <SectionTitle icon={<TrendingUp size={14} />} label="Peso máximo por ejercicio" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {visibleWeights?.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', background: 'rgba(10,25,10,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: i === 0 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: i === 0 ? '#fbbf24' : 'var(--text-secondary)' }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.exercise_name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{fmtShortDate(w.last_date)}</div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0 }}>{w.max_weight} kg</div>
                  </div>
                ))}
              </div>
              {data.maxWeights.length > 5 && (
                <button onClick={() => setShowAllWeights(v => !v)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontFamily: 'inherit' }}>
                  {showAllWeights ? <><ChevronUp size={14} /> Ver menos</> : <><ChevronDown size={14} /> Ver todos ({data.maxWeights.length})</>}
                </button>
              )}
            </section>
          )}

          {/* Historial */}
          {data.history.length > 0 && (
            <section>
              <SectionTitle icon={<Calendar size={14} />} label="Historial reciente" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {visibleHistory?.map(w => {
                  const color = getFeelingColor(w.feeling_score);
                  return (
                    <div key={w.workout_logs_id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'rgba(10,25,10,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: 'var(--radius-sm)', background: `${color}18`, border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color, lineHeight: 1 }}>{new Date(w.completed_at).getDate()}</span>
                        <span style={{ fontSize: '0.55rem', color, textTransform: 'uppercase', fontWeight: 600 }}>{new Date(w.completed_at).toLocaleDateString('es-ES', { month: 'short' })}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.session_name || w.session_code}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{w.program_name}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                          {w.duration && <Tag>{fmtDuration(w.duration)}</Tag>}
                          {w.sets_done > 0 && <Tag>{w.sets_done} series</Tag>}
                          {w.energy_label && <Tag>{w.energy_label}</Tag>}
                        </div>
                      </div>
                      {w.feeling_label && (
                        <div style={{ fontSize: '0.68rem', fontWeight: 600, color, flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.1rem' }}>{w.feeling_label}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {data.history.length > 8 && (
                <button onClick={() => setShowAllHistory(v => !v)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontFamily: 'inherit' }}>
                  {showAllHistory ? <><ChevronUp size={14} /> Ver menos</> : <><ChevronDown size={14} /> Ver todos ({data.history.length})</>}
                </button>
              )}
            </section>
          )}

          {s?.total_workouts === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏋️</p>
              <p style={{ fontWeight: 600 }}>Aún no hay entrenamientos registrados</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>¡Completa tu primera sesión para ver tus stats!</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {icon}{label}
    </p>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '0.65rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
      {children}
    </span>
  );
}
