"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
import type { WizardSession, WizardBlock, WizardBlockExercise, BlockType, ExerciseRow } from "@/types";

interface Props {
  headers: Record<string, string>;
  programId?: number;
  onSaved: () => void;
  onCancel: () => void;
}

type ApiProgramExercise = {
  ex_id: number;
  ex_name?: string | null;
  ex_order?: number | null;
  reps?: string | null;
  tiempo_ej?: string | null;
};
type ApiProgramBlock = {
  block_label?: string | null;
  block_type?: BlockType | string | null;
  num_sets?: number | null;
  description?: string | null;
  block_order?: number | null;
  exercises?: ApiProgramExercise[] | null;
};
type ApiProgramSession = {
  numero_sesion: number;
  name?: string | null;
  blocks?: ApiProgramBlock[] | null;
};
type ApiProgramResponse = {
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  sessions?: ApiProgramSession[] | null;
};

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "circuit", label: "Circuito" },
  { value: "superset", label: "Superserie" },
  { value: "super_series", label: "Super series" },
  { value: "tabata", label: "Tabata" },
  { value: "interval_repetitions", label: "Intervalos repeticiones" },
  { value: "interval_repetitions_with_pause", label: "Intervalos con pausa" },
  { value: "to_the_one", label: "Al uno" },
  { value: "spartan_race", label: "Spartan Race" },
  { value: "paleo_run", label: "Paleo Run" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.75rem",
  background: "rgba(5, 18, 5, 0.72)", border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)", color: "var(--text-primary)",
  fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle };

let tempIdCounter = 0;
function newTempId() { return `tmp_${++tempIdCounter}`; }

function emptyBlockExercise(order: number): WizardBlockExercise {
  return { tempId: newTempId(), ex_id: 0, ex_name: "", ex_order: order, reps: "", tiempo_ej: "" };
}

function emptyBlock(order: number): WizardBlock {
  return {
    tempId: newTempId(), block_label: "A", block_type: "normal",
    num_sets: 1, description: "", block_order: order,
    exercises: [emptyBlockExercise(1)],
  };
}

function emptySession(num: number): WizardSession {
  return { tempId: newTempId(), numero_sesion: num, nombre_sesion: "", blocks: [emptyBlock(1)] };
}

export default function ProgramWizard({ headers, programId, onSaved, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sessions, setSessions] = useState<WizardSession[]>([emptySession(1)]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [exSearch, setExSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const catalogPromise = fetch("/api/admin/exercises?limit=2000", { headers })
      .then(r => r.json())
      .then(d => d.exercises ?? [] as ExerciseRow[]);

    if (!programId) {
      catalogPromise.then(cat => setExercises(cat));
      return;
    }

    setLoading(true);
    const programPromise = fetch(`/api/admin/programs/${programId}`, { headers }).then(r => r.json());

    Promise.all([catalogPromise, programPromise]).then(([catalog, data]) => {
      const programData = data as ApiProgramResponse;
      setExercises(catalog);
      setName(programData.name ?? "");
      setDescription(programData.description ?? "");
      setImageUrl(programData.image_url ?? "");

      const loadedSessions: WizardSession[] = (programData.sessions ?? []).map((s) => ({
        tempId: newTempId(),
        numero_sesion: s.numero_sesion,
        nombre_sesion: s.name ?? "",
        blocks: (s.blocks ?? []).map((b) => ({
          tempId: newTempId(),
          block_label: b.block_label ?? "A",
          block_type: (typeof b.block_type === "string" && BLOCK_TYPES.some(bt => bt.value === b.block_type)
            ? (b.block_type as BlockType)
            : "normal"),
          num_sets: b.num_sets ?? 1,
          description: b.description ?? "",
          block_order: b.block_order ?? 1,
          exercises: (b.exercises ?? []).map((e) => ({
            tempId: newTempId(),
            ex_id: e.ex_id,
            ex_name: e.ex_name ?? (catalog.find((c: ExerciseRow) => c.id === e.ex_id)?.name ?? ""),
            ex_order: e.ex_order ?? 1,
            reps: e.reps ?? "",
            tiempo_ej: e.tiempo_ej ?? "",
          })),
        })),
      }));

      setSessions(loadedSessions.length ? loadedSessions : [emptySession(1)]);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const activeSession = sessions[activeIdx];

  const updateSession = useCallback((idx: number, patch: Partial<WizardSession>) => {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }, []);

  const updateBlock = useCallback((sesIdx: number, blockIdx: number, patch: Partial<WizardBlock>) => {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sesIdx) return s;
      const blocks = s.blocks.map((b, j) => j === blockIdx ? { ...b, ...patch } : b);
      return { ...s, blocks };
    }));
  }, []);

  const updateBlockExercise = useCallback((sesIdx: number, blockIdx: number, exIdx: number, patch: Partial<WizardBlockExercise>) => {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sesIdx) return s;
      const blocks = s.blocks.map((b, j) => {
        if (j !== blockIdx) return b;
        const exercises = b.exercises.map((e, k) => k === exIdx ? { ...e, ...patch } : e);
        return { ...b, exercises };
      });
      return { ...s, blocks };
    }));
  }, []);

  const addSession = () => {
    const num = sessions.length + 1;
    setSessions(prev => [...prev, emptySession(num)]);
    setActiveIdx(sessions.length);
  };

  const removeSession = (idx: number) => {
    setSessions(prev => {
      const next = prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, numero_sesion: i + 1 }));
      return next.length ? next : [emptySession(1)];
    });
    setActiveIdx(prev => Math.min(prev, Math.max(0, sessions.length - 2)));
  };

  const addBlock = () => {
    const order = (activeSession?.blocks.length ?? 0) + 1;
    updateSession(activeIdx, { blocks: [...(activeSession?.blocks ?? []), emptyBlock(order)] });
  };

  const removeBlock = (blockIdx: number) => {
    const blocks = activeSession.blocks
      .filter((_, i) => i !== blockIdx)
      .map((b, i) => ({ ...b, block_order: i + 1 }));
    updateSession(activeIdx, { blocks: blocks.length ? blocks : [emptyBlock(1)] });
  };

  const moveBlock = (blockIdx: number, dir: -1 | 1) => {
    const blocks = [...activeSession.blocks];
    const target = blockIdx + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[blockIdx], blocks[target]] = [blocks[target], blocks[blockIdx]];
    updateSession(activeIdx, { blocks: blocks.map((b, i) => ({ ...b, block_order: i + 1 })) });
  };

  const addExerciseToBlock = (blockIdx: number) => {
    const block = activeSession.blocks[blockIdx];
    const order = (block?.exercises.length ?? 0) + 1;
    updateBlock(activeIdx, blockIdx, { exercises: [...(block?.exercises ?? []), emptyBlockExercise(order)] });
  };

  const removeExerciseFromBlock = (blockIdx: number, exIdx: number) => {
    const block = activeSession.blocks[blockIdx];
    const exercises = block.exercises
      .filter((_, i) => i !== exIdx)
      .map((e, i) => ({ ...e, ex_order: i + 1 }));
    updateBlock(activeIdx, blockIdx, { exercises: exercises.length ? exercises : [emptyBlockExercise(1)] });
  };

  const moveExerciseInBlock = (blockIdx: number, exIdx: number, dir: -1 | 1) => {
    const block = activeSession.blocks[blockIdx];
    const exs = [...block.exercises];
    const target = exIdx + dir;
    if (target < 0 || target >= exs.length) return;
    [exs[exIdx], exs[target]] = [exs[target], exs[exIdx]];
    updateBlock(activeIdx, blockIdx, { exercises: exs.map((e, i) => ({ ...e, ex_order: i + 1 })) });
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase())
  );

  const validate = (): string | null => {
    if (!name.trim()) return "El nombre del programa es obligatorio";
    for (let i = 0; i < sessions.length; i++) {
      const ses = sessions[i];
      if (ses.blocks.length === 0) return `La sesión ${i + 1} no tiene bloques`;
      for (let j = 0; j < ses.blocks.length; j++) {
        const block = ses.blocks[j];
        if (block.exercises.length === 0) return `El bloque ${block.block_label || j + 1} de la sesión ${i + 1} no tiene ejercicios`;
        for (let k = 0; k < block.exercises.length; k++) {
          if (!block.exercises[k].ex_id) return `Sesión ${i + 1}, bloque ${block.block_label || j + 1}, ejercicio #${k + 1}: no hay ejercicio seleccionado`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSaving(true);
    try {
      const body = {
        name, description, image_url: imageUrl,
        sessions: sessions.map(s => ({
          numero_sesion: s.numero_sesion,
          nombre_sesion: s.nombre_sesion,
          blocks: s.blocks.map(b => ({
            block_label: b.block_label,
            block_type: b.block_type,
            num_sets: b.num_sets,
            description: b.description,
            block_order: b.block_order,
            exercises: b.exercises.map(e => ({
              ex_id: e.ex_id,
              ex_order: e.ex_order,
              reps: e.reps,
              tiempo_ej: e.tiempo_ej,
            })),
          })),
        })),
      };
      const url = programId ? `/api/admin/programs/${programId}` : "/api/admin/programs";
      const method = programId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); setSaving(false); return; }

      if (programId && data.backupBase64) {
        const blob = new Blob([Uint8Array.from(atob(data.backupBase64), c => c.charCodeAt(0))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `backup_programa_${programId}.xlsx`;
        a.click();
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
    setSaving(false);
  };

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Cargando programa...</p>;

  const steps = ["Programa", "Sesiones", "Bloques", "Resumen"];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {steps.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
              background: step === i ? "var(--accent)" : "var(--bg-secondary)", color: step === i ? "#fff" : "var(--text-secondary)", fontSize: "0.8rem" }}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step 0: Program info */}
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{programId ? "Editar programa" : "Nuevo programa"}</h3>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Nombre *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del programa" />
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Descripción</label>
            <textarea style={{ ...inputStyle, minHeight: "4rem", resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional" />
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>URL imagen</label>
            <input style={inputStyle} value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <button onClick={() => setStep(1)} style={{ alignSelf: "flex-end", padding: "0.5rem 1.25rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
            Siguiente →
          </button>
        </div>
      )}

      {/* Step 1: Sessions */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Sesiones</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {sessions.map((s, i) => (
              <div key={s.tempId} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <button onClick={() => setActiveIdx(i)}
                  style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", cursor: "pointer",
                    background: activeIdx === i ? "var(--accent)" : "var(--bg-secondary)", color: activeIdx === i ? "#fff" : "var(--text-primary)", fontSize: "0.85rem" }}>
                  S{s.numero_sesion}
                </button>
                {sessions.length > 1 && (
                  <button onClick={() => removeSession(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "0.25rem" }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addSession} style={{ padding: "0.375rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-subtle)", background: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              <Plus size={14} /> Añadir sesión
            </button>
          </div>
          {activeSession && (
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Nombre sesión {activeSession.numero_sesion}</label>
              <input style={inputStyle} value={activeSession.nombre_sesion} onChange={e => updateSession(activeIdx, { nombre_sesion: e.target.value })} placeholder={`Sesión ${activeSession.numero_sesion}`} />
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(0)} style={{ padding: "0.5rem 1.25rem", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>← Anterior</button>
            <button onClick={() => setStep(2)} style={{ padding: "0.5rem 1.25rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 2: Blocks per session */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Bloques</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {sessions.map((s, i) => (
                <button key={s.tempId} onClick={() => setActiveIdx(i)}
                  style={{ padding: "0.25rem 0.6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", cursor: "pointer", fontSize: "0.8rem",
                    background: activeIdx === i ? "var(--accent)" : "var(--bg-secondary)", color: activeIdx === i ? "#fff" : "var(--text-primary)" }}>
                  S{s.numero_sesion}
                </button>
              ))}
            </div>
          </div>

          <input style={{ ...inputStyle }} placeholder="Buscar ejercicio..." value={exSearch} onChange={e => setExSearch(e.target.value)} />

          {activeSession && activeSession.blocks.map((block, blockIdx) => (
            <div key={block.tempId} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", border: "1px solid var(--border-subtle)" }}>
              {/* Block header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem" }}>Bloque {blockIdx + 1}</span>
                <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
                  <button onClick={() => moveBlock(blockIdx, -1)} disabled={blockIdx === 0} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "0.25rem", color: "var(--text-secondary)" }}><ChevronUp size={14} /></button>
                  <button onClick={() => moveBlock(blockIdx, 1)} disabled={blockIdx === activeSession.blocks.length - 1} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "0.25rem", color: "var(--text-secondary)" }}><ChevronDown size={14} /></button>
                  {activeSession.blocks.length > 1 && (
                    <button onClick={() => removeBlock(blockIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", padding: "0.25rem" }}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>

              {/* Block fields */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Etiqueta</label>
                  <input style={inputStyle} value={block.block_label} maxLength={1}
                    onChange={e => updateBlock(activeIdx, blockIdx, { block_label: e.target.value.toUpperCase() })} placeholder="A" />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Tipo</label>
                  <select style={selectStyle} value={block.block_type}
                    onChange={e => updateBlock(activeIdx, blockIdx, { block_type: e.target.value as BlockType })}>
                    {BLOCK_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Nº series</label>
                  <input style={inputStyle} type="number" min={1} value={block.num_sets}
                    onChange={e => updateBlock(activeIdx, blockIdx, { num_sets: Math.max(1, parseInt(e.target.value) || 1) })} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Descripción (opcional)</label>
                  <input style={inputStyle} value={block.description}
                    onChange={e => updateBlock(activeIdx, blockIdx, { description: e.target.value })} placeholder="Descripción del bloque" />
                </div>
              </div>

              {/* Exercises in block */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {block.exercises.map((ex, exIdx) => {
                  const currentEx = ex.ex_id ? exercises.find(x => x.id === ex.ex_id) : null;
                  const options = filteredExercises.some(x => x.id === ex.ex_id)
                    ? filteredExercises
                    : currentEx ? [currentEx, ...filteredExercises] : filteredExercises;

                  return (
                    <div key={ex.tempId} style={{ background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", minWidth: 18 }}>#{exIdx + 1}</span>
                        <select style={{ ...selectStyle, flex: 2 }} value={ex.ex_id}
                          onChange={e => {
                            const found = exercises.find(x => x.id === Number(e.target.value));
                            updateBlockExercise(activeIdx, blockIdx, exIdx, { ex_id: Number(e.target.value), ex_name: found?.name ?? "" });
                          }}>
                          <option value={0}>-- Seleccionar ejercicio --</option>
                          {options.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button onClick={() => moveExerciseInBlock(blockIdx, exIdx, -1)} disabled={exIdx === 0} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "0.25rem", color: "var(--text-secondary)" }}><ChevronUp size={12} /></button>
                          <button onClick={() => moveExerciseInBlock(blockIdx, exIdx, 1)} disabled={exIdx === block.exercises.length - 1} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "0.25rem", color: "var(--text-secondary)" }}><ChevronDown size={12} /></button>
                          {block.exercises.length > 1 && (
                            <button onClick={() => removeExerciseFromBlock(blockIdx, exIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", padding: "0.25rem" }}><Trash2 size={12} /></button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                        <div>
                          <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Reps</label>
                          <input style={inputStyle} value={ex.reps} onChange={e => updateBlockExercise(activeIdx, blockIdx, exIdx, { reps: e.target.value })} placeholder="10" />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Tiempo</label>
                          <input style={inputStyle} value={ex.tiempo_ej} onChange={e => updateBlockExercise(activeIdx, blockIdx, exIdx, { tiempo_ej: e.target.value })} placeholder="30s" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => addExerciseToBlock(blockIdx)} style={{ padding: "0.375rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-sm)", background: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  <Plus size={12} /> Añadir ejercicio
                </button>
              </div>
            </div>
          ))}

          <button onClick={addBlock} style={{ padding: "0.5rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)", background: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            <Plus size={14} /> Añadir bloque
          </button>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={{ padding: "0.5rem 1.25rem", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>← Anterior</button>
            <button onClick={() => setStep(3)} style={{ padding: "0.5rem 1.25rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Resumen</h3>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "1rem" }}>
            <p style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontWeight: 600 }}>{name || "(sin nombre)"}</p>
            {description && <p style={{ margin: "0 0 0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>{description}</p>}
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {sessions.length} sesión(es) · {sessions.reduce((acc, s) => acc + s.blocks.length, 0)} bloque(s) total
            </p>
          </div>
          {sessions.map(s => (
            <div key={s.tempId} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "0.75rem" }}>
              <p style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600 }}>
                Sesión {s.numero_sesion}{s.nombre_sesion ? ` — ${s.nombre_sesion}` : ""}
                <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: "0.8rem" }}> ({s.blocks.length} bloque(s))</span>
              </p>
              {s.blocks.map((b, bi) => (
                <div key={b.tempId} style={{ marginBottom: "0.5rem", paddingLeft: "0.75rem", borderLeft: "2px solid var(--border-subtle)" }}>
                  <p style={{ margin: "0 0 0.25rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    [{b.block_label}] {b.block_type} · {b.num_sets} serie(s){b.description ? ` · ${b.description}` : ""}
                  </p>
                  {b.exercises.map((ex, ei) => (
                    <p key={ex.tempId} style={{ margin: "0.15rem 0", color: "var(--text-secondary)", fontSize: "0.75rem", paddingLeft: "0.5rem" }}>
                      {ei + 1}. {ex.ex_name || "(sin ejercicio)"}{ex.reps ? ` · ${ex.reps} reps` : ""}{ex.tiempo_ej ? ` · ${ex.tiempo_ej}` : ""}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {error && <p style={{ color: "#e74c3c", fontSize: "0.875rem", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(2)} style={{ padding: "0.5rem 1.25rem", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>← Anterior</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "0.5rem 1.25rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Guardando..." : programId ? "Guardar cambios" : "Crear programa"}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
