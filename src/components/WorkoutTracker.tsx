"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Timer as TimerIcon, Play, Pause, ChevronLeft, StopCircle } from "lucide-react";
import { finishWorkoutLog, saveWorkoutSet } from "@/app/actions";
import CachedVideo from "./CachedVideo";
import { useBeep } from "@/lib/useBeep";

interface ExerciseRow {
  block: string;
  block_type: string | null;
  set_number: number;
  ex_id: number;
  ex_order: number;
  tiempo_ej: string | null;
  reps: string | null;
  name: string;
  video_url: string | null;
  video_url_yt: string | null;
}

interface WorkoutTrackerProps {
  sessionId: string;
  logId: number;
  exercises: ExerciseRow[];
  initialIndex?: number;
}

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
  screen:      { height: '100dvh', display: 'flex', flexDirection: 'column' as const, background: 'var(--bg-primary)', fontFamily: 'var(--font-geist-sans)', overflow: 'hidden' },
  header:      { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 },
  headerBtn:   { padding: '0.5rem', marginLeft: '-0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' },
  headerCount: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)' },
  scrollArea:  { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  videoBox:    { flex: 1, background: '#000', overflow: 'hidden', minHeight: 0 },
  infoArea:    { padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', flexShrink: 0 },
  badge:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  blockBadge:  { background: 'rgba(59,130,246,0.2)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' },
  setBadge:    { fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 },
  exName:      { fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
  statCard:    { flex: 1, background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.625rem', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' },
  statLabel:   { fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' },
  statValue:   { fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.5rem' },
  pauseBtn:    { marginTop: '0.5rem', padding: '0.4rem 1.25rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 500 },
  bottomBar:   { padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' },
  btnRow:      { display: 'flex', gap: '0.75rem' },
};

// ─── Feeling levels ───────────────────────────────────────────────────────────

const FEELINGS = [
  { label: 'Excelente', emoji: '🌟', score: 100, color: '#10b981' },
  { label: 'Bien',      emoji: '😊', score: 80,  color: '#3b82f6' },
  { label: 'Normal',    emoji: '😐', score: 60,  color: '#f59e0b' },
  { label: 'Duro',      emoji: '😓', score: 40,  color: '#f97316' },
  { label: 'Muy Duro',  emoji: '🥵', score: 20,  color: '#ef4444' },
] as const;

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  // Cap at 30 dots max to avoid overflow; use a thin bar instead if too many
  if (total > 20) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((current) / total) * 100}%`, background: 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{current} / {total}</span>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: i < current ? 'var(--accent-primary)' : 'rgba(255,255,255,0.45)',
            transition: 'background 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkoutTracker({ sessionId, logId, exercises, initialIndex = 0 }: WorkoutTrackerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [feelingStep, setFeelingStep] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState<typeof FEELINGS[number] | null>(null);
  const [saving, setSaving] = useState(false);

  const { playCountdownBeep, playWarningBeep, playFinalBeep } = useBeep();
  const startTime = useRef<number>(Date.now());

  const currentEx = exercises[currentIndex];
  const isFinished = currentIndex >= exercises.length;
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
    if (!isCountingDown || isFinished) return;
    if (countdown > 0) {
      playCountdownBeep();
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // countdown === 0: play beep, wait for circle animation to complete, then start
      playFinalBeep();
      const timer = setTimeout(() => {
        setIsCountingDown(false);
        setIsActive(true);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [countdown, isCountingDown, isFinished]);

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
    if (currentIndexRef.current + 1 >= exercises.length) {
      const totalDuration = Math.floor((Date.now() - startTime.current) / 1000);
      await finishWorkoutLog(logId, totalDuration, 0, '');
      localStorage.removeItem(`workout_progress_${sessionId}`);
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

  const handleAbandon = () => {
    setIsActive(false);
    localStorage.setItem(`workout_progress_${sessionId}`, JSON.stringify({
      logId,
      currentIndex: currentIndexRef.current,
      savedAt: Date.now(),
    }));
    router.replace(`/session/${sessionId}`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const uniqueVideoUrls = Array.from(
    new Map(exercises.filter(e => e.video_url || e.video_url_yt).map(e => [e.video_url ?? e.video_url_yt, { url: e.video_url, urlYt: e.video_url_yt, name: e.name }])).values()
  );
  const totalBlocks = new Set(exercises.map(e => e.block)).size;

  // ── Countdown ────────────────────────────────────────────────────────────
  if (isCountingDown && !isFinished) {
    const cdCircumference = 2 * Math.PI * 120;
    const maxSetInBlock = Math.max(...exercises.filter(e => e.block === currentEx.block).map(e => e.set_number));
    return (
      <div style={S.screen} className="animate-fade-in">
        <div style={S.header}>
          <button style={S.headerBtn} onClick={handleAbandon}>
            <X size={24} />
          </button>
          <ProgressDots total={exercises.length} current={currentIndex} />
          <div style={{ width: '2rem' }} />
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

  // ── Finished — feeling selection ─────────────────────────────────────────
  if (isFinished) {
    if (!feelingStep) {
      // Auto-show feeling step
      setTimeout(() => setFeelingStep(true), 0);
      return null;
    }

    const handleSaveFeeling = async () => {
      if (!selectedFeeling) return;
      setSaving(true);
      const totalDuration = Math.floor((Date.now() - startTime.current) / 1000);
      await finishWorkoutLog(logId, totalDuration, selectedFeeling.score, selectedFeeling.label);
      localStorage.removeItem(`workout_progress_${sessionId}`);
      router.replace('/');
    };

    return (
      <div style={{ ...S.screen, padding: '1.25rem' }} className="animate-fade-in">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Check size={40} color="var(--success)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>¡Entrenamiento Completado!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>¿Cómo ha ido el entrenamiento?</p>
          </div>

          {FEELINGS.map(f => {
            const isSelected = selectedFeeling?.label === f.label;
            return (
              <button key={f.label} onClick={() => setSelectedFeeling(f)}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', border: `2px solid ${isSelected ? f.color : 'var(--border-subtle)'}`, background: isSelected ? `${f.color}18` : 'var(--bg-secondary)', cursor: 'pointer', width: '100%', textAlign: 'left' as const, transition: 'all 0.15s ease' }}>
                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{f.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1rem', color: isSelected ? f.color : 'var(--text-primary)' }}>{f.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{f.score} puntos</div>
                </div>
                <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', border: `2px solid ${isSelected ? f.color : 'var(--border-subtle)'}`, background: isSelected ? f.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={handleSaveFeeling} disabled={!selectedFeeling || saving} className="btn-primary glow"
          style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectedFeeling ? 1 : 0.5 }}>
          {saving ? 'Guardando...' : 'Guardar y Volver'}
        </button>
      </div>
    );
  }

  // ── Workout ──────────────────────────────────────────────────────────────
  const maxSetInBlock = Math.max(...exercises.filter(e => e.block === currentEx.block).map(e => e.set_number));

  return (
    <div style={S.screen} className="animate-fade-in">
      <div style={S.header}>
        <button style={S.headerBtn} onClick={handleAbandon}>
          <X size={24} />
        </button>
        <ProgressDots total={exercises.length} current={currentIndex} />
        <div style={{ width: '2rem' }} />
      </div>

      <div style={S.scrollArea}>
        <div style={S.videoBox}>
          {uniqueVideoUrls.map(({ url, urlYt, name }) => (
            <div key={url ?? urlYt ?? name} style={{ width: '100%', height: '100%', display: (currentEx?.video_url === url || (!currentEx?.video_url && currentEx?.video_url_yt === urlYt)) ? 'block' : 'none' }}>
              <CachedVideo videoUrl={url} videoUrlYt={urlYt} exerciseName={name} />
            </div>
          ))}
          {!currentEx?.video_url && !currentEx?.video_url_yt && (
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
            <div style={{ ...S.statCard, flex: 2, position: 'relative', overflow: 'hidden' }}>
              {hasTimer && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: `${(timeLeft / targetTime) * 100}%`, height: '100%', background: 'rgba(59,130,246,0.35)', transition: 'width 1s linear', borderRadius: 'var(--radius-md)' }} />
              )}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <TimerIcon size={14} color={hasTimer ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.04em' }}>
                  {formatTime(hasTimer ? timeLeft : timeElapsed)}
                </span>
              </div>
            </div>
            <button style={{ ...S.statCard, flex: 1, cursor: 'pointer', gap: '0.4rem' }} onClick={() => setIsActive(!isActive)}>
              {isActive ? <Pause size={18} /> : <Play size={18} />}
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{isActive ? 'Pausar' : 'Reanudar'}</span>
            </button>
            <button style={{ ...S.statCard, flex: 1, cursor: 'pointer', gap: '0.4rem', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleAbandon}>
              <StopCircle size={18} color="#ef4444" />
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#ef4444' }}>Terminar</span>
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
