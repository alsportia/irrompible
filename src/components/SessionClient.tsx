"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, Info, Shuffle, X, ChevronDown, ChevronUp, Zap, Video } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { getExerciseById } from "@/app/actions";
import CachedVideo from "./CachedVideo";

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
  description: string | null;
  muscles: string | null;
  joints: string | null;
  easier_id: number | null;
  easier_name: string | null;
  harder_id: number | null;
  harder_name: string | null;
}

type ExerciseDetail = NonNullable<Awaited<ReturnType<typeof getExerciseById>>>;

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
  programId: number;
  exercisesRaw: ExerciseRow[];
}

const ENERGY_LEVELS = [
  { label: "¡A tope!", emoji: "🔥", pct: 1.00, color: "#10b981" },
  { label: "Bien",         emoji: "💪", pct: 0.75, color: "#3b82f6" },
  { label: "Cansado",      emoji: "😓", pct: 0.50, color: "#f59e0b" },
  { label: "Muy Cansado",  emoji: "😴", pct: 0.25, color: "#ef4444" },
] as const;
type EnergyLevel = typeof ENERGY_LEVELS[number];

// Mirror of the server-side applyEnergy in workflow/[id]/page.tsx
function applyEnergy(exercises: ExerciseRow[], pct: number): ExerciseRow[] {
  if (pct >= 1) return exercises;
  const maxSetPerBlock = new Map<string, number>();
  exercises.forEach(e => {
    maxSetPerBlock.set(e.block, Math.max(maxSetPerBlock.get(e.block) ?? 0, e.set_number));
  });
  return exercises
    .map(ex => {
      if (ex.reps && ex.reps !== "0") {
        const n = parseInt(ex.reps);
        if (!isNaN(n) && n > 1) return { ...ex, reps: String(Math.max(1, Math.round(n * pct))) };
      }
      return ex;
    })
    .filter(ex => {
      const maxSet = maxSetPerBlock.get(ex.block) ?? 1;
      if (maxSet <= 1) return true;
      return ex.set_number <= Math.max(1, Math.round(maxSet * pct));
    });
}

function groupByBlock(exercises: ExerciseRow[]): BlockGroup[] {
  const map = new Map<string, BlockGroup>();
  for (const ex of exercises) {
    if (!map.has(ex.block)) {
      map.set(ex.block, { block: ex.block, block_type: ex.block_type, totalSets: 0, exercises: [] });
    }
    const group = map.get(ex.block)!;
    group.exercises.push(ex);
    group.totalSets = Math.max(group.totalSets, ex.set_number);
  }
  return Array.from(map.values());
}

function getUniqueExercisesInBlock(group: BlockGroup): ExerciseRow[] {
  const seen = new Set<number>();
  return group.exercises.filter(ex => {
    if (seen.has(ex.ex_id)) return false;
    seen.add(ex.ex_id);
    return true;
  });
}

function getYTThumbnail(url: string | null): string | null {
  if (!url) return null;
  // Local video — use a dumbbell placeholder (handled in JSX)
  if (url.startsWith('/')) return '__local__';
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return "https://img.youtube.com/vi/" + shortsMatch[1] + "/mqdefault.jpg";
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return "https://img.youtube.com/vi/" + shortMatch[1] + "/mqdefault.jpg";
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return "https://img.youtube.com/vi/" + watchMatch[1] + "/mqdefault.jpg";
  return null;
}

export default function SessionClient({
  sessionId,
  sessionName,
  sessionDescription,
  programId,
  exercisesRaw,
}: SessionClientProps) {
  const router = useRouter();
  const { user } = useUser();

  // "energy" = picking level, "summary" = showing adapted session
  const [view, setView] = useState<"energy" | "summary">("energy");
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>(ENERGY_LEVELS[0]);
  const [detailEx, setDetailEx] = useState<ExerciseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  // Resume prompt
  const [resumeData, setResumeData] = useState<{ logId: number; currentIndex: number } | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  const adaptedExercises = applyEnergy(exercisesRaw, selectedEnergy.pct);
  const blocks = groupByBlock(adaptedExercises);
  const totalExercises = new Set(adaptedExercises.map(e => e.ex_id)).size;

  useEffect(() => {
    setExpandedBlocks(new Set(blocks.map(b => b.block)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, view]);

  const toggleBlock = (block: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(block)) next.delete(block);
      else next.add(block);
      return next;
    });
  };

  const openDetail = async (exId: number) => {
    setLoadingDetail(true);
    const detail = await getExerciseById(exId);
    setDetailEx(detail);
    setLoadingDetail(false);
  };

  const startWorkout = () => {
    // If there's saved progress, show the resume modal instead of starting directly
    const saved = localStorage.getItem(`workout_progress_${sessionId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.logId && Date.now() - parsed.savedAt < 86400000) {
          setResumeData({ logId: parsed.logId, currentIndex: parsed.currentIndex ?? 0 });
          setShowResumeModal(true);
          return;
        }
      } catch { /* ignore */ }
      localStorage.removeItem(`workout_progress_${sessionId}`);
    }
    launchWorkout();
  };

  const launchWorkout = () => {
    const params = new URLSearchParams({
      energy: String(selectedEnergy.pct),
      userId: String(user?.id ?? 0),
      energyLabel: encodeURIComponent(selectedEnergy.label),
    });
    router.replace("/workflow/" + sessionId + "?" + params.toString());
  };

  const resumeWorkout = () => {
    if (!resumeData) return;
    setShowResumeModal(false);
    const params = new URLSearchParams({
      energy: String(selectedEnergy.pct),
      userId: String(user?.id ?? 0),
      energyLabel: encodeURIComponent(selectedEnergy.label),
      resumeLogId: String(resumeData.logId),
      startIndex: String(resumeData.currentIndex),
    });
    router.replace("/workflow/" + sessionId + "?" + params.toString());
  };

  const discardAndStart = () => {
    localStorage.removeItem(`workout_progress_${sessionId}`);
    setResumeData(null);
    setShowResumeModal(false);
    launchWorkout();
  };

  // ── Energy picker view ────────────────────────────────────────────────────
  if (view === "energy") {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-geist-sans)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => router.push(`/?programId=${programId}`)}
            style={{ padding: "0.5rem", marginLeft: "-0.5rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
          >
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {sessionName}
            </h1>
          </div>
        </div>

        {/* Energy picker */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "2rem 1.25rem", gap: "1.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "4rem", height: "4rem", borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <Zap size={28} color="var(--accent-primary)" />
            </div>
            <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "0 0 0.5rem" }}>
              Como te encuentras hoy?
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
              Adaptaremos el entrenamiento a tu nivel de energia
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {ENERGY_LEVELS.map(level => {
              const isSelected = selectedEnergy.label === level.label;
              return (
                <button
                  key={level.label}
                  onClick={() => setSelectedEnergy(level)}
                  style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", borderRadius: "var(--radius-md)", border: "2px solid " + (isSelected ? level.color : "var(--border-subtle)"), background: isSelected ? level.color + "cc" : "var(--bg-secondary)", cursor: "pointer", textAlign: "left" as const, transition: "all 0.15s ease" }}
                >
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{level.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1rem", color: isSelected ? "#fff" : "var(--text-primary)" }}>{level.label}</div>
                    <div style={{ fontSize: "0.75rem", color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-secondary)" }}>
                      {level.pct < 1 ? Math.round(level.pct * 100) + "% de reps y sets" : "Entrenamiento completo"}
                    </div>
                  </div>
                  <div style={{ width: "1.25rem", height: "1.25rem", borderRadius: "50%", border: "2px solid " + level.color, background: level.color, boxShadow: "0 0 0 2px #fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isSelected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue button */}
        <div style={{ paddingTop: "1rem", paddingLeft: "1rem", paddingRight: "1rem", paddingBottom: "max(1rem, env(safe-area-inset-bottom))", borderTop: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => setView("summary")}
            className="btn-primary glow"
            style={{ width: "100%", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 700 }}
          >
            Ver resumen
          </button>
        </div>
      </div>
    );
  }

  // ── Summary view ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-geist-sans)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, zIndex: 10 }}>
        <button
          onClick={() => setView("energy")}
          style={{ padding: "0.5rem", marginLeft: "-0.5rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
        >
          <ChevronLeft size={24} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sessionName}
          </h1>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
            {totalExercises} ejercicios &middot; <span style={{ color: selectedEnergy.color }}>{selectedEnergy.emoji} {selectedEnergy.label}</span>
          </p>
        </div>
      </div>

      {/* Session description */}
      {sessionDescription && (
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{sessionDescription}</p>
        </div>
      )}

      {/* Blocks list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {blocks.map((group) => {
          const uniqueExs = getUniqueExercisesInBlock(group);
          const isExpanded = expandedBlocks.has(group.block);
          const isCircuit = group.block_type === "circuit";

          return (
            <div key={group.block} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <button
                onClick={() => toggleBlock(group.block)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <span style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "0.95rem" }}>
                      Bloque {group.block}
                    </span>
                    {isCircuit && (
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(59,130,246,0.15)", color: "var(--accent-primary)", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "4px", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                        <Shuffle size={10} /> Circuito
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {uniqueExs.length} ejercicio{uniqueExs.length !== 1 ? "s" : ""} &middot; {group.totalSets} set{group.totalSets !== 1 ? "s" : ""}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
              </button>

              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  {uniqueExs.map((ex, idx) => {
                    const thumb = getYTThumbnail(ex.video_url);
                    return (
                      <div
                        key={ex.ex_id}
                        style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderBottom: idx < uniqueExs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                      >
                        <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {thumb === '__local__' ? (
                            <Video size={16} color="var(--accent-primary)" />
                          ) : thumb ? (
                            <img src={thumb} alt={ex.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <Shuffle size={16} color="var(--text-secondary)" />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</p>
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" as const }}>
                            {ex.reps && ex.reps !== "0" && (
                              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", background: "var(--bg-tertiary)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                                {ex.reps} reps
                              </span>
                            )}
                            {ex.tiempo_ej && (
                              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", background: "var(--bg-tertiary)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                                {ex.tiempo_ej}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => openDetail(ex.ex_id)}
                          style={{ padding: "0.4rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}
                        >
                          <Info size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Start button */}
      <div style={{ paddingTop: "1rem", paddingLeft: "1rem", paddingRight: "1rem", paddingBottom: "max(1rem, env(safe-area-inset-bottom))", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-primary)" }}>
        <button
          onClick={startWorkout}
          className="btn-primary glow"
          style={{ width: "100%", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 700 }}
        >
          <Play size={20} />
          Iniciar Entrenamiento
        </button>
      </div>

      {/* Exercise detail modal */}
      {(detailEx || loadingDetail) && (
        <div
          onClick={() => setDetailEx(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "85dvh", background: "var(--bg-secondary)", borderRadius: "1.25rem 1.25rem 0 0", overflow: "hidden", display: "flex", flexDirection: "column" }}
          >
            {loadingDetail ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>Cargando...</div>
            ) : detailEx ? (
              <>
                <div style={{ height: "220px", background: "#000", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CachedVideo videoUrl={detailEx.video_url} videoUrlYt={detailEx.video_url_yt} exerciseName={detailEx.name} />
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.25rem", margin: 0, flex: 1 }}>{detailEx.name}</h2>
                    <button onClick={() => setDetailEx(null)} style={{ padding: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
                      <X size={22} />
                    </button>
                  </div>
                  {detailEx.description && (
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem", whiteSpace: "pre-wrap" }}>{detailEx.description}</p>
                  )}
                  {detailEx.muscles && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Musculos</span>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>{detailEx.muscles}</p>
                    </div>
                  )}
                  {detailEx.joints && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Articulaciones</span>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>{detailEx.joints}</p>
                    </div>
                  )}
                  {(detailEx.easier_name || detailEx.harder_name) && (
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                      {detailEx.easier_name && (
                        <div style={{ flex: 1, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-md)", padding: "0.625rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, color: "#10b981" }}>Mas facil</span>
                          <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}>{detailEx.easier_name}</p>
                        </div>
                      )}
                      {detailEx.harder_name && (
                        <div style={{ flex: 1, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "0.625rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, color: "#ef4444" }}>Mas dificil</span>
                          <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}>{detailEx.harder_name}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Resume modal */}
      {showResumeModal && resumeData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", padding: "1.5rem", width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⏸️</div>
              <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>Sesión en progreso</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
                Tienes esta sesión a medias. ¿Quieres continuar donde lo dejaste?
              </p>
            </div>
            <button onClick={resumeWorkout} className="btn-primary glow" style={{ width: "100%", padding: "0.875rem", fontWeight: 700 }}>
              Continuar
            </button>
            <button onClick={discardAndStart} style={{ width: "100%", padding: "0.875rem", background: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500, fontSize: "0.9rem" }}>
              Empezar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
