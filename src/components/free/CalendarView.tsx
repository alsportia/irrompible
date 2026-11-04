"use client"

import BottomBar from "./BottomBar";
import { useLang } from "@/lib/i18n/LangContext";
import { exerciseDisplayName } from "@/lib/i18n/exerciseLabels";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/userContext";
import LoginSelector from "../LoginSelector";
import { PAGE_BG, CARD_BG, TEXT, TEXT_MUTED, ACCENT, ACCENT_SOFT, ACCENT_STRONG, BORDER, card, input } from "./shared";

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

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Mes en formato YYYY-MM a partir de año y mes (0-11)
function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function CalendarView() {
  const { user } = useUser();
  const { lang } = useLang();
  const today = new Date();
  // Mes mostrado (año y mes 0-11) y si está abierto el selector rápido de mes y año
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [picker, setPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  // Meses con entrenamiento del año del selector (YYYY-MM), para resaltarlos
  const [monthsWithData, setMonthsWithData] = useState<string[]>([]);

  // No se puede avanzar más allá del mes actual
  const isCurrentOrFuture = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth >= today.getMonth());

  const stepMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelected(null);
    setOpenExercise(null);
    setSetsByExercise({});
    setExerciseFilter(null);
  };
  const [days, setDays] = useState<CalendarDay[]>([]);
  // Ejercicio por el que filtrar el calendario (null = todos)
  const [exerciseFilter, setExerciseFilter] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Ejercicio desplegado en el detalle del día y sus series, cargadas bajo demanda
  const [openExercise, setOpenExercise] = useState<number | null>(null);
  const [setsByExercise, setSetsByExercise] = useState<Record<number, FreeSetRow[]>>({});

  const month = monthKey(viewYear, viewMonth);

  // Meses con datos del año que se está mirando en el selector
  useEffect(() => {
    if (!user || !picker) return;
    fetch(`/api/free/calendar?year=${pickerYear}`, { headers: { "x-user-id": String(user.id) } })
      .then(r => r.json())
      .then(d => setMonthsWithData(Array.isArray(d) ? d : []));
  }, [user, picker, pickerYear]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/free/calendar?month=${month}&lang=${lang}`, { headers: { "x-user-id": String(user.id) } })
      .then(r => r.json())
      .then(d => setDays(Array.isArray(d) ? d : []));
  }, [user, month, lang]);

  // Ejercicios entrenados en el mes visible, sin repetir, para el desplegable de filtro
  const monthExercises = useMemo(() => {
    const seen = new Map<number, string>();
    for (const r of days) if (!seen.has(r.exercise_id)) seen.set(r.exercise_id, r.exercise_name);
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [days]);

  // Ejercicios agrupados por día, para marcar el calendario y mostrar el detalle.
  // Si hay un ejercicio elegido en el filtro, solo cuentan sus días.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarDay[]>();
    for (const r of days) {
      if (exerciseFilter != null && r.exercise_id !== exerciseFilter) continue;
      const list = map.get(r.session_date) ?? [];
      list.push(r);
      map.set(r.session_date, list);
    }
    return map;
  }, [days, exerciseFilter]);

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
  const y = viewYear, m = viewMonth + 1;
  const first = new Date(y, viewMonth, 1);
  const daysInMonth = new Date(y, viewMonth + 1, 0).getDate();
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
            <button onClick={() => { stepMonth(-1); }} aria-label="Mes anterior"
              style={{ background: '#f5f5f5', border: `1px solid ${BORDER}`, borderRadius: '0.6rem', padding: '0.3rem 0.5rem', cursor: 'pointer', color: TEXT }}>
              <ChevronLeft size={16} />
            </button>
            {/* Pulsar el mes abre el selector rápido de mes y año */}
            <button onClick={() => { setPickerYear(viewYear); setPicker(p => !p); }} aria-expanded={picker}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, textTransform: 'capitalize', color: TEXT, padding: '0.3rem 0.5rem' }}>
              {new Date(y, viewMonth, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })} ▾
            </button>
            <button onClick={() => { stepMonth(1); }} disabled={isCurrentOrFuture} aria-label="Mes siguiente"
              style={{ background: '#f5f5f5', border: `1px solid ${BORDER}`, borderRadius: '0.6rem', padding: '0.3rem 0.5rem', cursor: isCurrentOrFuture ? 'not-allowed' : 'pointer', opacity: isCurrentOrFuture ? 0.4 : 1, color: TEXT }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {picker && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <button onClick={() => setPickerYear(v => v - 1)} aria-label="Año anterior"
                  style={{ background: '#f5f5f5', border: `1px solid ${BORDER}`, borderRadius: '0.6rem', padding: '0.25rem 0.5rem', cursor: 'pointer', color: TEXT }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{pickerYear}</span>
                <button onClick={() => setPickerYear(v => Math.min(v + 1, today.getFullYear()))} disabled={pickerYear >= today.getFullYear()} aria-label="Año siguiente"
                  style={{ background: '#f5f5f5', border: `1px solid ${BORDER}`, borderRadius: '0.6rem', padding: '0.25rem 0.5rem', cursor: pickerYear >= today.getFullYear() ? 'not-allowed' : 'pointer', opacity: pickerYear >= today.getFullYear() ? 0.4 : 1, color: TEXT }}>
                  <ChevronRight size={14} />
                </button>
              </div>
              {/* Filtro: solo los días en que se entrenó el ejercicio elegido en el mes visible */}
              <select value={exerciseFilter ?? ""} onChange={e => { setExerciseFilter(e.target.value ? Number(e.target.value) : null); setSelected(null); setOpenExercise(null); }}
                aria-label="Filtrar por ejercicio"
                style={{ ...input, marginBottom: '0.6rem', fontSize: '0.85rem', padding: '0.5rem 0.7rem', textAlign: 'center', textAlignLast: 'center' }}>
                <option value="">Todos los ejercicios</option>
                {monthExercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {MONTHS.map((label, mi) => {
                  const future = pickerYear > today.getFullYear() || (pickerYear === today.getFullYear() && mi > today.getMonth());
                  const active = pickerYear === viewYear && mi === viewMonth;
                  const hasData = monthsWithData.includes(monthKey(pickerYear, mi));
                  return (
                    <button key={label} disabled={future} onClick={() => { setViewYear(pickerYear); setViewMonth(mi); setSelected(null); setPicker(false); }}
                      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0.5rem 0', borderRadius: '0.6rem', border: `1px solid ${active ? ACCENT : hasData ? ACCENT : BORDER}`, background: active ? ACCENT_SOFT : hasData ? '#fff7ec' : '#fafafa', color: active || hasData ? ACCENT_STRONG : TEXT, fontWeight: active || hasData ? 800 : 500, fontSize: '0.85rem', cursor: future ? 'not-allowed' : 'pointer', opacity: future || !hasData && !active ? 0.45 : 1 }}>
                      {label}
                      {hasData && <span aria-label="con entrenamientos" style={{ position: 'absolute', bottom: '0.2rem', left: '50%', transform: 'translateX(-50%)', width: '0.3rem', height: '0.3rem', borderRadius: '50%', background: ACCENT }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
        <BottomBar />
      </main>
    </div>
  );
}
