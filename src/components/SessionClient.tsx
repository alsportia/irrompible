"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, Check, X } from "lucide-react";
import { useUser } from "@/lib/userContext";

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
  description: string | null;
  muscles: string | null;
  joints: string | null;
  easier_id: string | null;
  easier_name: string | null;
  harder_id: string | null;
  harder_name: string | null;
}

interface BlockGroup {
  block: string;
  block_type: string | null;
  totalSets: number;
  exercises: ExerciseRow[];
}

interface SessionClientProps {
  sessionId: string;
  sessionName: string;
  sessionDescription: string;
  exercisesRaw: ExerciseRow[];
}

// ─── Energy Levels ────────────────────────────────────────────────────────────

const ENERGY_LEVELS = [
  { label: '¡A tope!',    emoji: '🔥', pct: 1.00, color: '#10b981' },
  { label: 'Bien',        emoji: '💪', pct: 0.75, color: '#3b82f6' },
  { label: 'Cansado',     emoji: '😓', pct: 0.50, color: '#f59e0b' },
  { label: 'Muy Cansado', emoji: '😴', pct: 0.25, color: '#ef4444' },
] as const;

type EnergyLevel = typeof ENERGY_LEVELS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYtId(url: string | null): string | null {
  if (!url) return null;
  const shorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shorts) return shorts[1];
  const watch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (watch) return watch[1];
  return null;
}

function getYtThumbnail(url: string | null): string | null {
  const id = getYtId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

function getYtEmbed(url: string | null): string | null {
  const id = getYtId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&rel=0` : null;
}

function applyEnergy(exercises: ExerciseRow[], pct: number): ExerciseRow[] {
  if (pct === 1) return exercises;

  // Max sets per block
  const maxSetPerBlock = new Map<string, number>();
  exercises.forEach(e => {
    maxSetPerBlock.set(e.block, Math.max(maxSetPerBlock.get(e.block) ?? 0, e.set_number));
  });

  return exercises
    .map(ex => {
      // Scale reps if the exercise has them (and they're meaningful)
      if (ex.reps && ex.reps !== '0') {
        const n = parseInt(ex.reps);
        if (!isNaN(n) && n > 1) return { ...ex, reps: String(Math.max(1, Math.round(n * pct))) };
      }
      return ex;
    })
    .filter(ex => {
      // For blocks with multiple sets, reduce the number of sets
      const maxSet = maxSetPerBlock.get(ex.block) ?? 1;
      if (maxSet <= 1) return true;
      return ex.set_number <= Math.max(1, Math.round(maxSet * pct));
    });
}

function buildBlocks(exercises: ExerciseRow[]): BlockGroup[] {
  const blocksMap = new Map<string, BlockGroup>();
  for (const ex of exercises) {
    const bName = ex.block || "Rutina Principal";
    if (!blocksMap.has(bName)) {
      blocksMap.set(bName, { block: bName, block_type: ex.block_type, totalSets: 0, exercises: [] });
    }
    const bg = blocksMap.get(bName)!;
    if (ex.set_number > bg.totalSets) bg.totalSets = ex.set_number;
    if (!bg.exercises.find(e => e.ex_id === ex.ex_id)) bg.exercises.push(ex);
  }
  return Array.from(blocksMap.values());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SessionClient({ sessionId, sessionName, sessionDescription, exercisesRaw }: SessionClientProps) {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState<'energy' | 'summary'>('energy');
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>(ENERGY_LEVELS[0]);
  const [previewEx, setPreviewEx] = useState<ExerciseRow | null>(null);

  const adjustedExercises = applyEnergy(exercisesRaw, selectedEnergy.pct);
  const blocks = buildBlocks(adjustedExercises);

  // ── Energy selection screen ───────────────────────────────────────────────
  if (step === 'energy') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <button onClick={() => router.push('/')} style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', marginLeft: '-0.25rem' }}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>{sessionName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>¿Cómo te encuentras hoy?</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.25rem', gap: '0.875rem', overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '0.25rem' }}>
            Selecciona tu nivel de energía para adaptar el entrenamiento
          </p>
          {ENERGY_LEVELS.map(level => {
            const isSelected = selectedEnergy.label === level.label;
            return (
              <button key={level.label} onClick={() => setSelectedEnergy(level)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: `2px solid ${isSelected ? level.color : 'var(--border-subtle)'}`, background: isSelected ? `${level.color}18` : 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left' as const, width: '100%' }}>
                <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{level.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', color: isSelected ? level.color : 'var(--text-primary)' }}>{level.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    {level.pct === 1 ? 'Entrenamiento completo' : `${Math.round(level.pct * 100)}% de repeticiones / sets`}
                  </div>
                </div>
                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', border: `2px solid ${isSelected ? level.color : 'var(--border-subtle)'}`, background: isSelected ? level.color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button className="btn-primary glow" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }} onClick={() => setStep('summary')}>
            <span>Ver resumen del entrenamiento</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  return (
    <>
      <main style={{ minHeight: '100dvh', padding: '0 0 8rem', maxWidth: '28rem', margin: '0 auto', position: 'relative' }} className="animate-fade-in">
        {/* Header */}
        <header style={{ padding: '1.25rem 1.25rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
          <button onClick={() => setStep('energy')} style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="heading-display" style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sessionName}</h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem', background: `${selectedEnergy.color}18`, border: `1px solid ${selectedEnergy.color}40`, borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
              <span style={{ fontSize: '0.8rem' }}>{selectedEnergy.emoji}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: selectedEnergy.color }}>{selectedEnergy.label}</span>
              {selectedEnergy.pct < 1 && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>· {Math.round(selectedEnergy.pct * 100)}%</span>}
            </div>
          </div>
        </header>

        <div style={{ padding: '1rem 1.25rem 0' }}>
          {/* Description */}
          <section style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Instrucciones</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {sessionDescription || "Sin descripción proporcionada."}
            </p>
          </section>

          {/* Blocks */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {blocks.map((b, i) => {
              const blockLabel = (b.block_type || 'Bloque').replace(/_/g, ' ');
              return (
                <div key={i}>
                  {/* Block divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                    <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-primary)' }}>{blockLabel}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>×{b.totalSets}</span>
                    <div style={{ height: '1px', flex: 1, background: 'var(--border-subtle)' }} />
                  </div>

                  {/* Exercise rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {b.exercises.map((ex, j) => {
                      const thumb = getYtThumbnail(ex.video_url);
                      const embedUrl = getYtEmbed(ex.video_url);
                      const hasReps = ex.reps && ex.reps !== '0';
                      const hasTiempo = ex.tiempo_ej && ex.tiempo_ej !== '0';
                      return (
                        <div key={ex.ex_id + j} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                          {/* Thumbnail — clickable if video exists */}
                          <button
                            onClick={() => setPreviewEx(ex)}
                            style={{ width: '3.25rem', height: '3.25rem', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', cursor: 'pointer', position: 'relative' }}
                          >
                            {thumb
                              ? <img src={thumb} alt={ex.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: '1.25rem' }}>💪</span>
                            }
                            {/* Play overlay */}
                            {embedUrl && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Play size={8} fill="#000" color="#000" style={{ marginLeft: '1px' }} />
                                </div>
                              </div>
                            )}
                          </button>
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {hasReps && <span>{ex.reps} reps</span>}
                              {hasReps && hasTiempo && <span style={{ margin: '0 0.3rem', opacity: 0.4 }}>·</span>}
                              {hasTiempo && <span>{ex.tiempo_ej}s</span>}
                              {!hasReps && !hasTiempo && <span>—</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>

      {/* Fixed start button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1.5rem', maxWidth: '28rem', margin: '0 auto', zIndex: 9999, background: 'linear-gradient(to top, #0a0a0c 70%, transparent)', paddingTop: '3rem' }}>
        <Link href={`/workflow/${sessionId}?energy=${selectedEnergy.pct}&userId=${user?.id ?? ''}&energyLabel=${encodeURIComponent(selectedEnergy.label)}`} className="btn-primary glow" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
          <Play fill="currentColor" size={20} />
          <span>Iniciar Entrenamiento</span>
        </Link>
      </div>

      {/* Video preview modal */}
      {previewEx && (
        <div
          onClick={() => setPreviewEx(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '28rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1rem' }}>{previewEx.name}</span>
              <button onClick={() => setPreviewEx(null)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Video — aspect ratio 9:16 for Shorts */}
              {getYtEmbed(previewEx.video_url) && (
                <div style={{ position: 'relative', width: '100%', paddingBottom: '177.78%' }}>
                  <iframe
                    src={getYtEmbed(previewEx.video_url)!}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Extra info */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                {/* Description */}
                {previewEx.description && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>Descripción</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {previewEx.description.replace(/\*\*/g, '')}
                    </p>
                  </div>
                )}

                {/* Muscles & Joints */}
                {(previewEx.muscles || previewEx.joints) && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {previewEx.muscles && (() => {
                      try {
                        const list: string[] = JSON.parse(previewEx.muscles);
                        return (
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>Músculos</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {list.map((m, i) => (
                                <span key={i} style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '0.15rem 0.5rem', color: 'var(--text-secondary)' }}>{m}</span>
                              ))}
                            </div>
                          </div>
                        );
                      } catch { return null; }
                    })()}
                    {previewEx.joints && (() => {
                      try {
                        const list: string[] = JSON.parse(previewEx.joints);
                        return (
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>Articulaciones</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {list.map((j, i) => (
                                <span key={i} style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '0.15rem 0.5rem', color: 'var(--text-secondary)' }}>{j}</span>
                              ))}
                            </div>
                          </div>
                        );
                      } catch { return null; }
                    })()}
                  </div>
                )}

                {/* Easier / Harder */}
                {(previewEx.easier_id || previewEx.harder_id) && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>Progresión</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {previewEx.easier_id && previewEx.easier_name && (
                        <div style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.625rem' }}>
                          <p style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>↓ Más fácil</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{previewEx.easier_name}</p>
                        </div>
                      )}
                      {previewEx.harder_id && previewEx.harder_name && (
                        <div style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.625rem' }}>
                          <p style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>↑ Más difícil</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{previewEx.harder_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
