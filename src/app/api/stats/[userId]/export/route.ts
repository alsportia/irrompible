import { DB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const uid = parseInt(userId);
  if (!uid) return NextResponse.json({ error: "userId inválido" }, { status: 400 });

  const requesterId = req.headers.get('x-user-id');
  if (!requesterId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const requester = await DB.get<{ role: string }>(
    'SELECT role FROM users WHERE users_id = ?', [requesterId]
  );
  if (!requester) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (String(requesterId) !== String(uid) && requester.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const targetUser = await DB.get<{ name: string }>(
    'SELECT name FROM users WHERE users_id = ?', [uid]
  );

  // One row per workout set, with all workout-level data repeated
  const rows = await DB.query<{
    program_name: string;
    completed_at: string;
    session_name: string;
    session_code: string;
    set_number: number | null;
    exercise_name: string;
    duration: number | null;
    reps_done: number | null;
    weight: number | null;
    time_taken: number | null;
    energy_label: string | null;
    feeling_label: string | null;
  }>(`
    SELECT
      p.name            AS program_name,
      wl.completed_at,
      s.name            AS session_name,
      s.session_code,
      ws.set_number,
      e.name            AS exercise_name,
      wl.duration,
      ws.reps_done,
      ws.weight,
      ws.time_taken,
      el.label          AS energy_label,
      fl.label          AS feeling_label
    FROM workout_sets ws
    JOIN workout_logs wl  ON ws.workout_logs_id  = wl.workout_logs_id
    JOIN sessions s       ON wl.sessions_id      = s.sessions_id
    JOIN programs p       ON s.programs_id       = p.programs_id
    JOIN exercises e      ON ws.exercises_id     = e.exercises_id
    LEFT JOIN energy_levels el  ON wl.energy_levels_id  = el.energy_levels_id
    LEFT JOIN feeling_levels fl ON wl.feeling_levels_id = fl.feeling_levels_id
    WHERE wl.users_id = ? AND wl.completed_at IS NOT NULL
    ORDER BY wl.completed_at DESC, wl.workout_logs_id, ws.set_number, ws.workout_sets_id
  `, [uid]);

  const esc = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const fmtDuration = (secs: number | null) => {
    if (!secs) return '';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const headers = [
    'Programa', 'Fecha', 'Sesión', 'Set', 'Ejercicio',
    'Duración sesión', 'Repeticiones', 'Kilos', 'Tiempo ejercicio (s)',
    'Energía', 'Sensación',
  ];

  const lines: string[] = [headers.map(esc).join(',')];

  for (const r of rows) {
    lines.push([
      r.program_name,
      r.completed_at ? fmtDate(r.completed_at) : '',
      r.session_name || r.session_code,
      r.set_number,
      r.exercise_name,
      fmtDuration(r.duration),
      r.reps_done,
      r.weight,
      r.time_taken,
      r.energy_label,
      r.feeling_label,
    ].map(esc).join(','));
  }

  const csv = '\uFEFF' + lines.join('\r\n'); // BOM for Excel UTF-8
  const filename = `stats_${(targetUser?.name ?? uid).toString().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
