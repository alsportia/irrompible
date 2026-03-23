import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { DB } from '@/lib/db';
import { generateBackupExcel } from '@/lib/programImporter';

const VALID_BLOCK_TYPES = ['normal', 'circuit', 'superset', 'super_series', 'tabata', 'interval_repetitions_with_pause', 'interval_repetitions', 'to_the_one', 'spartan_race', 'paleo_run'];

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

  const sessionsWithBlocks = await Promise.all(
    sessions.map(async (s, i) => {
      const match = s.session_code?.match(/_s(\d+)(_\d+)?$/);
      const numero_sesion = match ? parseInt(match[1]) : i + 1;

      const blocks = await DB.query<{
        set_id: number; block_label: string | null; block_type: string | null;
        num_sets: number; description: string | null; block_order: number;
      }>(
        'SELECT set_id, block_label, block_type, num_sets, description, block_order FROM sets WHERE session_id = ? ORDER BY block_order',
        [s.id]
      );

      const blocksWithExercises = await Promise.all(
        blocks.map(async (b) => {
          const exercises = await DB.query<{
            set_exercise_id: number; ex_id: number; ex_name: string; ex_order: number; reps: string | null; tiempo_ej: string | null;
          }>(
            `SELECT se.set_exercise_id, se.ex_id, e.name as ex_name, se.ex_order, se.reps, se.tiempo_ej
             FROM set_exercises se JOIN exercises e ON se.ex_id = e.id
             WHERE se.set_id = ? ORDER BY se.ex_order`,
            [b.set_id]
          );
          return { ...b, exercises };
        })
      );

      return { ...s, numero_sesion, blocks: blocksWithExercises };
    })
  );

  return NextResponse.json({ ...program, sessions: sessionsWithBlocks });
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

    // Validate blocks
    if (Array.isArray(sessions)) {
      for (const ses of sessions) {
        for (const block of (ses.blocks ?? [])) {
          if (!Number.isInteger(block.num_sets) || block.num_sets < 1) {
            return NextResponse.json({ error: 'num_sets debe ser un entero >= 1' }, { status: 400 });
          }
          if (block.block_type && !VALID_BLOCK_TYPES.includes(block.block_type)) {
            return NextResponse.json({ error: `block_type inválido. Valores aceptados: ${VALID_BLOCK_TYPES.join(', ')}` }, { status: 400 });
          }
        }
      }
    }

    // Generate backup before modifying
    const backupBuffer = await generateBackupExcel(Number(id));
    const backupBase64 = backupBuffer.toString('base64');

    const slug = name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    // Delete existing sessions (cascade deletes sets → set_exercises)
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

        if (Array.isArray(ses.blocks)) {
          for (const block of ses.blocks) {
            const setResult = await DB.run(
              'INSERT INTO sets (session_id, description, block_label, block_type, num_sets, block_order) VALUES (?,?,?,?,?,?)',
              [sessionId, block.description || null, block.block_label || null, block.block_type || 'normal', block.num_sets || 1, block.block_order || 1]
            );
            const setId = setResult.id;
            if (Array.isArray(block.exercises)) {
              for (const ex of block.exercises) {
                await DB.run(
                  'INSERT INTO set_exercises (set_id, ex_id, ex_order, reps, tiempo_ej) VALUES (?,?,?,?,?)',
                  [setId, ex.ex_id, ex.ex_order || 1, ex.reps || null, ex.tiempo_ej || null]
                );
              }
            }
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

  // Cascade deletes sessions → sets → set_exercises
  await DB.run('DELETE FROM sessions WHERE program_id = ?', [id]);
  await DB.run('DELETE FROM programs WHERE id = ?', [id]);

  return NextResponse.json({ success: true });
}
