// Compartido por las pantallas de Entrenamiento libre: paleta, periodos y gráfica de 1RM

export const PAGE_BG = '#f2f2f2';
export const CARD_BG = '#ffffff';
export const TEXT = '#2b2b2b';
export const TEXT_MUTED = '#8a8a8a';
export const BORDER = '#d9d9d9';
export const ACCENT = '#ffa94d';
export const ACCENT_STRONG = '#f59f2b';
export const ACCENT_SOFT = '#fff1e0';
export const ACCENT_GRADIENT = 'linear-gradient(90deg, #ffd23f, #ffa94d)';

export const card: React.CSSProperties = {
  background: CARD_BG,
  border: 'none',
  borderRadius: '1.5rem',
  padding: '1.25rem',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 18px rgba(0,0,0,0.05)',
  color: TEXT,
};

export const input: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  borderRadius: '0.8rem',
  border: `1px solid ${BORDER}`,
  background: '#f5f5f5',
  color: TEXT,
  fontSize: '0.95rem',
  colorScheme: 'light',
};

export interface ProgressRow {
  session_date: string;
  best_one_rm: number | null;
  max_weight: number;
  sets: number;
  total_reps: number | null;
}

export type Period = "week" | "month" | "year";

export const PERIOD_LABEL: Record<Period, string> = { week: "Semana", month: "Mes", year: "Año" };

// Inicio y fin (YYYY-MM-DD, inclusive) de la ventana de un periodo desplazada `offset` veces
export function periodWindow(period: Period, offset: number): { start: string; end: string } {
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

export function periodTitle(period: Period, offset: number): string {
  const { start, end } = periodWindow(period, offset);
  if (period === "year") return start.slice(0, 4);
  if (period === "month") {
    const d = new Date(start + "T00:00:00");
    return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }
  return `${start} → ${end}`;
}

// Filas de progreso dentro del periodo elegido (la gráfica y la tabla usan siempre esta selección)
export function rowsInPeriod(rows: ProgressRow[], period: Period, offset: number): ProgressRow[] {
  const { start, end } = periodWindow(period, offset);
  return rows.filter(r => r.session_date >= start && r.session_date <= end);
}

// Gráfica de línea suave con relleno: mejor 1RM por día dentro del periodo
export function ProgressChart({ rows, period, offset }: { rows: ProgressRow[]; period: Period; offset: number }) {
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
