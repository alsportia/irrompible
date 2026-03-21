import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { exportProgramToExcel, generateTemplateExcel } from '@/lib/programExporter';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const template = searchParams.get('template');
  const id = searchParams.get('id');

  try {
    if (template === 'true') {
      const buffer = await generateTemplateExcel();
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="plantilla_programa.xlsx"',
        },
      });
    }

    if (id) {
      const buffer = await exportProgramToExcel(Number(id));
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="programa_${id}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Parámetro id o template requerido' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
