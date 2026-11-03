"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PlusCircle, Trash2, X } from "lucide-react";
import { useUser } from "@/lib/userContext";
import LoginSelector from "./LoginSelector";

interface FreeExercise {
  id: number;
  name: string;
  is_global: number;
  image_url: string | null;
}

// Selector con miniatura, buscador y lista desplegable
function ExercisePicker({ exercises, value, onChange }: { exercises: FreeExercise[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = exercises.find(e => String(e.id) === value);
  const filtered = exercises.filter(e => e.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ ...input, display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', textAlign: 'left' }}>
        {selected ? <ExerciseThumb src={selected.image_url} size={32} /> : null}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${selected.name}${selected.is_global ? "" : " (mío)"}` : "— Elige un ejercicio —"}
        </span>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 0.3rem)', left: 0, right: 0, maxHeight: '18rem', display: 'flex', flexDirection: 'column', background: '#0f0f0f', border: '1px solid #262626', borderRadius: '0.75rem', boxShadow: '0 12px 30px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
          <input autoFocus placeholder="Buscar ejercicio" value={query} onChange={e => setQuery(e.target.value)}
            style={{ ...input, border: 'none', borderBottom: '1px solid #262626', borderRadius: 0 }} />
          <div style={{ overflowY: 'auto' }}>
            {filtered.length === 0 && <p style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sin resultados</p>}
            {filtered.slice(0, 200).map(e => (
              <button key={e.id} type="button" onClick={() => { onChange(String(e.id)); setOpen(false); setQuery(""); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: String(e.id) === value ? '#1f1f1f' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem' }}>
                <ExerciseThumb src={e.image_url} size={36} />
                <span style={{ flex: 1 }}>{e.name}{e.is_global ? "" : " (mío)"}</span>
              </button>
            ))}
            {filtered.length > 200 && <p style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Escribe más para acotar la lista</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Imagen genérica para ejercicios propios (sin imagen). Se puede sustituir por una personalizada más adelante.
const GENERIC_IMAGE = "/exercise-placeholder.svg";

function ExerciseThumb({ src, size }: { src: string | null; size: number }) {
  return (
    <img
      src={src ?? GENERIC_IMAGE}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = GENERIC_IMAGE; }}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: '0.5rem', background: '#0f0f0f', flexShrink: 0 }}
    />
  );
}

interface FreeSet {
  id: number;
  exercise_name: string;
  session_date: string;
  session_time: string | null;
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number;
  one_rm: number | null;
}

interface ProgressRow {
  session_date: string;
  best_one_rm: number | null;
  max_weight: number;
  sets: number;
  total_reps: number | null;
}

// Estilo A: fondo negro plano y tarjetas de color sólido (sin transparencia)
const PAGE_BG = '#000';
const CARD_BG = '#141414';
const ACCENT = '#c6ff3d';

const card: React.CSSProperties = {
  background: CARD_BG,
  border: '1px solid #222',
  borderRadius: '1.1rem',
  padding: '1.1rem',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  borderRadius: '0.7rem',
  border: '1px solid #2a2a2a',
  background: '#0b0b0b',
  color: '#fff',
  fontSize: '0.95rem',
  colorScheme: 'dark',
};

const optionStyle: React.CSSProperties = { background: '#111', color: '#fff' };

const LAST_COUNT_OPTIONS = [3, 5, 10, 20];

type Period = "week" | "month" | "year";

const PERIOD_LABEL: Record<Period, string> = { week: "Semana", month: "Mes", year: "Año" };

// Inicio y fin (YYYY-MM-DD, inclusive) de la ventana de un periodo desplazada `offset` veces
function periodWindow(period: Period, offset: number): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (period === "week") {
    // Semana de lunes a domingo
    const day = (now.getDay() + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + offset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { start: fmt(start), end: fmt(end) };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  const y = now.getFullYear() + offset;
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

function periodTitle(period: Period, offset: number): string {
  const { start, end } = periodWindow(period, offset);
  if (period === "year") return start.slice(0, 4);
  if (period === "month") {
    const d = new Date(start + "T00:00:00");
    return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }
  return `${start} → ${end}`;
}

// Fecha y hora locales en formato de los inputs (YYYY-MM-DD y HH:MM)
function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// Filas de progreso dentro del periodo elegido (la gráfica y la tabla usan siempre esta selección)
function rowsInPeriod(rows: ProgressRow[], period: Period, offset: number): ProgressRow[] {
  const { start, end } = periodWindow(period, offset);
  return rows.filter(r => r.session_date >= start && r.session_date <= end);
}

// Gráfica de líneas en SVG del mejor 1RM por día, dentro del periodo elegido
function ProgressChart({ rows, period, offset }: { rows: ProgressRow[]; period: Period; offset: number }) {
  const points = rowsInPeriod(rows, period, offset).filter(r => r.best_one_rm != null);
  if (points.length < 2) {
    return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Necesitas al menos dos días con peso y repeticiones en este periodo.</p>;
  }
  const W = 320, H = 160, P = 28;
  const values = points.map(p => Number(p.best_one_rm));
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(Number(p.best_one_rm)).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--border-subtle)" />
      <text x={4} y={P} fontSize="10" fill="var(--text-secondary)">{max.toFixed(1)}</text>
      <text x={4} y={H - P} fontSize="10" fill="var(--text-secondary)">{min.toFixed(1)}</text>
      <path d={path} fill="none" stroke="var(--accent-primary)" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={p.session_date} cx={x(i)} cy={y(Number(p.best_one_rm))} r="3" fill="var(--accent-primary)" />
      ))}
      <text x={P} y={H - 6} fontSize="10" fill="var(--text-secondary)">{points[0].session_date}</text>
      <text x={W - P} y={H - 6} fontSize="10" textAnchor="end" fill="var(--text-secondary)">{points[points.length - 1].session_date}</text>
    </svg>
  );
}

export default function FreeLogClient() {
  const { user } = useUser();
  const [exercises, setExercises] = useState<FreeExercise[]>([]);
  const [sets, setSets] = useState<FreeSet[]>([]);
  const [exerciseId, setExerciseId] = useState<string>("");
  const [date, setDate] = useState(nowLocal().date);
  const [time, setTime] = useState(nowLocal().time);
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [lastCount, setLastCount] = useState(3);
  const [period, setPeriod] = useState<Period>("week");
  const [offset, setOffset] = useState(0); // 0 = periodo actual, -1 = anterior, etc.

  const headers = user ? { "x-user-id": String(user.id) } : undefined;

  const loadExercises = async () => {
    if (!user) return;
    const ex = await fetch("/api/free/exercises", { headers }).then(r => r.json());
    setExercises(Array.isArray(ex) ? ex : []);
  };

  useEffect(() => { loadExercises(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  // Series y progreso solo del ejercicio elegido; se recargan al guardar una serie
  useEffect(() => { setOffset(0); }, [exerciseId]);

  useEffect(() => {
    if (!user || !exerciseId) { setSets([]); setProgress([]); return; }
    const h = { "x-user-id": String(user.id) };
    Promise.all([
      fetch(`/api/free/sets?exerciseId=${exerciseId}`, { headers: h }).then(r => r.json()),
      fetch(`/api/free/progress?exerciseId=${exerciseId}`, { headers: h }).then(r => r.json()),
    ]).then(([st, pr]) => {
      setSets(Array.isArray(st) ? st : []);
      setProgress(Array.isArray(pr) ? pr : []);
    });
  }, [user, exerciseId, refresh]);

  if (!user) return <LoginSelector />;

  const periodRows = rowsInPeriod(progress, period, offset);
  const selectedExercise = exercises.find(e => String(e.id) === exerciseId);

  const deleteExercise = async () => {
    const ex = exercises.find(e => String(e.id) === exerciseId);
    if (!ex || ex.is_global) return;
    const ok = window.confirm(`¿Borrar "${ex.name}" y todas sus series? Esta acción no se puede deshacer.`);
    if (!ok) return;
    const res = await fetch(`/api/free/exercises/${ex.id}`, { method: "DELETE", headers });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error al borrar"); return; }
    setExerciseId("");
    setError("");
    await loadExercises();
  };

  const createExercise = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/free/exercises", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al crear el ejercicio"); return; }
    setNewName("");
    setShowNew(false);
    setError("");
    await loadExercises();
    setExerciseId(String(data.id));
  };

  const saveSet = async () => {
    if (!exerciseId) { setError("Elige un ejercicio"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/free/sets", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId,
        sessionDate: date,
        sessionTime: time,
        reps,
        durationSeconds: duration,
        weightKg: weight,
        notes,
      }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error al guardar"); return; }
    // Se limpian los valores de la serie; la fecha y hora se mantienen para registrar varias seguidas
    setReps(""); setWeight(""); setDuration(""); setNotes("");
    setRefresh(n => n + 1);
  };

  return (
    <main style={{ minHeight: '100dvh', background: PAGE_BG, color: '#fff', maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.25rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/programs" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141414', border: '1px solid #222', color: '#bbb' }}>
          <ChevronLeft size={20} />
        </Link>
        <h1 className="heading-display" style={{ fontSize: '1.75rem' }}>Registro libre</h1>
      </header>

      <section style={card}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ejercicio</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
          <ExercisePicker exercises={exercises} value={exerciseId} onChange={setExerciseId} />
          {exerciseId && !exercises.find(e => String(e.id) === exerciseId)?.is_global && (
            <button onClick={deleteExercise} title="Borrar este ejercicio"
              style={{ ...input, width: '2.75rem', flex: '0 0 2.75rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f87171' }}>
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={() => setShowNew(v => !v)} title={showNew ? "Cerrar" : "Añadir ejercicio"}
            style={{ ...input, width: '2.75rem', flex: '0 0 2.75rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {showNew ? <X size={18} /> : <PlusCircle size={18} />}
          </button>
        </div>
        {selectedExercise && (
          <img src={selectedExercise.image_url ?? GENERIC_IMAGE} alt={selectedExercise.name}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = GENERIC_IMAGE; }}
            style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '14rem', objectFit: 'contain', borderRadius: '0.8rem', marginTop: '0.75rem', background: '#0b0b0b' }} />
        )}

        {showNew && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <input style={{ ...input, flex: 1 }} placeholder="Nombre del ejercicio nuevo" value={newName}
              onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createExercise(); }} />
            <button onClick={createExercise}
              style={{ ...input, width: 'auto', padding: '0 1rem', cursor: 'pointer', fontWeight: 600 }}>
              Crear
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Fecha" />
            <input style={input} type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Hora" />
          </div>
          <input style={input} type="number" inputMode="numeric" placeholder="Repeticiones" value={reps} onChange={e => setReps(e.target.value)} />
          <input style={input} type="number" inputMode="decimal" placeholder="Peso (kg), opcional" value={weight} onChange={e => setWeight(e.target.value)} />
          <input style={input} type="number" inputMode="numeric" placeholder="Tiempo empleado (segundos), opcional" value={duration} onChange={e => setDuration(e.target.value)} />
          <input style={input} placeholder="Notas, opcional" value={notes} onChange={e => setNotes(e.target.value)} />
          <button onClick={saveSet} disabled={saving || !exerciseId}
            style={{ ...input, background: exerciseId ? 'var(--accent-primary)' : 'var(--glass-bg)', color: exerciseId ? '#000' : 'var(--text-secondary)', fontWeight: 600, cursor: exerciseId ? 'pointer' : 'not-allowed', border: 'none' }}>
            {saving ? "Guardando..." : exerciseId ? "Guardar serie" : "Elige un ejercicio para guardar"}
          </button>
        </div>
      </section>

      {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}

      {exerciseId && (
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Últimas series</p>
            <select value={lastCount} onChange={e => setLastCount(Number(e.target.value))} style={{ ...input, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>
              {LAST_COUNT_OPTIONS.map(n => <option key={n} value={n} style={optionStyle}>{n}</option>)}
            </select>
          </div>
          {sets.length === 0 && <p style={{ fontSize: '0.875rem' }}>Todavía no hay series de este ejercicio.</p>}
          {sets.slice(0, lastCount).map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
              <span>{s.session_date}{s.session_time ? ` ${s.session_time}` : ""}</span>
              <span style={{ textAlign: 'right' }}>
                {s.reps != null ? `${s.reps} reps` : ""}
                {s.duration_seconds != null ? ` · ${s.duration_seconds}s` : ""}
                {s.weight_kg > 0 ? ` · ${s.weight_kg} kg` : ""}
                {s.one_rm != null ? <><br /><span style={{ color: 'var(--accent-primary)' }}>1RM ≈ {s.one_rm} kg</span></> : null}
              </span>
            </div>
          ))}
        </section>
      )}

      {exerciseId && (
        <section style={card}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Progreso de {exercises.find(e => String(e.id) === exerciseId)?.name}
          </p>

          {/* Barra de navegación del periodo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button onClick={() => setOffset(o => o - 1)} aria-label="Periodo anterior"
              style={{ ...input, width: 'auto', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', textAlign: 'center', textTransform: 'capitalize' }}>{periodTitle(period, offset)}</span>
            <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset >= 0} aria-label="Periodo siguiente"
              style={{ ...input, width: 'auto', padding: '0.3rem 0.6rem', cursor: offset >= 0 ? 'not-allowed' : 'pointer', opacity: offset >= 0 ? 0.4 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <ProgressChart rows={progress} period={period} offset={offset} />

          {/* Selector de periodo */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            {(["week", "month", "year"] as Period[]).map(p => (
              <button key={p} onClick={() => { setPeriod(p); setOffset(0); }}
                style={{ ...input, width: 'auto', flex: 1, padding: '0.4rem 0', cursor: 'pointer', fontWeight: period === p ? 700 : 400, borderColor: period === p ? 'var(--accent-primary)' : 'var(--glass-border)' }}>
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          {periodRows.length > 0 && (
            <table style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '0.3rem 0' }}>Fecha</th>
                  <th>1RM</th>
                  <th>Peso máx.</th>
                  <th>Series</th>
                  <th>Reps</th>
                </tr>
              </thead>
              <tbody>
                {[...periodRows].sort((a, b) => b.session_date.localeCompare(a.session_date)).map(r => (
                  <tr key={r.session_date} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.3rem 0' }}>{r.session_date}</td>
                    <td>{r.best_one_rm != null ? `${Number(r.best_one_rm).toFixed(1)} kg` : "—"}</td>
                    <td>{Number(r.max_weight) > 0 ? `${r.max_weight} kg` : "—"}</td>
                    <td>{r.sets}</td>
                    <td>{r.total_reps ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

    </main>
  );
}
