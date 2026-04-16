"use client"

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import CachedVideo from "./CachedVideo";

type ExRow = {
  id: number; name: string;
  video_url: string | null; video_url_yt: string | null;
  description: string | null; muscles: string | null; joints: string | null;
  easier_id: number | null; easier_name: string | null;
  harder_id: number | null; harder_name: string | null;
};

type ModalState = { type: 'create' } | { type: 'edit'; ex: ExRow } | { type: 'delete'; ex: ExRow } | { type: 'video'; ex: ExRow; source: 'local' | 'yt' } | null;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.75rem',
  background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
  fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box',
};

const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const, minHeight: '5rem' };

const LIMIT = 50;

interface Props { headers: Record<string, string> }

export default function AdminExercises({ headers }: Props) {
  const [exercises, setExercises] = useState<ExRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [fName, setFName] = useState("");
  const [fVideoUrl, setFVideoUrl] = useState("");
  const [fVideoUrlYt, setFVideoUrlYt] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fMuscles, setFMuscles] = useState("");
  const [fJoints, setFJoints] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/exercises?${params}`, { headers });
      const data = await res.json();
      setExercises(data.exercises ?? []);
      setTotal(data.total ?? 0);
    } catch {}
    setLoading(false);
  }, [page, search, headers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const openCreate = () => {
    setFName(""); setFVideoUrl(""); setFVideoUrlYt(""); setFDesc(""); setFMuscles(""); setFJoints(""); setError("");
    setModal({ type: 'create' });
  };

  const openEdit = (ex: ExRow) => {
    setFName(ex.name); setFVideoUrl(ex.video_url ?? ""); setFVideoUrlYt(ex.video_url_yt ?? "");
    setFDesc(ex.description ?? ""); setFMuscles(ex.muscles ?? ""); setFJoints(ex.joints ?? ""); setError("");
    setModal({ type: 'edit', ex });
  };

  const handleSave = async () => {
    if (!fName.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    const body = { name: fName, video_url: fVideoUrl, video_url_yt: fVideoUrlYt, description: fDesc, muscles: fMuscles, joints: fJoints };
    const isEdit = modal?.type === 'edit';
    const url = isEdit ? `/api/admin/exercises/${(modal as { type: 'edit'; ex: ExRow }).ex.id}` : '/api/admin/exercises';
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
    setModal(null);
    load();
  };

  const handleDelete = async () => {
    if (modal?.type !== 'delete') return;
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/exercises/${modal.ex.id}`, { method: 'DELETE', headers });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Error al eliminar'); return; }
    setModal(null);
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: 0 }}>
          Ejercicios ({total})
        </p>
        <button onClick={openCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}>
          <Plus size={14} /> Nuevo ejercicio
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
          placeholder="Buscar ejercicio..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => { setSearch(searchInput); setPage(1); }}
          style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Search size={16} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {exercises.map(ex => (
            <div key={ex.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {ex.video_url ? '📁 local' : ''}{ex.video_url && ex.video_url_yt ? ' · ' : ''}{ex.video_url_yt ? '▶ YT' : ''}{!ex.video_url && !ex.video_url_yt ? 'Sin vídeo' : ''}
                  {ex.muscles ? ` · ${ex.muscles}` : ''}
                </p>
              </div>
              {ex.video_url && (
                <button onClick={() => setModal({ type: 'video', ex, source: 'local' })} title="Ver vídeo local" style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', fontSize: '0.75rem' }}>
                  📁
                </button>
              )}
              {ex.video_url_yt && (
                <button onClick={() => setModal({ type: 'video', ex, source: 'yt' })} title="Ver vídeo YouTube" style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex' }}>
                  <Play size={15} />
                </button>
              )}
              <button onClick={() => openEdit(ex)} style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                <Pencil size={15} />
              </button>
              <button onClick={() => { setError(""); setModal({ type: 'delete', ex }); }} style={{ padding: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'flex' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'flex' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: modal.type === 'video' ? '36rem' : '28rem', background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: '90dvh', overflowY: 'auto' }}>
            {modal.type === 'video' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '1rem' }}>
                    {modal.ex.name} {modal.source === 'local' ? '· 📁 Local' : '· ▶ YouTube'}
                  </h2>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexShrink: 0 }}><X size={20} /></button>
                </div>
                <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: '60dvh', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
                  <CachedVideo
                    videoUrl={modal.source === 'local' ? modal.ex.video_url : null}
                    videoUrlYt={modal.source === 'yt' ? modal.ex.video_url_yt : null}
                    exerciseName={modal.ex.name}
                  />
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {modal.source === 'local' ? modal.ex.video_url : modal.ex.video_url_yt}
                </p>
              </>
            ) : modal.type === 'delete' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Eliminar ejercicio</h2>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={20} /></button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                  ¿Eliminar <strong style={{ color: 'var(--text-primary)' }}>{modal.ex.name}</strong>? No se puede deshacer.
                </p>
                {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem' }}>Cancelar</button>
                  <button onClick={handleDelete} disabled={saving} style={{ flex: 1, padding: '0.75rem', background: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600 }}>
                    {saving ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
                    {modal.type === 'create' ? 'Nuevo ejercicio' : 'Editar ejercicio'}
                  </h2>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={20} /></button>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Nombre *</label>
                  <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Nombre del ejercicio" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Vídeo local (ruta /videos/...)</label>
                  <input value={fVideoUrl} onChange={e => setFVideoUrl(e.target.value)} placeholder="/videos/Nombre ejercicio.3gpp" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Vídeo YouTube (URL)</label>
                  <input value={fVideoUrlYt} onChange={e => setFVideoUrlYt(e.target.value)} placeholder="https://youtu.be/..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Descripción</label>
                  <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Descripción del ejercicio..." style={taStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Músculos</label>
                  <input value={fMuscles} onChange={e => setFMuscles(e.target.value)} placeholder="Cuádriceps, glúteos..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Articulaciones</label>
                  <input value={fJoints} onChange={e => setFJoints(e.target.value)} placeholder="Rodilla, cadera..." style={inputStyle} />
                </div>

                {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
                <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <Check size={16} />
                  {saving ? 'Guardando...' : modal.type === 'create' ? 'Crear ejercicio' : 'Guardar cambios'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
