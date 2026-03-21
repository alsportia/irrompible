import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';
import { generateBackupExcel } from '@/lib/programImporter';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const program = await DB.get('SELECT id, name, description, image_url FROM programs WHERE id = ?', [id]);
  if (!program) return NextResponse.json({ error: 'Programa no encontrado' }, { status: 404 });

  const sessions = await DB.query<{ id: number; session_code: string; name: string | null }>(
    'SELECT id, session_code, name FROM sessions WHERE program_id = ? ORDER BY id',
    [id]
  );

  const sessionsWithExercises = await Promise.all(
    sessions.map(async (s, i) => {
      const match = s.session_code?.match(/_s(\d+)(_\d+)?$/);
      const numero_sesion = match ? parseInt(match[1]) : i + 1;
      const exercises = await DB.query(
        `SELECT se.id, se.block, se.block_type, se.set_number, se.ex_id, se.ex_order, se.reps, se.tiempo_ej, e.name as ex_name
         FROM session_exercises se JOIN exercises e ON se.ex_id = e.id
         WHERE se.session_id = ? ORDER BY se.ex_order`,
        [s.id]
      );
      return { ...s, numero_sesion, exercises };
    })
  );

  return NextResponse.json({ ...program, sessions: sessionsWithExercises });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const existing = await DB.get<{ id: number }>('SELECT id FROM programs WHERE id = ?', [id]);
  if (!existing) return NextResponse.json({ error: 'Programa no encontrado' }, { status: 404 });

  try {
    const body = await req.json();
    const { name, description, image_url, sessions } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 });

    // Generate backup before modifying
    const backupBuffer = await generateBackupExcel(Number(id));
    const backupBase64 = backupBuffer.toString('base64');

    const slug = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    // Delete existing sessions/exercises
    const existingSessions = await DB.query<{ id: number }>('SELECT id FROM sessions WHERE program_id = ?', [id]);
    const sesIds = existingSessions.map(s => s.id);
    if (sesIds.length) {
      await DB.run(`DELETE FROM session_exercises WHERE session_id IN (${sesIds.map(() => '?').join(',')})`, sesIds);
    }
    await DB.run('DELETE FROM sessions WHERE program_id = ?', [id]);
    await DB.run('UPDATE programs SET name=?, description=?, image_url=? WHERE id=?', [name.trim(), description || null, image_url || null, id]);

    if (Array.isArray(sessions)) {
      for (const ses of sessions) {
        const num = ses.numero_sesion || 1;
        let sessionCode = `${slug}_s${num}`;
        const existingCode = await DB.get('SELECT id FROM sessions WHERE session_code = ?', [sessionCode]);
        if (existingCode) sessionCode = `${slug}_s${num}_${id}`;
        const sesResult = await DB.run('INSERT INTO sessions (session_code, name, program_id) VALUES (?,?,?)', [sessionCode, ses.nombre_sesion || null, Number(id)]);
        const sessionId = sesResult.id;
        if (Array.isArray(ses.exercises)) {
          for (const ex of ses.exercises) {
            await DB.run(
              'INSERT INTO session_exercises (session_id, block, block_type, set_number, ex_id, ex_order, reps, tiempo_ej) VALUES (?,?,?,?,?,?,?,?)',
              [sessionId, ex.bloque || null, ex.tipo_bloque || 'normal', ex.set_number || 1, ex.ex_id, ex.ex_order || 1, ex.reps || null, ex.tiempo_ej || null]
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true, backupBase64 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const existing = await DB.get('SELECT id FROM programs WHERE id = ?', [id]);
  if (!existing) return NextResponse.json({ error: 'Programa no encontrado' }, { status: 404 });

  const sessions = await DB.query<{ id: number }>('SELECT id FROM sessions WHERE program_id = ?', [id]);
  const sesIds = sessions.map(s => s.id);
  if (sesIds.length) {
    await DB.run(`DELETE FROM session_exercises WHERE session_id IN (${sesIds.map(() => '?').join(',')})`, sesIds);
  }
  await DB.run('DELETE FROM sessions WHERE program_id = ?', [id]);
  await DB.run('DELETE FROM programs WHERE id = ?', [id]);

  return NextResponse.json({ success: true });
}
