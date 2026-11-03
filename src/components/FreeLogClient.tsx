"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, PlusCircle, X } from "lucide-react";
import { useUser } from "@/lib/userContext";
import LoginSelector from "./LoginSelector";

interface FreeExercise {
  id: number;
  name: string;
  is_global: number;
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

const card: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: '1rem',
  padding: '1rem',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '0.6rem',
  border: '1px solid var(--glass-border)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.95rem',
  colorScheme: 'dark',
};

const optionStyle: React.CSSProperties = { background: '#111', color: '#fff' };

// Fecha y hora locales en formato de los inputs (YYYY-MM-DD y HH:MM)
function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// Gráfica de líneas en SVG del mejor 1RM por día
function ProgressChart({ rows }: { rows: ProgressRow[] }) {
  const points = rows.filter(r => r.best_one_rm != null);
  if (points.length < 2) {
    return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Necesitas al menos dos días con peso y repeticiones para ver la gráfica.</p>;
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

  const headers = user ? { "x-user-id": String(user.id) } : undefined;

  const loadExercises = async () => {
    if (!user) return;
    const ex = await fetch("/api/free/exercises", { headers }).then(r => r.json());
    setExercises(Array.isArray(ex) ? ex : []);
  };

  useEffect(() => { loadExercises(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  // Series y progreso solo del ejercicio elegido; se recargan al guardar una serie
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
    <main style={{ minHeight: '100dvh', maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.25rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/programs" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
          <ChevronLeft size={20} />
        </Link>
        <h1 className="heading-display" style={{ fontSize: '1.75rem' }}>Registro libre</h1>
      </header>

      <section style={card}>
        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ejercicio</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
          <select value={exerciseId} onChange={e => setExerciseId(e.target.value)} style={{ ...input, flex: 1 }}>
            <option value="" style={optionStyle}>— Elige un ejercicio —</option>
            {exercises.map(e => (
              <option key={e.id} value={e.id} style={optionStyle}>{e.name}{e.is_global ? "" : " (mío)"}</option>
            ))}
          </select>
          <button onClick={() => setShowNew(v => !v)} title={showNew ? "Cerrar" : "Añadir ejercicio"}
            style={{ ...input, width: '2.75rem', flex: '0 0 2.75rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {showNew ? <X size={18} /> : <PlusCircle size={18} />}
          </button>
        </div>

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
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Últimas series</p>
          {sets.length === 0 && <p style={{ fontSize: '0.875rem' }}>Todavía no hay series de este ejercicio.</p>}
          {sets.slice(0, 10).map(s => (
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
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Progreso de {exercises.find(e => String(e.id) === exerciseId)?.name}
          </p>
          <ProgressChart rows={progress} />
          {progress.length > 0 && (
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
                {[...progress].sort((a, b) => b.session_date.localeCompare(a.session_date)).map(r => (
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
