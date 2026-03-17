"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, Check } from "lucide-react";

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

function applyEnergy(exercises: ExerciseRow[], pct: number): ExerciseRow[] {
  if (pct === 1) return exercises;

  const blockExMap = new Map<string, ExerciseRow[]>();
  exercises.forEach(e => {
    if (!blockExMap.has(e.block)) blockExMap.set(e.block, []);
    blockExMap.get(e.block)!.push(e);
  });

  const timedBlocks = new Set<string>();
  blockExMap.forEach((exs, block) => {
    if (exs.every(e => e.tiempo_ej && (!e.reps || e.reps === '0'))) timedBlocks.add(block);
  });

  const maxSetPerBlock = new Map<string, number>();
  exercises.forEach(e => {
    maxSetPerBlock.set(e.block, Math.max(maxSetPerBlock.get(e.block) ?? 0, e.set_number));
  });

  return exercises
    .map(ex => {
      if (timedBlocks.has(ex.block)) return ex;
      if (ex.reps && ex.reps !== '0') {
        const n = parseInt(ex.reps);
        if (!isNaN(n)) return { ...ex, reps: String(Math.max(1, Math.round(n * pct))) };
      }
      return ex;
    })
    .filter(ex => {
      if (!timedBlocks.has(ex.block)) return true;
      const maxSet = maxSetPerBlock.get(ex.block) ?? 1;
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
  const [step, setStep] = useState<'energy' | 'summary'>('energy');
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>(ENERGY_LEVELS[0]);

  const adjustedExercises = applyEnergy(exercisesRaw, selectedEnergy.pct);
  const blocks = buildBlocks(adjustedExercises);

  // ── Energy selection screen ───────────────────────────────────────────────
  if (step === 'energy') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }} className="animate-fade-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <button
            onClick={() => router.push('/')}
            style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', marginLeft: '-0.25rem' }}
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>{sessionName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>¿Cómo te encuentras hoy?</div>
          </div>
        </div>

        {/* Levels */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.25rem', gap: '0.875rem', overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '0.25rem' }}>
            Selecciona tu nivel de energía para adaptar el entrenamiento
          </p>

          {ENERGY_LEVELS.map(level => {
            const isSelected = selectedEnergy.label === level.label;
            return (
              <button
                key={level.label}
                onClick={() => setSelectedEnergy(level)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${isSelected ? level.color : 'var(--border-subtle)'}`,
                  background: isSelected ? `${level.color}18` : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left' as const,
                  width: '100%',
                }}
              >
                <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{level.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', color: isSelected ? level.color : 'var(--text-primary)' }}>
                    {level.label}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    {level.pct === 1 ? 'Entrenamiento completo' : `${Math.round(level.pct * 100)}% de repeticiones / sets`}
                  </div>
                </div>
                <div style={{
                  width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                  border: `2px solid ${isSelected ? level.color : 'var(--border-subtle)'}`,
                  background: isSelected ? level.color : 'transparent',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            className="btn-primary glow"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
            onClick={() => setStep('summary')}
          >
            <span>Ver resumen del entrenamiento</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  return (
    <>
      <main style={{ minHeight: '100dvh', padding: '0 1.25rem 8rem', maxWidth: '28rem', margin: '0 auto', position: 'relative' }} className="animate-fade-in">
        {/* Header */}
        <header style={{ paddingTop: '2rem', paddingBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 10 }}>
          <button
            onClick={() => setStep('energy')}
            style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="heading-display" style={{ fontSize: '1.5rem' }}>{sessionName}</h1>
            {/* Energy badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem', background: `${selectedEnergy.color}18`, border: `1px solid ${selectedEnergy.color}40`, borderRadius: '999px', padding: '0.15rem 0.6rem' }}>
              <span style={{ fontSize: '0.9rem' }}>{selectedEnergy.emoji}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: selectedEnergy.color }}>{selectedEnergy.label}</span>
              {selectedEnergy.pct < 1 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>· {Math.round(selectedEnergy.pct * 100)}%</span>
              )}
            </div>
          </div>
        </header>

        {/* Description */}
        <section style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 10 }}>
          <div className="card glass-panel" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objetivo de Hoy</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {sessionDescription || "Sin descripción proporcionada."}
            </p>
          </div>
        </section>

        {/* Blocks */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 10 }}>
          {blocks.map((b, i) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '1.75rem', height: '1.75rem', borderRadius: '6px', background: 'rgba(59,130,246,0.2)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                  {b.block}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize', flex: 1 }}>
                  {(b.block_type || 'Bloque').replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  {b.totalSets} {b.totalSets === 1 ? 'set' : 'sets'}
                </span>
              </div>
              <div style={{ padding: '0 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Ejercicio</span>
                  <span style={{ textAlign: 'center' }}>Reps</span>
                  <span style={{ textAlign: 'center' }}>Tiempo</span>
                </div>
                {b.exercises.map((ex, j) => (
                  <div key={ex.ex_id + j} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px', padding: '0.625rem 0', borderBottom: j < b.exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, paddingRight: '0.5rem' }}>{ex.name}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{ex.reps && ex.reps !== '0' ? ex.reps : '—'}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{ex.tiempo_ej ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Fixed start button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1.5rem', maxWidth: '28rem', margin: '0 auto', zIndex: 9999, background: 'linear-gradient(to top, #0a0a0c 60%, transparent)', paddingTop: '3rem' }}>
        <Link
          href={`/workflow/${sessionId}?energy=${selectedEnergy.pct}`}
          className="btn-primary glow"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
        >
          <Play fill="currentColor" size={20} />
          <span>Iniciar Entrenamiento</span>
        </Link>
      </div>
    </>
  );
}
