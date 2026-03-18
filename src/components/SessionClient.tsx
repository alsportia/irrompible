"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, Info, Shuffle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { getExerciseById } from "@/app/actions";
import CachedVideo from "./CachedVideo";

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
  exercisesRaw: ExerciseRow[];
}

const ENERGY_LEVELS = [
  { label: "¡A tope!",    emoji: "🔥", pct: 1.00, color: "#10b981" },
  { label: "Bien",        emoji: "💪", pct: 0.75, color: "#3b82f6" },
  { label: "Cansado",     emoji: "😓", pct: 0.50, color: "#f59e0b" },
  { label: "Muy Cansado", emoji: "😴", pct: 0.25, color: "#ef4444" },
] as const;
type EnergyLevel = typeof ENERGY_LEVELS[number];

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
  const seen = new Set<string>();
  return group.exercises.filter(ex => {
    if (seen.has(ex.ex_id)) return false;
    seen.add(ex.ex_id);
    return true;
  });
}

export default function SessionClient({
  sessionId,
  sessionName,
  sessionDescription,
  exercisesRaw,
}: SessionClientProps) {
  const router = useRouter();
  const { user } = useUser();

  const [showEnergyPicker, setShowEnergyPicker] = useState(false);
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>(ENERGY_LEVELS[0]);
  const [detailEx, setDetailEx] = useState<ExerciseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const blocks = groupByBlock(exercisesRaw);
  const totalExercises = new Set(exercisesRaw.map(e => e.ex_id)).size;

  const toggleBlock = (block: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(block)) next.delete(block);
      else next.add(block);
      return next;
    });
  };

  const openDetail = async (exId: string) => {
    setLoadingDetail(true);
    const detail = await getExerciseById(exId);
    setDetailEx(detail);
    setLoadingDetail(false);
  };

  const startWorkout = () => {
    const params = new URLSearchParams({
      energy: String(selectedEnergy.pct),
      userId: String(user?.id ?? 0),
      energyLabel: encodeURIComponent(selectedEnergy.label),
    });
    router.push(`/workflow/${sessionId}?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-geist-sans)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, zIndex: 10 }}>
        <button
          onClick={() => router.back()}
          style={{ padding: "0.5rem", marginLeft: "-0.5rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
        >
          <ChevronLeft size={24} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sessionName}
          </h1>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
            {totalExercises} ejercicios · {blocks.length} bloques
          </p>
        </div>
      </div>

      {/* Description */}
      {sessionDescription && (
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{sessionDescription}</p>
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
                    {uniqueExs.length} ejercicio{uniqueExs.length !== 1 ? "s" : ""} · {group.totalSets} set{group.totalSets !== 1 ? "s" : ""}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
              </button>

              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  {uniqueExs.map((ex, idx) => (
                    <div
                      key={ex.ex_id}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderBottom: idx < uniqueExs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    >
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
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Start button */}
      <div style={{ padding: "1rem", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-primary)", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {!showEnergyPicker ? (
          <button
            onClick={() => setShowEnergyPicker(true)}
            className="btn-primary glow"
            style={{ width: "100%", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 700 }}
          >
            <Play size={20} />
            Iniciar Entrenamiento
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, textAlign: "center" as const, color: "var(--text-secondary)" }}>¿Cómo te encuentras hoy?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {ENERGY_LEVELS.map(level => {
                const isSelected = selectedEnergy.label === level.label;
                return (
                  <button
                    key={level.label}
                    onClick={() => setSelectedEnergy(level)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 0.75rem", borderRadius: "var(--radius-md)", border: `2px solid ${isSelected ? level.color : "var(--border-subtle)"}`, background: isSelected ? `${level.color}18` : "var(--bg-secondary)", cursor: "pointer", textAlign: "left" as const }}
                  >
                    <span style={{ fontSize: "1.25rem" }}>{level.emoji}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: isSelected ? level.color : "var(--text-primary)" }}>{level.label}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setShowEnergyPicker(false)}
                style={{ padding: "0.875rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={startWorkout}
                className="btn-primary glow"
                style={{ flex: 1, padding: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontWeight: 700 }}
              >
                <Play size={18} />
                Empezar
              </button>
            </div>
          </div>
        )}
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
                <div style={{ height: "220px", background: "#000", flexShrink: 0 }}>
                  <CachedVideo videoUrl={detailEx.video_url} exerciseName={detailEx.name} />
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h2 style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.25rem", margin: 0, flex: 1 }}>{detailEx.name}</h2>
                    <button onClick={() => setDetailEx(null)} style={{ padding: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}>
                      <X size={22} />
                    </button>
                  </div>
                  {detailEx.description && (
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>{detailEx.description}</p>
                  )}
                  {detailEx.muscles && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text-secondary)" }}>Músculos</span>
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
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, color: "#10b981" }}>Más fácil</span>
                          <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem" }}>{detailEx.easier_name}</p>
                        </div>
                      )}
                      {detailEx.harder_name && (
                        <div style={{ flex: 1, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "0.625rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, color: "#ef4444" }}>Más difícil</span>
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
    </div>
  );
}
