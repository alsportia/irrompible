import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { importProgramFromExcel, generateBackupExcel } from '@/lib/programImporter';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Archivo no proporcionado' }, { status: 400 });

    const overwrite = formData.get('overwrite') === 'true';
    const newName = formData.get('newName') as string | null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importProgramFromExcel(buffer, {
      overwrite,
      newName: newName || undefined,
    });

    if ('conflict' in result) {
      // Generate backup and return it as base64 along with conflict info
      const backupBuffer = await generateBackupExcel(result.existingId);
      return NextResponse.json({
        conflict: true,
        existingId: result.existingId,
        existingName: result.existingName,
        backupBase64: backupBuffer.toString('base64'),
      });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
