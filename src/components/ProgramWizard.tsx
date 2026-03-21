"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
import type { WizardSession, WizardExercise, ExerciseRow } from "@/types";

interface Props {
  headers: Record<string, string>;
  programId?: number; // if set, edit mode
  onSaved: () => void;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.625rem 0.75rem",
  background: "var(--bg-primary)", border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)", color: "var(--text-primary)",
  fontSize: "0.875rem", fontFamily: "inherit", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle };

let tempIdCounter = 0;
function newTempId() { return `tmp_${++tempIdCounter}`; }

function emptyExercise(order: number): WizardExercise {
  return { tempId: newTempId(), ex_id: 0, ex_name: "", bloque: "A", tipo_bloque: "normal", set_number: 1, ex_order: order, reps: "", tiempo_ej: "" };
}

function emptySession(num: number): WizardSession {
  return { tempId: newTempId(), numero_sesion: num, nombre_sesion: "", exercises: [] };
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

  // Load exercise catalog
  useEffect(() => {
    fetch("/api/admin/exercises?limit=2000", { headers })
      .then(r => r.json())
      .then(d => setExercises(d.exercises ?? []));
  }, [headers]);

  // Load existing program in edit mode
  useEffect(() => {
    if (!programId) return;
    setLoading(true);
    fetch(`/api/admin/programs/${programId}`, { headers })
      .then(r => r.json())
      .then(data => {
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setImageUrl(data.image_url ?? "");
        const loadedSessions: WizardSession[] = (data.sessions ?? []).map((s: any) => ({
          tempId: newTempId(),
          numero_sesion: s.numero_sesion,
          nombre_sesion: s.name ?? "",
          exercises: (s.exercises ?? []).map((e: any) => ({
            tempId: newTempId(),
            ex_id: e.ex_id,
            ex_name: e.ex_name ?? "",
            bloque: e.block ?? "A",
            tipo_bloque: e.block_type ?? "normal",
            set_number: e.set_number ?? 1,
            ex_order: e.ex_order ?? 1,
            reps: e.reps ?? "",
            tiempo_ej: e.tiempo_ej ?? "",
          })),
        }));
        setSessions(loadedSessions.length ? loadedSessions : [emptySession(1)]);
        setLoading(false);
      });
  }, [programId, headers]);

  const activeSession = sessions[activeIdx];

  const updateSession = useCallback((idx: number, patch: Partial<WizardSession>) => {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }, []);

  const updateExercise = useCallback((sesIdx: number, exIdx: number, patch: Partial<WizardExercise>) => {
    setSessions(prev => prev.map((s, i) => {
      if (i !== sesIdx) return s;
      const exs = s.exercises.map((e, j) => j === exIdx ? { ...e, ...patch } : e);
      return { ...s, exercises: exs };
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
    setActiveIdx(prev => Math.min(prev, sessions.length - 2));
  };

  const addExercise = () => {
    const order = (activeSession?.exercises.length ?? 0) + 1;
    updateSession(activeIdx, { exercises: [...(activeSession?.exercises ?? []), emptyExercise(order)] });
  };

  const removeExercise = (exIdx: number) => {
    const exs = activeSession.exercises.filter((_, i) => i !== exIdx).map((e, i) => ({ ...e, ex_order: i + 1 }));
    updateSession(activeIdx, { exercises: exs });
  };

  const moveExercise = (exIdx: number, dir: -1 | 1) => {
    const exs = [...activeSession.exercises];
    const target = exIdx + dir;
    if (target < 0 || target >= exs.length) return;
    [exs[exIdx], exs[target]] = [exs[target], exs[exIdx]];
    const reordered = exs.map((e, i) => ({ ...e, ex_order: i + 1 }));
    updateSession(activeIdx, { exercises: reordered });
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase())
  );

  const validate = (): string | null => {
    if (!name.trim()) return "El nombre del programa es obligatorio";
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].exercises.length === 0) return `La sesión ${i + 1} no tiene ejercicios`;
      for (const ex of sessions[i].exercises) {
        if (!ex.ex_id) return `Sesión ${i + 1}: hay un ejercicio sin seleccionar`;
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
      const body = { name, description, image_url: imageUrl, sessions: sessions.map(s => ({ numero_sesion: s.numero_sesion, nombre_sesion: s.nombre_sesion, exercises: s.exercises })) };
      const url = programId ? `/api/admin/programs/${programId}` : "/api/admin/programs";
      const method = programId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); setSaving(false); return; }

      // If edit, auto-download backup
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

  const steps = ["Programa", "Sesiones", "Ejercicios", "Resumen"];

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

      {/* Step 2: Exercises per session */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Ejercicios</h3>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {sessions.map((s, i) => (
                <button key={s.tempId} onClick={() => setActiveIdx(i)}
                  style={{ padding: "0.25rem 0.6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", cursor: "pointer", fontSize: "0.8rem",
                    background: activeIdx === i ? "var(--accent)" : "var(--bg-secondary)", color: activeIdx === i ? "#fff" : "var(--text-primary)" }}>
                  S{s.numero_sesion}
                </button>
              ))}
            </div>
          </div>

          {activeSession && (
            <>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Buscar ejercicio..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
              </div>

              {activeSession.exercises.map((ex, exIdx) => (
                <div key={ex.tempId} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", minWidth: 20 }}>#{exIdx + 1}</span>
                    <select style={{ ...selectStyle, flex: 2 }} value={ex.ex_id}
                      onChange={e => {
                        const found = exercises.find(x => x.id === Number(e.target.value));
                        updateExercise(activeIdx, exIdx, { ex_id: Number(e.target.value), ex_name: found?.name ?? "" });
                      }}>
                      <option value={0}>-- Seleccionar ejercicio --</option>
                      {filteredExercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button onClick={() => moveExercise(exIdx, -1)} disabled={exIdx === 0} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "0.25rem", color: "var(--text-secondary)" }}><ChevronUp size={14} /></button>
                      <button onClick={() => moveExercise(exIdx, 1)} disabled={exIdx === activeSession.exercises.length - 1} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", cursor: "pointer", padding: "0.25rem", color: "var(--text-secondary)" }}><ChevronDown size={14} /></button>
                      <button onClick={() => removeExercise(exIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", padding: "0.25rem" }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Bloque</label>
                      <input style={inputStyle} value={ex.bloque} maxLength={1}
                        onChange={e => updateExercise(activeIdx, exIdx, { bloque: e.target.value.toUpperCase() })} placeholder="A" />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Tipo bloque</label>
                      <select style={selectStyle} value={ex.tipo_bloque} onChange={e => updateExercise(activeIdx, exIdx, { tipo_bloque: e.target.value as WizardExercise["tipo_bloque"] })}>
                        <option value="normal">Normal</option>
                        <option value="circuit">Circuito</option>
                        <option value="superset">Superserie</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Serie nº</label>
                      <input style={inputStyle} type="number" min={1} value={ex.set_number}
                        onChange={e => updateExercise(activeIdx, exIdx, { set_number: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Reps</label>
                      <input style={inputStyle} value={ex.reps} onChange={e => updateExercise(activeIdx, exIdx, { reps: e.target.value })} placeholder="10" />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Tiempo</label>
                      <input style={inputStyle} value={ex.tiempo_ej} onChange={e => updateExercise(activeIdx, exIdx, { tiempo_ej: e.target.value })} placeholder="30s" />
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addExercise} style={{ padding: "0.5rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)", background: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                <Plus size={14} /> Añadir ejercicio
              </button>
            </>
          )}

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
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>{sessions.length} sesión(es) · {sessions.reduce((acc, s) => acc + s.exercises.length, 0)} ejercicio(s) total</p>
          </div>
          {sessions.map(s => (
            <div key={s.tempId} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: "0.75rem" }}>
              <p style={{ margin: "0 0 0.5rem", color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600 }}>
                Sesión {s.numero_sesion}{s.nombre_sesion ? ` — ${s.nombre_sesion}` : ""}
              </p>
              {s.exercises.map((ex, i) => (
                <p key={ex.tempId} style={{ margin: "0.25rem 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  {i + 1}. [{ex.bloque}] {ex.ex_name || "(sin ejercicio)"} — {ex.tipo_bloque} · serie {ex.set_number}{ex.reps ? ` · ${ex.reps} reps` : ""}{ex.tiempo_ej ? ` · ${ex.tiempo_ej}` : ""}
                </p>
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
