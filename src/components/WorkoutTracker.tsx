"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Timer as TimerIcon, Play, Pause, ChevronLeft } from "lucide-react";
import { finishWorkoutLog, saveWorkoutSet } from "@/app/actions";
import CachedVideo from "./CachedVideo";
import { useBeep } from "@/lib/useBeep";

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

interface WorkoutTrackerProps {
  sessionId: string;
  logId: number;
  exercises: ExerciseRow[];
}

// ─── Energy Levels ───────────────────────────────────────────────────────────

const ENERGY_LEVELS = [
  { label: '¡A tope!',    emoji: '🔥', pct: 1.00, color: '#10b981' },
  { label: 'Bien',        emoji: '💪', pct: 0.75, color: '#3b82f6' },
  { label: 'Cansado',     emoji: '😓', pct: 0.50, color: '#f59e0b' },
  { label: 'Muy Cansado', emoji: '😴', pct: 0.25, color: '#ef4444' },
] as const;

type EnergyLevel = typeof ENERGY_LEVELS[number];

function applyEnergy(exercises: ExerciseRow[], pct: number): ExerciseRow[] {
  if (pct === 1) return exercises;

  // Classify blocks: "timed" = all exercises have tiempo_ej and reps is 0/null
  const blockExMap = new Map<string, ExerciseRow[]>();
  exercises.forEach(e => {
    if (!blockExMap.has(e.block)) blockExMap.set(e.block, []);
    blockExMap.get(e.block)!.push(e);
  });

  const timedBlocks = new Set<string>();
  blockExMap.forEach((exs, block) => {
    if (exs.every(e => e.tiempo_ej && (!e.reps || e.reps === '0'))) {
      timedBlocks.add(block);
    }
  });

  // For timed blocks: reduce number of sets
  // For rep blocks: scale reps
  const maxSetPerBlock = new Map<string, number>();
  exercises.forEach(e => {
    maxSetPerBlock.set(e.block, Math.max(maxSetPerBlock.get(e.block) ?? 0, e.set_number));
  });

  return exercises
    .map(ex => {
      if (timedBlocks.has(ex.block)) return ex; // sets filtered below
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTimeToSeconds(timeStr: string | null): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  if (clean.includes("'") && !clean.includes("''")) {
    const val = parseInt(clean.replace("'", ""));
    return isNaN(val) ? 0 : val * 60;
  } else if (clean.includes("''")) {
    const val = parseInt(clean.replace("''", ""));
    return isNaN(val) ? 0 : val;
  }
  const val = parseInt(clean);
  return isNaN(val) ? 0 : val;
}

const S = {
  screen:     { height: '100dvh', display: 'flex', flexDirection: 'column' as const, background: 'var(--bg-primary)', fontFamily: 'var(--font-geist-sans)', overflow: 'hidden' },
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 },
  headerBtn:  { padding: '0.5rem', marginLeft: '-0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' },
  headerCount:{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)' },
  scrollArea: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  videoBox:   { flex: 1, background: '#000', overflow: 'hidden', minHeight: 0 },
  infoArea:   { padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', flexShrink: 0 },
  badge:      { display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  blockBadge: { background: 'rgba(59,130,246,0.2)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' },
  setBadge:   { fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 },
  exName:     { fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
  statCard:   { flex: 1, background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.625rem', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' },
  statLabel:  { fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' },
  statValue:  { fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.5rem' },
  pauseBtn:   { marginTop: '0.5rem', padding: '0.4rem 1.25rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 500 },
  bottomBar:  { padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' },
  btnRow:     { display: 'flex', gap: '0.75rem' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkoutTracker({ sessionId, logId, exercises }: WorkoutTrackerProps) {
  const router = useRouter();

  // Default: ¡A tope! (100%) — user can change before starting
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>(ENERGY_LEVELS[0]);
  const [started, setStarted] = useState(false);
  const [activeExercises, setActiveExercises] = useState<ExerciseRow[]>(exercises);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(true);

  const { playCountdownBeep, playWarningBeep, playFinalBeep } = useBeep();
  const startTime = useRef<number>(Date.now());
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLockRef.current?.release().then(() => { wakeLockRef.current = null; });
    };
  }, []);

  const currentEx = activeExercises[currentIndex];
  const isFinished = currentIndex >= activeExercises.length;
  const targetTime = currentEx ? parseTimeToSeconds(currentEx.tiempo_ej) : 0;
  const hasTimer = targetTime > 0;

  useEffect(() => {
    if (isFinished) return;
    setTimeElapsed(0);
    setTimeLeft(targetTime);
    setIsActive(false);
    setCountdown(5);
    setIsCountingDown(true);
  }, [currentIndex, isFinished, targetTime]);

  useEffect(() => {
    if (!isCountingDown || isFinished || !started) return;
    if (countdown > 0) {
      playCountdownBeep();
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      playFinalBeep();
      setIsCountingDown(false);
      setIsActive(true);
    }
  }, [countdown, isCountingDown, isFinished, started]);

  const currentExRef = useRef(currentEx);
  const timeElapsedRef = useRef(timeElapsed);
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentExRef.current = currentEx;
    timeElapsedRef.current = timeElapsed;
    currentIndexRef.current = currentIndex;
  }, [currentEx, timeElapsed, currentIndex]);

  useEffect(() => {
    if (!isActive || isFinished || isCountingDown) return;
    const interval = setInterval(() => {
      if (hasTimer) {
        setTimeLeft(prev => {
          if (prev <= 5 && prev > 1) playWarningBeep();
          if (prev <= 1) { playFinalBeep(); handleNext(); return 0; }
          return prev - 1;
        });
      } else {
        setTimeElapsed(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isFinished, isCountingDown, hasTimer, currentEx]);

  const handleNext = async () => {
    const ex = currentExRef.current;
    if (!ex) return;
    setIsActive(false);
    const timeToSave = hasTimer ? targetTime : timeElapsedRef.current;
    await saveWorkoutSet(logId, ex.ex_id, null, null, timeToSave);
    if (currentIndexRef.current + 1 >= activeExercises.length) {
      const totalDuration = Math.floor((Date.now() - startTime.current) / 1000);
      await finishWorkoutLog(logId, totalDuration);
      setCurrentIndex(currentIndexRef.current + 1);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsActive(false);
      setIsCountingDown(true);
      setCountdown(5);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const uniqueVideoUrls = Array.from(
    new Map(activeExercises.filter(e => e.video_url).map(e => [e.video_url, { url: e.video_url, name: e.name }])).values()
  );
  const totalBlocks = new Set(activeExercises.map(e => e.block)).size;

  // ── Energy selection screen ──────────────────────────────────────────────
  if (!started) {
    return (
      <div style={S.screen} className="animate-fade-in">
        <div style={S.header}>
          <button style={S.headerBtn} onClick={() => router.push(`/session/${sessionId}`)}>
            <X size={24} />
          </button>
          <span style={{ ...S.headerCount, textTransform: 'none', fontSize: '1rem' }}>¿Cómo te encuentras hoy?</span>
          <div style={{ width: '2.5rem' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem', gap: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '0.5rem' }}>
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
                }}
              >
                <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{level.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', color: isSelected ? level.color : 'var(--text-primary)' }}>
                    {level.label}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    {level.pct === 1
                      ? 'Entrenamiento completo'
                      : `${Math.round(level.pct * 100)}% de repeticiones / sets`}
                  </div>
                </div>
                <div style={{
                  width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                  border: `2px solid ${isSelected ? level.color : 'var(--border-subtle)'}`,
                  background: isSelected ? level.color : 'transparent',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div style={S.bottomBar}>
          <button
            className="btn-primary glow"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
            onClick={() => {
              setActiveExercises(applyEnergy(exercises, selectedEnergy.pct));
              startTime.current = Date.now();
              setStarted(true);
            }}
          >
            <Play fill="currentColor" size={20} />
            <span>Empezar Entrenamiento</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Countdown screen ─────────────────────────────────────────────────────
  if (isCountingDown && !isFinished) {
    const cdCircumference = 2 * Math.PI * 120;
    const maxSetInBlock = Math.max(...activeExercises.filter(e => e.block === currentEx.block).map(e => e.set_number));
    return (
      <div style={S.screen} className="animate-fade-in">
        <div style={S.header}>
          <button style={S.headerBtn} onClick={() => router.push(`/session/${sessionId}`)}>
            <X size={24} />
          </button>
          <span style={S.headerCount}>{currentIndex + 1} / {activeExercises.length}</span>
          <div style={{ width: '2.5rem' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={S.badge}>
              <span style={S.blockBadge}>Bloque {currentEx.block} de {totalBlocks}</span>
              <span style={S.setBadge}>Set {currentEx.set_number} de {maxSetInBlock}</span>
            </div>
            <h2 style={S.exName}>{currentEx.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Prepárate...</p>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="256" height="256" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="128" cy="128" r="120" strokeWidth="8" stroke="var(--border-subtle)" fill="transparent" />
              <circle cx="128" cy="128" r="120" strokeWidth="8" stroke="var(--accent-primary)" fill="transparent"
                strokeDasharray={cdCircumference}
                strokeDashoffset={cdCircumference * (countdown / 5)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <span style={{ position: 'absolute', fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '5rem', color: 'var(--accent-primary)', letterSpacing: '-0.04em' }}>
              {countdown}
            </span>
          </div>

          <button style={S.pauseBtn} onClick={() => { setIsCountingDown(false); setIsActive(true); }}>
            Saltar cuenta atrás
          </button>
        </div>
      </div>
    );
  }

  // ── Finished screen ──────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <div style={{ ...S.screen, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }} className="animate-fade-in">
        <div style={{ width: '6rem', height: '6rem', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Check size={48} color="var(--success)" />
        </div>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '2.25rem', letterSpacing: '-0.02em', marginBottom: '1rem' }}>¡Entrenamiento Completado!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>¡Buen trabajo! Tu sesión ha sido registrada correctamente.</p>
        <button onClick={() => router.push('/')} className="btn-primary glow">Volver al Inicio</button>
      </div>
    );
  }

  // ── Workout screen ───────────────────────────────────────────────────────
  const maxSetInBlock = Math.max(...activeExercises.filter(e => e.block === currentEx.block).map(e => e.set_number));

  return (
    <div style={S.screen} className="animate-fade-in">
      <div style={S.header}>
        <button style={S.headerBtn} onClick={() => router.push(`/session/${sessionId}`)}>
          <X size={24} />
        </button>
        <span style={S.headerCount}>{currentIndex + 1} / {activeExercises.length}</span>
        <div style={{ width: '2.5rem' }} />
      </div>

      <div style={S.scrollArea}>
        {/* Videos pre-renderizados */}
        <div style={S.videoBox}>
          {uniqueVideoUrls.map(({ url, name }) => (
            <div key={url ?? name} style={{ width: '100%', height: '100%', display: currentEx?.video_url === url ? 'block' : 'none' }}>
              <CachedVideo videoUrl={url} exerciseName={name} />
            </div>
          ))}
          {!currentEx?.video_url && (
            <div style={{ width: '100%', height: '100%' }}>
              <CachedVideo videoUrl={null} exerciseName={currentEx?.name} />
            </div>
          )}
        </div>

        <div style={S.infoArea}>
          <div>
            <div style={S.badge}>
              <span style={S.blockBadge}>Bloque {currentEx.block} de {totalBlocks}</span>
              <span style={S.setBadge}>Set {currentEx.set_number} de {maxSetInBlock}</span>
            </div>
            <h2 style={S.exName}>{currentEx.name}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.75rem' }}>
            {currentEx.reps && currentEx.reps !== '0' && (
              <div style={{ ...S.statCard, flex: 1 }}>
                <span style={S.statLabel}>Reps</span>
                <span style={S.statValue}>{currentEx.reps}</span>
              </div>
            )}
            {currentEx.tiempo_ej && (
              <div style={{ ...S.statCard, flex: 1, borderColor: 'rgba(245,158,11,0.3)' }}>
                <span style={S.statLabel}>Objetivo</span>
                <span style={{ ...S.statValue, fontSize: '1.5rem' }}>{currentEx.tiempo_ej}</span>
              </div>
            )}
            {/* Timer */}
            <div style={{ ...S.statCard, flex: 2, position: 'relative', overflow: 'hidden' }}>
              {hasTimer && (
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${(timeLeft / targetTime) * 100}%`,
                  height: '100%',
                  background: 'rgba(59,130,246,0.35)',
                  transition: 'width 1s linear',
                  borderRadius: 'var(--radius-md)',
                }} />
              )}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <TimerIcon size={14} color={hasTimer ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.04em' }}>
                  {formatTime(hasTimer ? timeLeft : timeElapsed)}
                </span>
              </div>
            </div>
            {/* Pausa */}
            <button style={{ ...S.statCard, flex: 1, cursor: 'pointer', gap: '0.4rem' }} onClick={() => setIsActive(!isActive)}>
              {isActive ? <Pause size={18} /> : <Play size={18} />}
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{isActive ? 'Pausar' : 'Reanudar'}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={S.bottomBar}>
        <div style={S.btnRow}>
          {currentIndex > 0 && (
            <button onClick={handlePrevious} className="btn-primary glow" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.25rem' }}>
              <ChevronLeft size={22} />
              <span>Anterior</span>
            </button>
          )}
          <button onClick={handleNext} className="btn-primary glow" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
            <Check size={22} />
            <span>Completar y Siguiente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
