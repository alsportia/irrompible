import Link from "next/link";
import { DB } from "@/lib/db";
import { ChevronLeft, Play } from "lucide-react";
import VideoPrefetcher from "@/components/VideoPrefetcher";

export const dynamic = "force-dynamic";

interface SessionDetail {
  id: string;
  name: string;
  description: string;
}

interface ExerciseRow {
  block: string;
  block_type: string | null;
  set_number: number;
  ex_id: string;
  ex_order: number;
  tiempo_ej: string | null;
  reps: string | null;
  name: string;
  video_url: string | null;
}

interface BlockGroup {
  block: string;
  block_type: string | null;
  exercises: ExerciseRow[];
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [session] = await DB.query<SessionDetail>(
    "SELECT id, name, description FROM sessions WHERE id = ?",
    [id]
  );

  if (!session) {
    return <div className="p-6 text-center mt-20">Sesión no encontrada</div>;
  }

  // Fetch exercises for this session
  const exercisesRaw = await DB.query<ExerciseRow>(`
    SELECT se.block, se.block_type, se.set_number, se.ex_id, se.ex_order, se.tiempo_ej, se.reps, e.name, e.video_url
    FROM session_exercises se
    JOIN exercises e ON se.ex_id = e.ex_id
    WHERE se.session_id = ?
    ORDER BY se.block, se.ex_order, se.set_number
  `, [id]);

  // Group by block securely, ensuring we preserve the sequence.
  const blocksMap = new Map<string, BlockGroup>();
  for (const ex of exercisesRaw) {
    // If block is undefined/null, we assign it to a default "Main" block.
    const bName = ex.block || "Rutina Principal";
    if (!blocksMap.has(bName)) {
      blocksMap.set(bName, {
        block: bName,
        block_type: ex.block_type,
        exercises: []
      });
    }
    // Only push if it's the first set (for preview purposes, we just list the exercises to do)
    // Actually, maybe we want to show all exercises or just unique ones per block?
    // Let's just group unique exercises per block for the overview
    const blockGroup = blocksMap.get(bName)!;
    if (!blockGroup.exercises.find(e => e.ex_id === ex.ex_id)) {
      blockGroup.exercises.push(ex);
    }
  }

  const blocks = Array.from(blocksMap.values());

  // Extract all video URLs for prefetching
  const videoUrls = exercisesRaw.map(ex => ex.video_url);

  return (
    <>
      <main className="min-h-screen p-6 pb-32 max-w-md mx-auto animate-fade-in relative">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-accent-glow rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none" />

        <header className="pt-8 pb-6 flex items-center justify-between relative z-10 gap-4">
          <Link href="/" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-text-primary hover:text-accent-primary transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h1 className="heading-display text-2xl text-right flex-1">{session.name}</h1>
        </header>

        <section className="relative z-10 mb-8">
          <div className="card glass-panel border-accent-primary/20 bg-accent-primary/5">
            <h2 className="text-sm font-semibold text-accent-primary mb-2 uppercase tracking-wider">Objetivo de Hoy</h2>
            <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">
              {session.description || "Sin descripción proporcionada."}
            </p>
          </div>
        </section>

        <section className="relative z-10 flex flex-col gap-4">
          {blocks.map((b, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              {/* Block header */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: 'rgba(59,130,246,0.2)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                  {b.block}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                  {(b.block_type || 'Bloque').replace(/_/g, ' ')}
                </span>
              </div>

              {/* Table */}
              <div style={{ padding: '0 1rem' }}>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Ejercicio</span>
                  <span style={{ textAlign: 'center' }}>Reps</span>
                  <span style={{ textAlign: 'center' }}>Tiempo</span>
                </div>

                {/* Exercise rows */}
                {b.exercises.map((ex, j) => (
                  <div key={ex.ex_id + j} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '0.625rem 0', borderBottom: j < b.exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, paddingRight: '0.5rem' }}>{ex.name}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{ex.reps ?? '—'}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{ex.tiempo_ej ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Fixed button at bottom - always visible */}
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1.5rem',
          maxWidth: '28rem',
          margin: '0 auto',
          zIndex: 9999,
          background: 'linear-gradient(to top, #0a0a0c 60%, transparent)',
          paddingTop: '3rem'
        }}
      >
        <Link href={`/workflow/${session.id}`} className="btn-primary glow w-full flex items-center justify-center gap-2 py-4">
          <Play fill="currentColor" size={20} />
          <span>Iniciar Entrenamiento</span>
        </Link>
      </div>

      {/* Video Prefetcher */}
      <VideoPrefetcher videoUrls={videoUrls} />
    </>
  );
}
