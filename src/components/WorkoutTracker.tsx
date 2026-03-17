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
  screen: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, background: 'var(--bg-primary)', fontFamily: 'var(--font-geist-sans)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 },
  headerBtn: { padding: '0.5rem', marginLeft: '-0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' },
  headerCount: { fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)' },
  scrollArea: { flex: 1, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const },
  videoBox: { width: '100%', aspectRatio: '16/9', background: '#000', flexShrink: 0 },
  infoArea: { padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  blockBadge: { background: 'rgba(59,130,246,0.2)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' },
  setBadge: { fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 },
  exName: { fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
  statsRow: { display: 'flex', gap: '1rem', marginTop: '0.5rem' },
  statCard: { flex: 1, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', backdropFilter: 'blur(12px)' },
  statLabel: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' },
  statValue: { fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.75rem' },
  timerArea: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '1.5rem 0' },
  timerTime: { fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '3rem', letterSpacing: '-0.04em', tabularNums: true },
  pauseBtn: { marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 },
  bottomBar: { padding: '1rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0, paddingBottom: '2.5rem' },
  btnRow: { display: 'flex', gap: '0.75rem' },
};

export default function WorkoutTracker({ sessionId, logId, exercises }: WorkoutTrackerProps) {
  const router = useRouter();
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
      playFinalBeep();
      setIsCountingDown(false);
      setIsActive(true);
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
          if (prev <= 1) { playFinalBeep(); handleNext(true); return 0; }
          return prev - 1;
        });
      } else {
        setTimeElapsed(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, isFinished, isCountingDown, hasTimer, currentEx]);

  const handleNext = async (autoAdvance = false) => {
    const ex = currentExRef.current;
    if (!ex) return;
    setIsActive(false);
    const timeToSave = hasTimer ? targetTime : timeElapsedRef.current;
    await saveWorkoutSet(logId, ex.ex_id, null, null, timeToSave);
    if (currentIndexRef.current + 1 >= exercises.length) {
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

  const circumference = 2 * Math.PI * 88;

  // Countdown screen
  if (isCountingDown && !isFinished) {
    const cdCircumference = 2 * Math.PI * 120;
    return (
      <div style={S.screen} className="animate-fade-in">
        <div style={S.header}>
          <button style={S.headerBtn} onClick={() => router.push(`/session/${sessionId}`)}>
            <X size={24} />
          </button>
          <span style={S.headerCount}>{currentIndex + 1} / {exercises.length}</span>
          <div style={{ width: '2.5rem' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={S.badge}>
              <span style={S.blockBadge}>Bloque {currentEx.block}</span>
              <span style={S.setBadge}>Set {currentEx.set_number}</span>
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

          <button
            style={S.pauseBtn}
            onClick={() => { setIsCountingDown(false); setIsActive(true); }}
          >
            Saltar cuenta atrás
          </button>
        </div>
      </div>
    );
  }

  // Finished screen
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

  return (
    <div style={S.screen} className="animate-fade-in">
      {/* Header */}
      <div style={S.header}>
        <button style={S.headerBtn} onClick={() => router.push(`/session/${sessionId}`)}>
          <X size={24} />
        </button>
        <span style={S.headerCount}>{currentIndex + 1} / {exercises.length}</span>
        <div style={{ width: '2.5rem' }} />
      </div>

      {/* Scrollable content */}
      <div style={S.scrollArea}>
        {/* Video */}
        <div style={S.videoBox}>
          <CachedVideo videoUrl={currentEx?.video_url} />
        </div>

        {/* Info */}
        <div style={S.infoArea}>
          <div>
            <div style={S.badge}>
              <span style={S.blockBadge}>Bloque {currentEx.block}</span>
              <span style={S.setBadge}>Set {currentEx.set_number}</span>
            </div>
            <h2 style={S.exName}>{currentEx.name}</h2>

            {(currentEx.reps || currentEx.tiempo_ej) && (
              <div style={S.statsRow}>
                {currentEx.reps && (
                  <div style={S.statCard}>
                    <span style={S.statLabel}>Repeticiones</span>
                    <span style={S.statValue}>{currentEx.reps}</span>
                  </div>
                )}
                {currentEx.tiempo_ej && (
                  <div style={{ ...S.statCard, borderColor: 'rgba(245,158,11,0.3)' }}>
                    <span style={S.statLabel}>Objetivo</span>
                    <span style={{ ...S.statValue, fontSize: '1.5rem' }}>{currentEx.tiempo_ej}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timer */}
          <div style={S.timerArea}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="192" height="192" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="96" cy="96" r="88" strokeWidth="8" stroke="var(--border-subtle)" fill="transparent" />
                {hasTimer && (
                  <circle cx="96" cy="96" r="88" strokeWidth="8" stroke="var(--accent-primary)" fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - timeLeft / targetTime)}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                )}
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <TimerIcon size={20} color={hasTimer ? 'var(--accent-primary)' : 'var(--text-secondary)'} style={{ marginBottom: '0.25rem' }} />
                <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '2.75rem', letterSpacing: '-0.04em' }}>
                  {formatTime(hasTimer ? timeLeft : timeElapsed)}
                </span>
              </div>
            </div>

            <button style={S.pauseBtn} onClick={() => setIsActive(!isActive)}>
              {isActive ? <Pause size={16} /> : <Play size={16} />}
              <span>{isActive ? 'Pausar' : 'Reanudar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={S.bottomBar}>
        <div style={S.btnRow}>
          {currentIndex > 0 && (
            <button onClick={handlePrevious} className="btn-primary glow" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.25rem' }}>
              <ChevronLeft size={22} />
              <span>Anterior</span>
            </button>
          )}
          <button onClick={() => handleNext(false)} className="btn-primary glow" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
            <Check size={22} />
            <span>Completar y Siguiente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
