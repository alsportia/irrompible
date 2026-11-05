"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, NotebookPen, Pencil, PlusCircle, Repeat, Timer, Trash2, X } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useLang } from "@/lib/i18n/LangContext";
import { exerciseDisplayName, bodyPartLabel, equipmentLabel } from "@/lib/i18n/exerciseLabels";
import LoginSelector from "./LoginSelector";
import BottomBar from "./free/BottomBar";

interface FreeExercise {
  id: number;
  name: string;
  name_es: string | null;
  body_part: string | null;
  equipment: string | null;
  is_global: number;
  image_url: string | null;
}

// Selector con miniatura, buscador y lista desplegable
function ExercisePicker({ exercises, value, onChange }: { exercises: FreeExercise[]; value: string; onChange: (id: string) => void }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [bodyFilter, setBodyFilter] = useState("");
  const [equipFilter, setEquipFilter] = useState("");
  const selected = exercises.find(e => String(e.id) === value);

  // Valores que existen de verdad en la lista, para no ofrecer filtros vacíos
  const bodyOptions = [...new Set(exercises.map(e => e.body_part).filter((v): v is string => !!v))].sort();
  const equipOptions = [...new Set(exercises.map(e => e.equipment).filter((v): v is string => !!v))].sort();

  // El buscador busca en el nombre que se ve, y en el original también para no perder resultados
  const filtered = exercises.filter(e => {
    const q = query.trim().toLowerCase();
    const textOk = !q || exerciseDisplayName(e, lang).toLowerCase().includes(q) || e.name.toLowerCase().includes(q);
    const bodyOk = !bodyFilter || e.body_part === bodyFilter;
    const equipOk = !equipFilter || e.equipment === equipFilter;
    return textOk && bodyOk && equipOk;
  });

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ ...input, display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', textAlign: 'left' }}>
        {selected ? <ExerciseThumb src={selected.image_url} size={32} /> : null}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${exerciseDisplayName(selected, lang)}${selected.is_global ? "" : " (mío)"}` : "— Elige un ejercicio —"}
        </span>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 0.3rem)', left: 0, right: 0, maxHeight: '18rem', display: 'flex', flexDirection: 'column', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: '0.9rem', boxShadow: '0 12px 30px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
          <input autoFocus placeholder="Buscar ejercicio" value={query} onChange={e => setQuery(e.target.value)}
            style={{ ...input, border: 'none', borderBottom: `1px solid ${BORDER}`, borderRadius: 0 }} />
          {/* Filtros por zona del cuerpo y por equipo; combinables con el buscador */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', padding: '0.5rem', borderBottom: `1px solid ${BORDER}` }}>
            <select value={bodyFilter} onChange={e => setBodyFilter(e.target.value)} aria-label="Filtrar por zona del cuerpo"
              style={{ ...input, padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}>
              <option value="">Todas las zonas</option>
              {bodyOptions.map(v => <option key={v} value={v}>{bodyPartLabel(v, lang)}</option>)}
            </select>
            <select value={equipFilter} onChange={e => setEquipFilter(e.target.value)} aria-label="Filtrar por equipo"
              style={{ ...input, padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}>
              <option value="">Todo el equipo</option>
              {equipOptions.map(v => <option key={v} value={v}>{equipmentLabel(v, lang)}</option>)}
            </select>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {filtered.length === 0 && <p style={{ padding: '0.75rem', fontSize: '0.85rem', color: TEXT_MUTED }}>Sin resultados</p>}
            {filtered.slice(0, 200).map(e => (
              <button key={e.id} type="button" onClick={() => { onChange(String(e.id)); setOpen(false); setQuery(""); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', background: String(e.id) === value ? ACCENT_SOFT : 'transparent', border: 'none', color: TEXT, cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem' }}>
                <ExerciseThumb src={e.image_url} size={36} />
                <span style={{ flex: 1 }}>{exerciseDisplayName(e, lang)}{e.is_global ? "" : " (mío)"}</span>
              </button>
            ))}
            {filtered.length > 200 && <p style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: TEXT_MUTED }}>Escribe más para acotar la lista</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// Campo con icono a la izquierda; el icono va dentro del input (relativo al contenedor)
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }} title={label}>
      <span aria-hidden style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED, display: 'flex', pointerEvents: 'none' }}>{icon}</span>
      {children}
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
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: '0.5rem', background: '#f5f5f5', flexShrink: 0 }}
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
  notes: string | null;
}

interface ProgressRow {
  session_date: string;
  best_one_rm: number | null;
  max_weight: number;
  sets: number;
  total_reps: number | null;
}

// Paleta clara: fondo gris, tarjetas blancas y naranja como acento (medida en la referencia)
const PAGE_BG = '#f2f2f2';
const CARD_BG = '#ffffff';
const TEXT = '#2b2b2b';
const TEXT_MUTED = '#8a8a8a';
const BORDER = '#d9d9d9';
const ACCENT = '#ffa94d';
const ACCENT_STRONG = '#f59f2b';
const ACCENT_SOFT = '#fff1e0';
const ACCENT_GRADIENT = 'linear-gradient(90deg, #ffd23f, #ffa94d)';

const card: React.CSSProperties = {
  background: CARD_BG,
  border: 'none',
  borderRadius: '1.5rem',
  padding: '1.25rem',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.05)',
  color: TEXT,
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  borderRadius: '0.8rem',
  border: `1px solid ${BORDER}`,
  background: '#f5f5f5',
  color: TEXT,
  fontSize: '0.95rem',
  colorScheme: 'light',
};

const optionStyle: React.CSSProperties = { background: '#fff', color: TEXT };

const label: React.CSSProperties = { fontSize: '0.8rem', color: TEXT_MUTED, fontWeight: 500 };

const pill: React.CSSProperties = {
  borderRadius: '999px',
  padding: '0.35rem 0.85rem',
  fontSize: '0.8rem',
  fontWeight: 600,
  background: ACCENT_SOFT,
  color: ACCENT_STRONG,
  border: 'none',
};

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

// Gráfica de línea suave con relleno, estilo de referencia: mejor 1RM por día dentro del periodo
function ProgressChart({ rows, period, offset }: { rows: ProgressRow[]; period: Period; offset: number }) {
  const points = rowsInPeriod(rows, period, offset).filter(r => r.best_one_rm != null);
  if (points.length < 2) {
    return <p style={{ fontSize: '0.875rem', color: TEXT_MUTED }}>Necesitas al menos dos días con peso y repeticiones en este periodo.</p>;
  }
  const W = 320, H = 170, P = 28;
  const values = points.map(p => Number(p.best_one_rm));
  const max = Math.max(...values);
  // Eje con margen para que la curva no toque los bordes
  const lo = Math.floor(Math.min(...values) - 2), hi = Math.ceil(max + 2);
  const span = hi - lo || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P);
  const pts = points.map((p, i) => [x(i), y(Number(p.best_one_rm))] as const);

  // Curva suave (Catmull-Rom convertida a Bézier cúbica)
  const f = (n: number) => n.toFixed(1);
  let line = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    line += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  const last = pts[pts.length - 1], first = pts[0];
  const area = `${line} L${f(last[0])},${H - P} L${f(first[0])},${H - P} Z`;
  const grid = [0, 1, 2, 3].map(k => lo + (span * k) / 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="free-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd23f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffd23f" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grid.map(v => (
        <g key={v}>
          <line x1={P} y1={y(v)} x2={W - P} y2={y(v)} stroke={BORDER} strokeWidth="1" />
          <text x={P - 6} y={y(v) + 3} fontSize="9" textAnchor="end" fill={TEXT_MUTED}>{v.toFixed(0)}</text>
        </g>
      ))}
      <path d={area} fill="url(#free-area)" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
      {pts.map(([cx, cy], i) => (
        <circle key={points[i].session_date} cx={cx} cy={cy} r="3.5" fill="#fff" stroke={ACCENT_STRONG} strokeWidth="2" />
      ))}
      <text x={P} y={H - 6} fontSize="9" fill={TEXT_MUTED}>{points[0].session_date.slice(5)}</text>
      <text x={W - P} y={H - 6} fontSize="9" textAnchor="end" fill={TEXT_MUTED}>{points[points.length - 1].session_date.slice(5)}</text>
    </svg>
  );
}

export default function FreeLogClient() {
  const { user } = useUser();
  const { lang } = useLang();
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
  const [editingId, setEditingId] = useState<number | null>(null); // serie que se está corrigiendo
  // Detalle del ejercicio elegido: GIF animado y atribución (desde /api/free/exercises/[id]/detail)
  const [detail, setDetail] = useState<{ gif_url: string | null; attribution: string | null } | null>(null);

  const headers = user ? { "x-user-id": String(user.id) } : undefined;

  const loadExercises = async () => {
    if (!user) return;
    const ex = await fetch(`/api/free/exercises?lang=${lang}`, { headers }).then(r => r.json());
    setExercises(Array.isArray(ex) ? ex : []);
  };

  useEffect(() => { loadExercises(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, lang]);

  // Series y progreso solo del ejercicio elegido; se recargan al guardar una serie
  useEffect(() => { setOffset(0); }, [exerciseId]);

  // Detalle (GIF y atribución) del ejercicio elegido
  useEffect(() => {
    if (!user || !exerciseId) { setDetail(null); return; }
    fetch(`/api/free/exercises/${exerciseId}/detail?lang=${lang}`, { headers: { "x-user-id": String(user.id) } })
      .then(r => r.json())
      .then(d => setDetail(d?.error ? null : d));
  }, [user, exerciseId, lang]);

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

  // Guarda una serie nueva, o actualiza la que se está editando
  const saveSet = async () => {
    if (!exerciseId) { setError("Elige un ejercicio"); return; }
    setSaving(true);
    setError("");
    const body = JSON.stringify({
      exerciseId,
      sessionDate: date,
      sessionTime: time,
      reps,
      durationSeconds: duration,
      weightKg: weight,
      notes,
    });
    const res = editingId
      ? await fetch(`/api/free/sets/${editingId}`, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body })
      : await fetch("/api/free/sets", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error al guardar"); return; }
    // Al crear se limpian los valores; la fecha y hora se mantienen para registrar varias seguidas
    setEditingId(null);
    setReps(""); setWeight(""); setDuration(""); setNotes("");
    setRefresh(n => n + 1);
  };

  // Rellena el formulario con una serie existente para corregirla
  const startEdit = (s: FreeSet) => {
    setEditingId(s.id);
    setDate(s.session_date);
    setTime(s.session_time ?? "");
    setReps(s.reps != null ? String(s.reps) : "");
    setWeight(s.weight_kg > 0 ? String(s.weight_kg) : "");
    setDuration(s.duration_seconds != null ? String(s.duration_seconds) : "");
    setNotes(s.notes ?? "");
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setReps(""); setWeight(""); setDuration(""); setNotes("");
  };

  const deleteSet = async (id: number) => {
    if (!window.confirm("¿Borrar esta serie? No se puede deshacer.")) return;
    const res = await fetch(`/api/free/sets/${id}`, { method: "DELETE", headers });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error al borrar"); return; }
    if (editingId === id) cancelEdit();
    setRefresh(n => n + 1);
  };

  // El fondo gris cubre toda la pantalla; el contenido va en una columna centrada
  return (
    <div style={{ minHeight: '100dvh', background: PAGE_BG }}>
    <main style={{ minHeight: '100dvh', color: TEXT, maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/programs" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD_BG, color: TEXT_MUTED, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <ChevronLeft size={20} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: 0 }}>{user.name}</p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: ACCENT_STRONG, margin: 0, lineHeight: 1.1 }}>Entrenamiento libre</h1>
        </div>
      </header>

      <section style={card}>
        <label style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>Ejercicio</label>
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
          <>
            {/* GIF animado del dataset (la lista usa la imagen fija); propios usan su imagen */}
            <img src={detail?.gif_url ?? selectedExercise.image_url ?? GENERIC_IMAGE} alt={exerciseDisplayName(selectedExercise, lang)}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = selectedExercise.image_url ?? GENERIC_IMAGE; }}
              style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '14rem', objectFit: 'contain', borderRadius: '0.8rem', marginTop: '0.75rem', background: '#f5f5f5' }} />
            {detail?.attribution && (
              <p style={{ fontSize: '0.7rem', color: TEXT_MUTED, margin: '0.35rem 0 0', textAlign: 'center' }}>{detail.attribution}</p>
            )}
          </>
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
          {/* Dos columnas iguales; cada celda recorta lo que sobre para que fecha y hora nunca se solapen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: '100%', minWidth: 0 }}>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <Field icon={<CalendarDays size={16} />} label="Fecha">
                <input style={{ ...input, width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', padding: '0.7rem 0.4rem 0.7rem 2.1rem', fontSize: '0.85rem', WebkitAppearance: 'none', appearance: 'none' }} type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Fecha" />
              </Field>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <Field icon={<Timer size={16} />} label="Hora">
                <input style={{ ...input, width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', padding: '0.7rem 0.4rem 0.7rem 2.1rem', fontSize: '0.85rem', WebkitAppearance: 'none', appearance: 'none' }} type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Hora" />
              </Field>
            </div>
          </div>
          <Field icon={<Repeat size={16} />} label="Repeticiones">
            <input style={{ ...input, paddingLeft: '2.4rem' }} type="number" inputMode="numeric" placeholder="Repeticiones" value={reps} onChange={e => setReps(e.target.value)} />
          </Field>
          <Field icon={<Dumbbell size={16} />} label="Peso en kg">
            <input style={{ ...input, paddingLeft: '2.4rem' }} type="number" inputMode="decimal" placeholder="Peso (kg), opcional" value={weight} onChange={e => setWeight(e.target.value)} />
          </Field>
          <Field icon={<Timer size={16} />} label="Tiempo en segundos">
            <input style={{ ...input, paddingLeft: '2.4rem' }} type="number" inputMode="numeric" placeholder="Tiempo empleado (segundos), opcional" value={duration} onChange={e => setDuration(e.target.value)} />
          </Field>
          <Field icon={<NotebookPen size={16} />} label="Notas">
            <input style={{ ...input, paddingLeft: '2.4rem' }} placeholder="Notas, opcional" value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>
          <button onClick={saveSet} disabled={saving || !exerciseId}
            style={{ ...input, background: exerciseId ? ACCENT_GRADIENT : '#ececec', color: exerciseId ? '#fff' : TEXT_MUTED, fontWeight: 700, cursor: exerciseId ? 'pointer' : 'not-allowed', border: 'none', borderRadius: '999px', padding: '0.85rem' }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : exerciseId ? "Guardar serie" : "Elige un ejercicio para guardar"}
          </button>
          {editingId && (
            <button onClick={cancelEdit}
              style={{ ...input, background: '#fff', color: TEXT, fontWeight: 600, cursor: 'pointer', borderRadius: '999px', padding: '0.7rem' }}>
              Cancelar edición
            </button>
          )}
        </div>
      </section>

      {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}

      {exerciseId && (
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>Últimas series</p>
            <select value={lastCount} onChange={e => setLastCount(Number(e.target.value))} style={{ ...input, width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>
              {LAST_COUNT_OPTIONS.map(n => <option key={n} value={n} style={optionStyle}>{n}</option>)}
            </select>
          </div>
          {sets.length === 0 && <p style={{ fontSize: '0.875rem' }}>Todavía no hay series de este ejercicio.</p>}
          {sets.slice(0, lastCount).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: `1px solid ${BORDER}`, fontSize: '0.875rem', background: editingId === s.id ? ACCENT_SOFT : 'transparent' }}>
              <span style={{ flex: 1 }}>{s.session_date}{s.session_time ? ` ${s.session_time}` : ""}</span>
              <span style={{ textAlign: 'right' }}>
                {s.reps != null ? `${s.reps} reps` : ""}
                {s.duration_seconds != null ? ` · ${s.duration_seconds}s` : ""}
                {s.weight_kg > 0 ? ` · ${s.weight_kg} kg` : ""}
                {s.one_rm != null ? <><br /><span style={{ color: ACCENT_STRONG, fontWeight: 700 }}>1RM ≈ {s.one_rm} kg</span></> : null}
              </span>
              <button onClick={() => startEdit(s)} aria-label="Editar serie" title="Editar"
                style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                <Pencil size={15} />
              </button>
              <button onClick={() => deleteSet(s.id)} aria-label="Borrar serie" title="Borrar"
                style={{ background: 'none', border: 'none', color: '#e05555', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </section>
      )}

      {exerciseId && (
        <section style={card}>
          <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, marginBottom: '0.5rem' }}>
            Progreso de {(() => { const ex = exercises.find(e => String(e.id) === exerciseId); return ex ? exerciseDisplayName(ex, lang) : ""; })()}
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
                style={{ ...input, width: 'auto', flex: 1, padding: '0.4rem 0', textAlign: 'center', cursor: 'pointer', fontWeight: period === p ? 700 : 400, background: period === p ? ACCENT_SOFT : '#fafafa', color: period === p ? ACCENT_STRONG : TEXT, borderColor: period === p ? ACCENT : BORDER }}>
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          {periodRows.length > 0 && (
            <table style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: TEXT_MUTED, textAlign: 'left' }}>
                  <th style={{ padding: '0.3rem 0' }}>Fecha</th>
                  <th>1RM</th>
                  <th>Peso máx.</th>
                  <th>Series</th>
                  <th>Reps</th>
                </tr>
              </thead>
              <tbody>
                {[...periodRows].sort((a, b) => b.session_date.localeCompare(a.session_date)).map(r => (
                  <tr key={r.session_date} style={{ borderTop: `1px solid ${BORDER}` }}>
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

      <BottomBar />
    </main>
    </div>
  );
}
