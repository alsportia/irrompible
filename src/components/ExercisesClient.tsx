"use client"

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, X, Search } from "lucide-react";
import type { ExerciseItem } from "@/app/exercises/page";

function getYtId(url: string | null) {
  if (!url) return null;
  const s = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (s) return s[1];
  const w = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return w ? w[1] : null;
}

function Thumbnail({ url, name }: { url: string | null; name: string }) {
  const id = getYtId(url);
  const thumb = id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  return (
    <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {thumb
        ? <img src={thumb} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: '1.25rem' }}>💪</span>
      }
      {id && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={8} fill="#000" color="#000" style={{ marginLeft: '1px' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function parseMuscles(raw: string | null): string[] {
  if (!raw) return [];
  try { return (JSON.parse(raw) as string[]).map(s => s.trim()).filter(Boolean); }
  catch { return []; }
}

interface Props { exercises: ExerciseItem[] }

export default function ExercisesClient({ exercises }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ExerciseItem | null>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const filtered = query.trim()
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises;

  const scrollTo = useCallback((id: number) => {
    setModal(null);
    // small delay so modal closes first
    setTimeout(() => {
      const el = rowRefs.current.get(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  const openModal = (ex: ExerciseItem) => setModal(ex);

  return (
    <>
      <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: '28rem', margin: '0 auto', background: 'var(--bg-primary)' }} className="animate-fade-in">

        {/* Header */}
        <header style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <button onClick={() => router.push('/')} style={{ padding: '0.5rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', marginLeft: '-0.25rem' }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1.1rem' }}>Ejercicios</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{exercises.length} ejercicios</div>
          </div>
        </header>

        {/* Search */}
        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar ejercicio..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(ex => {
            const muscles = parseMuscles(ex.muscles);
            return (
              <div
                key={ex.id}
                ref={el => { if (el) rowRefs.current.set(ex.id, el); else rowRefs.current.delete(ex.id); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                onClick={() => openModal(ex)}
              >
                <Thumbnail url={ex.video_url} name={ex.name} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>

                  {/* Muscles */}
                  {muscles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                      {muscles.slice(0, 3).map((m, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '0.1rem 0.4rem', color: 'var(--text-secondary)' }}>{m}</span>
                      ))}
                      {muscles.length > 3 && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>+{muscles.length - 3}</span>}
                    </div>
                  )}

                  {/* Easier / Harder */}
                  {(ex.easier_name || ex.harder_name) && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                      {ex.easier_name && (
                        <span
                          onClick={e => { e.stopPropagation(); scrollTo(ex.easier_id!); }}
                          style={{ fontSize: '0.65rem', color: '#10b981', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '45%' }}
                        >↓ {ex.easier_name}</span>
                      )}
                      {ex.harder_name && (
                        <span
                          onClick={e => { e.stopPropagation(); scrollTo(ex.harder_id!); }}
                          style={{ fontSize: '0.65rem', color: '#f59e0b', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '45%' }}
                        >↑ {ex.harder_name}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Sin resultados para &quot;{query}&quot;
            </div>
          )}
        </div>
      </main>

      {/* Video modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '28rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 700, fontSize: '1rem' }}>{modal.name}</span>
              <button onClick={() => setModal(null)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Video */}
              {getYtId(modal.video_url) && (
                <div style={{ position: 'relative', width: '100%', paddingBottom: '177.78%' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${getYtId(modal.video_url)}?autoplay=1&loop=1&playlist=${getYtId(modal.video_url)}&rel=0`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              )}

              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

                {/* Description */}
                {modal.description && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>Descripción</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {modal.description.replace(/\*\*/g, '')}
                    </p>
                  </div>
                )}

                {/* Muscles */}
                {parseMuscles(modal.muscles).length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>Músculos</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {parseMuscles(modal.muscles).map((m, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '999px', padding: '0.15rem 0.5rem', color: 'var(--text-secondary)' }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progression */}
                {(modal.easier_id || modal.harder_id) && (
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>Progresión</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {modal.easier_id && modal.easier_name && (
                        <button
                          onClick={() => scrollTo(modal.easier_id!)}
                          style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.625rem', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <p style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>↓ Más fácil</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{modal.easier_name}</p>
                        </button>
                      )}
                      {modal.harder_id && modal.harder_name && (
                        <button
                          onClick={() => scrollTo(modal.harder_id!)}
                          style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.625rem', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <p style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>↑ Más difícil</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{modal.harder_name}</p>
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
