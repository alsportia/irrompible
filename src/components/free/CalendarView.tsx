"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/userContext";
import LoginSelector from "../LoginSelector";
import { PAGE_BG, CARD_BG, TEXT, TEXT_MUTED, ACCENT, ACCENT_SOFT, ACCENT_STRONG, BORDER, card } from "./shared";

interface FreeSetRow {
  id: number;
  session_time: string | null;
  reps: number | null;
  duration_seconds: number | null;
  weight_kg: number;
  one_rm: number | null;
  notes: string | null;
}

interface CalendarDay {
  session_date: string;
  exercise_id: number;
  exercise_name: string;
  sets: number;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Mes en formato YYYY-MM a partir de un desplazamiento respecto al mes actual
function monthKey(offset: number): string {
  const d = new Date();
  const m = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
}

export default function CalendarView() {
  const { user } = useUser();
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  // Ejercicio desplegado en el detalle del día y sus series, cargadas bajo demanda
  const [openExercise, setOpenExercise] = useState<number | null>(null);
  const [setsByExercise, setSetsByExercise] = useState<Record<number, FreeSetRow[]>>({});

  const month = monthKey(offset);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/free/calendar?month=${month}`, { headers: { "x-user-id": String(user.id) } })
      .then(r => r.json())
      .then(d => setDays(Array.isArray(d) ? d : []));
  }, [user, month]);

  // Ejercicios agrupados por día, para marcar el calendario y mostrar el detalle
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarDay[]>();
    for (const r of days) {
      const list = map.get(r.session_date) ?? [];
      list.push(r);
      map.set(r.session_date, list);
    }
    return map;
  }, [days]);

  // Al abrir un ejercicio se piden sus series de ese día (una sola vez por ejercicio y día)
  const toggleExercise = (exerciseId: number) => {
    if (openExercise === exerciseId) { setOpenExercise(null); return; }
    setOpenExercise(exerciseId);
    if (!user || !selected || setsByExercise[exerciseId]) return;
    fetch(`/api/free/sets?exerciseId=${exerciseId}&date=${selected}`, { headers: { "x-user-id": String(user.id) } })
      .then(r => r.json())
      .then(d => setSetsByExercise(prev => ({ ...prev, [exerciseId]: Array.isArray(d) ? d : [] })));
  };

  if (!user) return <LoginSelector />;

  // Celdas del mes: se empieza en lunes y se rellenan con vacíos al principio
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const detail = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div style={{ minHeight: '100dvh', background: PAGE_BG }}>
      <main style={{ minHeight: '100dvh', color: TEXT, maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/libre" aria-label="Volver" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD_BG, color: TEXT_MUTED, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <ChevronLeft size={20} />
          </Link>
          <div>
            <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: 0 }}>{user.name}</p>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: ACCENT_STRONG, margin: 0, lineHeight: 1.1 }}>Calendario</h1>
          </div>
        </header>

        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <button onClick={() => { setOffset(o => o - 1); setSelected(null); }} aria-label="Mes anterior"
              style={{ background: '#f5f5f5', border: `1px solid ${BORDER}`, borderRadius: '0.6rem', padding: '0.3rem 0.5rem', cursor: 'pointer', color: TEXT }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => { setOffset(o => Math.min(o + 1, 0)); setSelected(null); }} disabled={offset >= 0} aria-label="Mes siguiente"
              style={{ background: '#f5f5f5', border: `1px solid ${BORDER}`, borderRadius: '0.6rem', padding: '0.3rem 0.5rem', cursor: offset >= 0 ? 'not-allowed' : 'pointer', opacity: offset >= 0 ? 0.4 : 1, color: TEXT }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center', fontSize: '0.7rem', color: TEXT_MUTED, marginBottom: '0.25rem' }}>
            {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
            {cells.map((key, i) => {
              if (!key) return <span key={`e${i}`} />;
              const trained = byDay.has(key);
              const isSel = selected === key;
              const dayNum = Number(key.slice(8));
              return (
                <button key={key} onClick={() => { if (!trained) return; setSelected(isSel ? null : key); setOpenExercise(null); setSetsByExercise({}); }} disabled={!trained}
                  aria-label={`${key}${trained ? ", entrenado" : ""}`}
                  style={{
                    aspectRatio: '1 / 1', borderRadius: '0.6rem', border: isSel ? `2px solid ${ACCENT}` : '1px solid transparent',
                    background: trained ? (isSel ? ACCENT : ACCENT_SOFT) : 'transparent',
                    color: trained ? (isSel ? '#fff' : ACCENT_STRONG) : TEXT,
                    fontWeight: trained ? 800 : 400, fontSize: '0.85rem', cursor: trained ? 'pointer' : 'default', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {dayNum}
                </button>
              );
            })}
          </div>
        </section>

        {selected && (
          <section style={card}>
            <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, marginBottom: '0.5rem', textTransform: 'capitalize' }}>
              {new Date(selected + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {detail.map(e => {
              const open = openExercise === e.exercise_id;
              return (
                <div key={e.exercise_id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <button onClick={() => toggleExercise(e.exercise_id)} aria-expanded={open}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0', background: 'none', border: 'none', color: TEXT, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left' }}>
                    <span style={{ fontWeight: 600 }}>{e.exercise_name}</span>
                    <span style={{ color: TEXT_MUTED, whiteSpace: 'nowrap' }}>{e.sets} {e.sets === 1 ? "serie" : "series"} {open ? "▴" : "▾"}</span>
                  </button>
                  {open && (
                    <div style={{ background: '#fafafa', borderRadius: '0.7rem', padding: '0.6rem 0.75rem', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                      {(setsByExercise[e.exercise_id] ?? []).length === 0 && <p style={{ color: TEXT_MUTED, margin: 0 }}>Cargando...</p>}
                      {(setsByExercise[e.exercise_id] ?? []).map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.3rem 0', borderBottom: `1px solid ${BORDER}` }}>
                          <span style={{ color: TEXT_MUTED }}>{s.session_time ?? ""}</span>
                          <span style={{ textAlign: 'right' }}>
                            {s.reps != null ? `${s.reps} reps` : ""}
                            {s.duration_seconds != null ? ` · ${s.duration_seconds}s` : ""}
                            {s.weight_kg > 0 ? ` · ${s.weight_kg} kg` : ""}
                            {s.one_rm != null ? <span style={{ color: ACCENT_STRONG, fontWeight: 700 }}> · 1RM ≈ {s.one_rm}</span> : null}
                            {s.notes ? <span style={{ display: 'block', color: TEXT_MUTED, fontSize: '0.78rem' }}>{s.notes}</span> : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
