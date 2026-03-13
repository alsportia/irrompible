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

// Helper to parse time string like "40''" or "1'" to seconds.
function parseTimeToSeconds(timeStr: string | null): number {
  if (!timeStr) return 0;
  let seconds = 0;
  const clean = timeStr.trim();
  if (clean.includes("'") && !clean.includes("''")) {
    // 1' -> 1 minute = 60s
    const val = parseInt(clean.replace("'", ""));
    if (!isNaN(val)) seconds = val * 60;
  } else if (clean.includes("''")) {
    const val = parseInt(clean.replace("''", ""));
    if (!isNaN(val)) seconds = val;
  } else {
    // try to parse raw int just in case
    const val = parseInt(clean);
    if (!isNaN(val)) seconds = val;
  }
  return seconds;
}

export default function WorkoutTracker({ sessionId, logId, exercises }: WorkoutTrackerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0); // for stopwatch
  const [timeLeft, setTimeLeft] = useState(0);       // for countdown
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);     // countdown before exercise starts
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false);
  
  const { playCountdownBeep, playWarningBeep, playFinalBeep } = useBeep();
  
  // To track total session time
  const startTime = useRef<number>(Date.now());
  
  const currentEx = exercises[currentIndex];
  const isFinished = currentIndex >= exercises.length;

  const targetTime = currentEx ? parseTimeToSeconds(currentEx.tiempo_ej) : 0;
  const hasTimer = targetTime > 0;

  useEffect(() => {
    if (isFinished) return;
    
    // Reset timers and start countdown when exercise changes
    setTimeElapsed(0);
    setTimeLeft(targetTime);
    setIsActive(false);
    setCountdown(5);
    setIsCountingDown(true);
    setHasPlayedWarning(false);
  }, [currentIndex, isFinished, targetTime]);

  // Countdown before exercise starts
  useEffect(() => {
    if (!isCountingDown || isFinished) return;

    if (countdown > 0) {
      playCountdownBeep();
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished, start exercise
      playFinalBeep();
      setIsCountingDown(false);
      setIsActive(true);
    }
  }, [countdown, isCountingDown, isFinished, playCountdownBeep, playFinalBeep]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && !isFinished && !isCountingDown) {
      interval = setInterval(() => {
        if (hasTimer) {
          setTimeLeft((prev) => {
            // Play warning beeps when 5 seconds or less remain
            if (prev <= 5 && prev > 0 && !hasPlayedWarning) {
              playWarningBeep();
              if (prev === 1) {
                setHasPlayedWarning(true);
              }
            }
            
            if (prev <= 1) {
              playFinalBeep();
              handleNext(true); // auto-advance when timer rings
              return 0;
            }
            return prev - 1;
          });
        } else {
          setTimeElapsed((prev) => prev + 1);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isFinished, isCountingDown, hasTimer, currentEx, hasPlayedWarning, playWarningBeep, playFinalBeep]);

  // Need a ref for handleNext so it can be called from setInterval without staleness issues
  const currentExRef = useRef(currentEx);
  const timeElapsedRef = useRef(timeElapsed);
  const currentIndexRef = useRef(currentIndex);
  
  useEffect(() => {
    currentExRef.current = currentEx;
    timeElapsedRef.current = timeElapsed;
    currentIndexRef.current = currentIndex;
  }, [currentEx, timeElapsed, currentIndex]);

  const handleNext = async (autoAdvance = false) => {
    const ex = currentExRef.current;
    if (!ex) return;
    
    // Temporarily pause timer to avoid double triggers
    setIsActive(false);

    // Assuming we didn't track weight in this simple MVP UI yet, can add later
    const timeToSave = hasTimer ? targetTime : timeElapsedRef.current;
    await saveWorkoutSet(logId, ex.ex_id, null, null, timeToSave);

    if (currentIndexRef.current + 1 >= exercises.length) {
      // Session finished
      const totalDuration = Math.floor((Date.now() - startTime.current) / 1000);
      await finishWorkoutLog(logId, totalDuration);
      setCurrentIndex(currentIndexRef.current + 1); // trigger finish screen
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

  // Show countdown screen
  if (isCountingDown && !isFinished) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-primary font-sans animate-fade-in">
        {/* Top Header/Progress */}
        <div className="flex items-center justify-between p-4 bg-bg-secondary border-b border-border-subtle shrink-0">
          <button onClick={() => router.push(`/session/${sessionId}`)} className="p-2 -ml-2 text-text-secondary hover:text-white transition">
            <X size={24} />
          </button>
          <div className="text-sm font-semibold tracking-wider uppercase text-text-secondary">
            {currentIndex + 1} / {exercises.length}
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Countdown Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="mb-8 text-center">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <span className="bg-accent-primary/20 text-accent-primary text-xs font-bold px-2 py-1 rounded">
                Bloque {currentEx.block}
              </span>
              <span className="text-xs text-text-secondary font-medium">Set {currentEx.set_number}</span>
            </div>
            <h2 className="heading-display text-2xl mb-2 leading-tight">{currentEx.name}</h2>
            <p className="text-text-secondary text-sm">Prepárate...</p>
          </div>

          <div className="relative flex items-center justify-center mb-8">
            <svg className="w-64 h-64 transform -rotate-90">
              <circle cx="128" cy="128" r="120" strokeWidth="8" stroke="currentColor" fill="transparent" className="text-border-subtle" />
              <circle cx="128" cy="128" r="120" strokeWidth="8" stroke="currentColor" fill="transparent" 
                className="text-accent-primary transition-all duration-1000 ease-linear"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={(2 * Math.PI * 120) * (countdown / 5)}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="heading-display text-8xl tabular-nums tracking-tighter text-accent-primary animate-pulse">
                {countdown}
              </span>
            </div>
          </div>

          <button 
            onClick={() => {
              setCountdown(0);
              setIsCountingDown(false);
              setIsActive(true);
            }}
            className="px-8 py-3 rounded-full border border-border-subtle bg-bg-secondary text-text-secondary hover:text-white flex items-center gap-2 transition"
          >
            <span className="text-sm font-medium">Saltar cuenta atrás</span>
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-accent-primary/10" />
        <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mb-6 relative z-10">
          <Check size={48} className="text-success" />
        </div>
        <h1 className="heading-display text-4xl mb-4 relative z-10">¡Entrenamiento Completado!</h1>
        <p className="text-text-secondary mb-10 relative z-10">¡Buen trabajo! Tu sesión ha sido registrada correctamente.</p>
        
        <button onClick={() => router.push('/')} className="btn-primary glow relative z-10">
          Volver al Inicio
        </button>
      </div>
    );
  }

  // Formatting time MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-sans animate-fade-in">
      {/* Top Header/Progress */}
      <div className="flex items-center justify-between p-4 bg-bg-secondary border-b border-border-subtle shrink-0">
        <button onClick={() => router.push(`/session/${sessionId}`)} className="p-2 -ml-2 text-text-secondary hover:text-white transition">
          <X size={24} />
        </button>
        <div className="text-sm font-semibold tracking-wider uppercase text-text-secondary">
          {currentIndex + 1} / {exercises.length}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        {/* Video Area */}
        <div className="w-full aspect-video bg-black relative shrink-0">
          <CachedVideo videoUrl={currentEx?.video_url} />
        </div>

        {/* Exercise Info */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="mb-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-accent-primary/20 text-accent-primary text-xs font-bold px-2 py-1 rounded">
                Bloque {currentEx.block}
              </span>
              <span className="text-xs text-text-secondary font-medium">Set {currentEx.set_number}</span>
            </div>
            
            <h2 className="heading-display text-3xl mb-4 leading-tight">{currentEx.name}</h2>
            
            <div className="flex flex-wrap gap-4 mt-6">
              {currentEx.reps && (
                <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col items-center justify-center border-accent-primary/30">
                  <span className="text-sm text-text-secondary mb-1">Repeticiones</span>
                  <span className="text-3xl font-bold font-outfit">{currentEx.reps}</span>
                </div>
              )}
              {currentEx.tiempo_ej && (
                <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col items-center justify-center border-warning/30">
                  <span className="text-sm text-text-secondary mb-1">Objetivo Tiempo</span>
                  <span className="text-xl font-bold font-outfit">{currentEx.tiempo_ej}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timer/Stopwatch Display centrally */}
          <div className="py-8 flex flex-col items-center justify-center mt-6 mb-6">
             <div className="relative flex items-center justify-center">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle cx="96" cy="96" r="88" strokeWidth="8" stroke="currentColor" fill="transparent" className="text-border-subtle" />
                  {hasTimer && (
                    <circle cx="96" cy="96" r="88" strokeWidth="8" stroke="currentColor" fill="transparent" 
                      className="text-accent-primary transition-all duration-1000 ease-linear"
                      strokeDasharray={2 * Math.PI * 88}
                      strokeDashoffset={(2 * Math.PI * 88) * (1 - timeLeft / targetTime)}
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center">
                  <TimerIcon size={24} className={hasTimer ? "text-accent-primary mb-2" : "text-text-secondary mb-2"} />
                  <span className="heading-display text-5xl tabular-nums tracking-tighter">
                    {formatTime(hasTimer ? timeLeft : timeElapsed)}
                  </span>
                </div>
             </div>
             
             <button 
                onClick={() => setIsActive(!isActive)}
                className="mt-6 px-6 py-2 rounded-full border border-border-subtle bg-bg-secondary text-text-secondary hover:text-white flex items-center gap-2 transition"
              >
                {isActive ? <Pause size={16} /> : <Play size={16} />}
                <span className="text-sm font-medium">{isActive ? "Pausar" : "Reanudar"}</span>
              </button>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action */}
      <div className="p-4 bg-bg-primary border-t border-border-subtle shrink-0 pb-10">
        <div className="flex gap-3">
          {currentIndex > 0 && (
            <button 
              onClick={handlePrevious}
              className="btn-primary glow flex items-center justify-center gap-2 px-6 py-4"
            >
              <ChevronLeft size={24} />
              <span>Anterior</span>
            </button>
          )}
          <button 
            onClick={() => handleNext(false)}
            className="btn-primary glow flex-1 flex items-center justify-center gap-2 py-4"
          >
            <Check size={24} />
            <span>Completar y Siguiente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
