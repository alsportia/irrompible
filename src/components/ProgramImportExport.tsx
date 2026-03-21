"use client";

import { useState, useRef } from "react";
import { Download, Upload, FileDown } from "lucide-react";

interface Props {
  headers: Record<string, string>;
  onImported: () => void;
}

interface ConflictState {
  existingId: number;
  existingName: string;
  backupBase64: string;
  pendingFile: File;
}

function downloadBase64(base64: string, filename: string) {
  const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function ProgramImportExport({ headers, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [newName, setNewName] = useState("");

  const btnStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "0.4rem",
    padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)",
    background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.875rem",
  };

  const handleTemplate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/programs/export?template=true", { headers });
      if (!res.ok) throw new Error("Error al generar plantilla");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "plantilla_programa.xlsx";
      a.click();
      setMessage({ type: "success", text: "Plantilla descargada" });
    } catch (e: unknown) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error desconocido" });
    }
    setLoading(false);
  };

  const handleImport = async (file: File, overwrite = false, customName?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (overwrite) formData.append("overwrite", "true");
      if (customName) formData.append("newName", customName);

      const res = await fetch("/api/admin/programs/import", { method: "POST", headers, body: formData });
      const data = await res.json();

      if (data.conflict) {
        setConflict({ existingId: data.existingId, existingName: data.existingName, backupBase64: data.backupBase64, pendingFile: file });
        setNewName(data.existingName + " (copia)");
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Error al importar");

      setMessage({ type: "success", text: `Programa importado: ${data.sessionsCreated} sesiones, ${data.exercisesCreated} ejercicios nuevos` });
      setConflict(null);
      onImported();
    } catch (e: unknown) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error desconocido" });
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImport(file);
    e.target.value = "";
  };

  const handleOverwrite = async () => {
    if (!conflict) return;
    // Download backup first
    downloadBase64(conflict.backupBase64, `backup_${conflict.existingName.replace(/\s+/g, "_")}.xlsx`);
    await handleImport(conflict.pendingFile, true);
  };

  const handleRename = async () => {
    if (!conflict || !newName.trim()) return;
    await handleImport(conflict.pendingFile, false, newName.trim());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button style={btnStyle} onClick={handleTemplate} disabled={loading}>
          <FileDown size={16} /> Descargar plantilla
        </button>
        <button style={btnStyle} onClick={() => fileRef.current?.click()} disabled={loading}>
          <Upload size={16} /> Importar Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFileChange} />
      </div>

      {loading && <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>Procesando...</p>}

      {message && (
        <p style={{ color: message.type === "success" ? "#27ae60" : "#e74c3c", fontSize: "0.875rem", margin: 0 }}>
          {message.text}
        </p>
      )}

      {/* Conflict modal */}
      {conflict && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--bg-primary)", borderRadius: "var(--radius-lg)", padding: "1.5rem", maxWidth: 480, width: "90%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Conflicto de nombre</h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Ya existe un programa llamado <strong>"{conflict.existingName}"</strong>. ¿Qué quieres hacer?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.8rem" }}>Opción 1: Crear con nuevo nombre</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  style={{ flex: 1, padding: "0.5rem 0.75rem", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "0.875rem" }}
                  value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nuevo nombre" />
                <button onClick={handleRename} disabled={loading || !newName.trim()}
                  style={{ padding: "0.5rem 1rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.875rem" }}>
                  Crear
                </button>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                Opción 2: Sobreescribir (se descargará un backup automáticamente)
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleOverwrite} disabled={loading}
                  style={{ padding: "0.5rem 1rem", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.875rem" }}>
                  Sobreescribir
                </button>
                <button onClick={() => setConflict(null)}
                  style={{ padding: "0.5rem 1rem", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.875rem" }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
