"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Download, Plus } from "lucide-react";
import ProgramWizard from "./ProgramWizard";
import ProgramImportExport from "./ProgramImportExport";
import { useUser } from "@/lib/userContext";

interface ProgramRow {
  id: number;
  name: string;
  description: string | null;
  session_count: number;
}

type View = "list" | "create" | { edit: number };

export default function AdminPrograms() {
  const { user } = useUser();
  const headers = user ? { "x-user-id": String(user.id) } : {};

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("list");
  const [deleteTarget, setDeleteTarget] = useState<ProgramRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/programs", { headers });
      const data = await res.json();
      setPrograms(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/admin/programs/export?id=${id}`, { headers });
      if (!res.ok) throw new Error("Error al exportar");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name.toLowerCase().replace(/\s+/g, "_")}.xlsx`;
      a.click();
    } catch (e: unknown) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al exportar" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/programs/${deleteTarget.id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Error al eliminar");
      setMessage({ type: "success", text: `Programa "${deleteTarget.name}" eliminado` });
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Error al eliminar" });
    }
    setDeleting(false);
  };

  const tdStyle: React.CSSProperties = { padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: "0.875rem" };
  const thStyle: React.CSSProperties = { ...tdStyle, color: "var(--text-secondary)", fontWeight: 600, textAlign: "left" };
  const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "0.25rem" };

  if (view === "create" || (typeof view === "object" && "edit" in view)) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <ProgramWizard
          headers={headers}
          programId={typeof view === "object" ? view.edit : undefined}
          onSaved={() => { setView("list"); load(); setMessage({ type: "success", text: "Programa guardado correctamente" }); }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Programas de entrenamiento</h2>
        <button onClick={() => setView("create")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.875rem" }}>
          <Plus size={16} /> Nuevo programa
        </button>
      </div>

      <ProgramImportExport headers={headers} onImported={() => { load(); setMessage({ type: "success", text: "Programa importado correctamente" }); }} />

      {message && (
        <p style={{ color: message.type === "success" ? "#27ae60" : "#e74c3c", fontSize: "0.875rem", margin: 0 }}>
          {message.text}
        </p>
      )}

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Cargando...</p>
      ) : programs.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No hay programas. Crea uno o importa un Excel.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Descripción</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Sesiones</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={{ ...tdStyle, color: "var(--text-secondary)" }}>{p.description ?? "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{p.session_count}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                      <button style={iconBtn} title="Editar" onClick={() => setView({ edit: p.id })}><Pencil size={16} /></button>
                      <button style={iconBtn} title="Exportar" onClick={() => handleExport(p.id, p.name)}><Download size={16} /></button>
                      <button style={{ ...iconBtn, color: "#e74c3c" }} title="Eliminar" onClick={() => setDeleteTarget(p)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--bg-primary)", borderRadius: "var(--radius-lg)", padding: "1.5rem", maxWidth: 400, width: "90%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Eliminar programa</h3>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              ¿Seguro que quieres eliminar <strong>"{deleteTarget.name}"</strong> y todas sus sesiones? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "0.5rem 1rem", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "0.5rem 1rem", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
