"use client"

import BottomBar from "./BottomBar";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, Info, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useLang } from "@/lib/i18n/LangContext";
import { exerciseDisplayName, bodyPartLabel, equipmentLabel } from "@/lib/i18n/exerciseLabels";
import LoginSelector from "../LoginSelector";
import { PAGE_BG, CARD_BG, TEXT, TEXT_MUTED, ACCENT_STRONG, BORDER, card, input } from "./shared";

interface Item {
  id: number;
  name: string;
  body_part: string | null;
  equipment: string | null;
  is_global: number;
  hidden: number;
  image_url: string | null;
}

// Editor: ver todos los ejercicios (también los ocultos), ocultar/mostrar y borrar propios
export default function ExerciseEditor() {
  const { user } = useUser();
  const { lang } = useLang();
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [bodyFilter, setBodyFilter] = useState("");
  const [equipFilter, setEquipFilter] = useState("");
  const [showHidden, setShowHidden] = useState(true);
  const [error, setError] = useState("");
  // Fila con el nombre en edición (id) y el texto que se está escribiendo
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  // Descripciones abiertas (ids) y las ya pedidas (undefined = no pedida, null = sin texto)
  const [infoIds, setInfoIds] = useState<number[]>([]);
  const [descriptions, setDescriptions] = useState<Record<number, string | null>>({});

  // La descripción se pide al abrirla y se recuerda; cerrar no borra lo ya pedido
  const toggleInfo = (id: number) => {
    setInfoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (id in descriptions || !user) return;
    fetch(`/api/free/exercises/${id}/detail?lang=${lang}`, { headers: { "x-user-id": String(user.id) } })
      .then(r => r.json())
      .then(d => setDescriptions(prev => ({ ...prev, [id]: d?.instructions ?? null })));
  };

  const headers = user ? { "x-user-id": String(user.id) } : undefined;

  const load = async () => {
    if (!user) return;
    const r = await fetch(`/api/free/exercises?all=1&lang=${lang}`, { headers });
    const d = await r.json();
    setItems(Array.isArray(d) ? d : []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, lang]);

  // Sin búsqueda ni filtros se listan todos; cada criterio solo acota la lista
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(e => {
      if (!showHidden && e.hidden) return false;
      if (bodyFilter && e.body_part !== bodyFilter) return false;
      if (equipFilter && e.equipment !== equipFilter) return false;
      if (!q) return true;
      return exerciseDisplayName(e, lang).toLowerCase().includes(q) || e.name.toLowerCase().includes(q);
    });
  }, [items, query, bodyFilter, equipFilter, showHidden, lang]);

  // Valores que existen de verdad, para no ofrecer filtros vacíos
  const bodyOptions = useMemo(() => [...new Set(items.map(e => e.body_part).filter((v): v is string => !!v))].sort(), [items]);
  const equipOptions = useMemo(() => [...new Set(items.map(e => e.equipment).filter((v): v is string => !!v))].sort(), [items]);

  const startEdit = (e: Item) => {
    setEditingId(e.id);
    setDraft(exerciseDisplayName(e, lang));
  };

  // Guarda solo el nombre del idioma activo. Dejar vacío borra esa traducción (vuelve al inglés).
  const commitEdit = async (e: Item) => {
    const current = exerciseDisplayName(e, lang);
    setEditingId(null);
    if (draft.trim() === current) return;
    const res = await fetch(`/api/free/exercises/${e.id}`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft, lang }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "No se pudo guardar el nombre"); return; }
    setError("");
    load();
  };

  const toggleHidden = async (e: Item) => {
    const res = await fetch(`/api/free/exercises/${e.id}`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !e.hidden }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "No se pudo cambiar"); return; }
    setError("");
    load();
  };

  const remove = async (e: Item) => {
    if (!window.confirm(`¿Borrar "${e.name}" y todas sus series? No se puede deshacer.`)) return;
    const res = await fetch(`/api/free/exercises/${e.id}`, { method: "DELETE", headers });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "No se pudo borrar"); return; }
    setError("");
    load();
  };

  if (!user) return <LoginSelector />;

  return (
    <div style={{ minHeight: '100dvh', background: PAGE_BG }}>
      <main style={{ minHeight: '100dvh', color: TEXT, maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/libre" aria-label="Volver" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD_BG, color: TEXT_MUTED, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <ChevronLeft size={20} />
          </Link>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: 0 }}>{user.name}</p>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: ACCENT_STRONG, margin: 0, lineHeight: 1.1 }}>Editar ejercicios</h1>
          </div>
          <Link href="/libre/ejercicios/nuevo" aria-label="Crear ejercicio" title="Crear ejercicio"
            style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD_BG, color: TEXT, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <PlusCircle size={20} />
          </Link>
        </header>

        <section style={card}>
          <input placeholder="Buscar ejercicio" value={query} onChange={e => setQuery(e.target.value)} style={input} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.6rem' }}>
            <select value={bodyFilter} onChange={e => setBodyFilter(e.target.value)} aria-label="Filtrar por zona del cuerpo"
              style={{ ...input, padding: '0.45rem 0.5rem', fontSize: '0.8rem' }}>
              <option value="">Todas las zonas</option>
              {bodyOptions.map(v => <option key={v} value={v}>{bodyPartLabel(v, lang)}</option>)}
            </select>
            <select value={equipFilter} onChange={e => setEquipFilter(e.target.value)} aria-label="Filtrar por equipo"
              style={{ ...input, padding: '0.45rem 0.5rem', fontSize: '0.8rem' }}>
              <option value="">Todo el equipo</option>
              {equipOptions.map(v => <option key={v} value={v}>{equipmentLabel(v, lang)}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem', color: TEXT_MUTED }}>
            <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} />
            Mostrar ocultos
          </label>
          {error && <p style={{ color: '#e05555', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
        </section>

        <section style={{ ...card, padding: '0.5rem 1rem' }}>
          {visible.length === 0 && <p style={{ padding: '0.75rem 0', fontSize: '0.9rem' }}>Sin resultados.</p>}
          {visible.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', borderBottom: `1px solid ${BORDER}`, opacity: e.hidden ? 0.5 : 1 }}>
              <img src={e.image_url ?? "/exercise-placeholder.svg"} alt="" loading="lazy"
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '0.5rem', background: '#f5f5f5', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === e.id ? (
                  // Edición: solo el nombre del idioma activo. Enter o salir del campo guarda; Escape cancela.
                  <input autoFocus value={draft} onChange={ev => setDraft(ev.target.value)}
                    onBlur={() => commitEdit(e)}
                    onKeyDown={ev => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); if (ev.key === "Escape") setEditingId(null); }}
                    placeholder={e.name}
                    style={{ ...input, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} />
                ) : (
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exerciseDisplayName(e, lang)}{e.is_global ? "" : " (mío)"}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: '0.75rem', color: TEXT_MUTED }}>
                  {bodyPartLabel(e.body_part, lang)}{e.equipment ? ` · ${equipmentLabel(e.equipment, lang)}` : ""}
                </p>
                {/* Descripción del ejercicio, plegada por defecto; se pide al abrirla */}
                {infoIds.includes(e.id) && (
                  <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.7rem', borderRadius: '0.7rem', background: '#fafafa', border: `1px solid ${BORDER}`, fontSize: '0.8rem', lineHeight: 1.45, color: TEXT, whiteSpace: 'pre-line' }}>
                    {descriptions[e.id] === undefined && <span style={{ color: TEXT_MUTED }}>Cargando...</span>}
                    {descriptions[e.id] === null && <span style={{ color: TEXT_MUTED }}>Sin descripción.</span>}
                    {descriptions[e.id] ? descriptions[e.id] : null}
                  </div>
                )}
              </div>
              <button onClick={() => toggleInfo(e.id)} aria-label="Ver descripción" aria-expanded={infoIds.includes(e.id)} title="Descripción"
                style={{ background: 'none', border: 'none', color: infoIds.includes(e.id) ? ACCENT_STRONG : TEXT_MUTED, cursor: 'pointer', padding: '0.3rem', display: 'flex' }}>
                <Info size={16} />
              </button>
              {editingId !== e.id && e.is_global ? (
                <button onClick={() => startEdit(e)} aria-label="Editar nombre" title="Editar nombre"
                  style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: '0.3rem', display: 'flex' }}>
                  <Pencil size={16} />
                </button>
              ) : null}
              <button onClick={() => toggleHidden(e)} aria-label={e.hidden ? "Mostrar" : "Ocultar"} title={e.hidden ? "Mostrar en la lista" : "Ocultar de la lista"}
                style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', padding: '0.3rem', display: 'flex' }}>
                {e.hidden ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              {!e.is_global && (
                <button onClick={() => remove(e)} aria-label="Borrar" title="Borrar"
                  style={{ background: 'none', border: 'none', color: '#e05555', cursor: 'pointer', padding: '0.3rem', display: 'flex' }}>
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </section>
      </main>
      <BottomBar />
    </div>
  );
}
