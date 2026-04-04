"use client"

import { useState, useEffect } from "react";
import { X, Users, Clock, Dumbbell, TrendingUp, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/userContext";
import StatsView from "./StatsView";

interface GlobalTotals {
  total_workouts: number;
  active_users: number;
  total_duration_s: number;
  avg_duration_s: number;
}
interface UserRankRow {
  users_id: number;
  name: string;
  email: string;
  total_workouts: number;
  total_duration_s: number;
  last_workout: string | null;
  avg_feeling: number | null;
}
interface ProgramStat { program_name: string; count: number; }
interface WeeklyActivity { week: string; count: number; }

interface AdminStatsData {
  totals: GlobalTotals;
  userRanking: UserRankRow[];
  topPrograms: ProgramStat[];
  weeklyActivity: WeeklyActivity[];
}

function fmtDuration(s: number): string {
  if (!s) return '0h';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getFeelingColor(score: number | null): string {
  if (!score) return 'var(--text-secondary)';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function AdminStatsView({ onClose }: { onClose: () => void }) {
  const { user } = useUser();
  const [data, setData] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drillUser, setDrillUser] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/admin/stats', { headers: { 'x-user-id': String(user.id) } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (drillUser) {
    return <StatsView userId={drillUser.id} userName={drillUser.name} onClose={() => setDrillUser(null)} />;
  }

  const t = data?.totals;
  const maxWorkouts = data?.userRanking[0]?.total_workouts ?? 1;
  const maxProgram = data?.topPrograms[0]?.count ?? 1;

  // Weekly sparkline
  const weekCounts = data?.weeklyActivity.map(w => w.count) ?? [];
  const maxWeek = Math.max(...weekCounts, 1);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(10,26,10,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', maxWidth: '48rem', margin: '0 auto', overflowY: 'auto' }} className="animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: 'rgba(5,15,5,0.9)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <X size={22} />
        </button>
        <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', flex: 1 }}>Estadísticas Globales</span>
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Cargando...
        </div>
      )}

      {!loading && data && (
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* KPIs globales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
            {[
              { icon: <Dumbbell size={12} />, label: 'Entrenamientos', value: String(t?.total_workouts ?? 0) },
              { icon: <Users size={12} />, label: 'Usuarios activos', value: String(t?.active_users ?? 0) },
              { icon: <Clock size={12} />, label: 'Horas totales', value: `${((t?.total_duration_s ?? 0) / 3600).toFixed(0)}h` },
              { icon: <TrendingUp size={12} />, label: 'Media por sesión', value: fmtDuration(t?.avg_duration_s ?? 0) },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(10,25,10,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                  {item.icon}{item.label}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', lineHeight: 1 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Actividad semanal (sparkline) */}
          {weekCounts.length > 0 && (
            <section>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>Actividad últimas 12 semanas</p>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '3.5rem', padding: '0 0.25rem' }}>
                {data.weeklyActivity.map((w, i) => {
                  const pct = w.count / maxWeek;
                  return (
                    <div key={i} title={`${w.week}: ${w.count}`} style={{ flex: 1, background: `rgba(232,245,233,${0.1 + pct * 0.8})`, borderRadius: '2px 2px 0 0', height: `${Math.max(4, pct * 52)}px`, transition: 'height 0.3s ease' }} />
                  );
                })}
              </div>
            </section>
          )}

          {/* Programas más usados */}
          {data.topPrograms.length > 0 && (
            <section>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>Programas más usados</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {data.topPrograms.map(p => (
                  <div key={p.program_name} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '7rem', fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{p.program_name}</div>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(p.count / maxProgram) * 100}%`, background: 'var(--accent-primary)', borderRadius: '3px', opacity: 0.6 + (p.count / maxProgram) * 0.4 }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, width: '2rem', textAlign: 'right', flexShrink: 0 }}>{p.count}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ranking de usuarios */}
          <section>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>
              Ranking de usuarios ({data.userRanking.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {data.userRanking.map((u, i) => {
                const feelingColor = getFeelingColor(u.avg_feeling);
                const barPct = u.total_workouts / maxWorkouts;
                return (
                  <button key={u.users_id} onClick={() => setDrillUser({ id: u.users_id, name: u.name })}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(10,25,10,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  >
                    {/* Posición */}
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: i < 3 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i < 3 ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: i < 3 ? '#fbbf24' : 'var(--text-secondary)' }}>{i + 1}</span>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barPct * 100}%`, background: 'var(--accent-primary)', borderRadius: '2px', opacity: 0.5 + barPct * 0.5 }} />
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{fmtDuration(u.total_duration_s)}</span>
                      </div>
                    </div>
                    {/* Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-outfit)', color: 'var(--accent-primary)' }}>{u.total_workouts}</span>
                      {u.avg_feeling && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: feelingColor }}>{Math.round(u.avg_feeling)}pts</span>}
                      {u.last_workout && <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>{fmtDate(u.last_workout)}</span>}
                    </div>
                    <ChevronRight size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
