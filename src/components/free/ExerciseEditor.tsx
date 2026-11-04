"use client"

import BottomBar from "./BottomBar";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, PlusCircle, Trash2 } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useLang } from "@/lib/i18n/LangContext";
import { exerciseDisplayName, bodyPartLabel, equipmentLabel } from "@/lib/i18n/exerciseLabels";
import LoginSelector from "../LoginSelector";
import { PAGE_BG, CARD_BG, TEXT, TEXT_MUTED, ACCENT_STRONG, BORDER, card, input } from "./shared";

interface Item {
  id: number;
  name: string;
  name_es: string | null;
  name_en: string | null;
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
  const [showHidden, setShowHidden] = useState(true);
  const [error, setError] = useState("");

  const headers = user ? { "x-user-id": String(user.id) } : undefined;

  const load = async () => {
    if (!user) return;
    const r = await fetch(`/api/free/exercises?all=1&lang=${lang}`, { headers });
    const d = await r.json();
    setItems(Array.isArray(d) ? d : []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, lang]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(e => {
      if (!showHidden && e.hidden) return false;
      if (!q) return true;
      return exerciseDisplayName(e, lang).toLowerCase().includes(q) || e.name.toLowerCase().includes(q);
    });
  }, [items, query, showHidden, lang]);

  // Guarda la traducción de un nombre en un idioma. Vacío borra esa traducción.
  const saveName = async (e: Item, which: "es" | "en", value: string) => {
    const res = await fetch(`/api/free/exercises/${e.id}`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ text: value, lang: which }),
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
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exerciseDisplayName(e, lang)}{e.is_global ? "" : " (mío)"}
                </p>
                {/* Nombres por idioma: se guardan al salir del campo, sin tocar el original del dataset */}
                {e.is_global ? (
                  <div style={{ display: 'grid', gap: '0.25rem', marginTop: '0.35rem' }}>
                    {(["es", "en"] as const).map(which => (
                      <label key={which} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: TEXT_MUTED }}>
                        <span style={{ width: '1.6rem', fontWeight: 700 }}>{which.toUpperCase()}</span>
                        <input defaultValue={(which === "es" ? e.name_es : e.name_en) ?? ""} placeholder={e.name}
                          onBlur={ev => { const v = ev.target.value; const current = (which === "es" ? e.name_es : e.name_en) ?? ""; if (v !== current) saveName(e, which, v); }}
                          style={{ ...input, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} />
                      </label>
                    ))}
                  </div>
                ) : null}
                <p style={{ margin: 0, fontSize: '0.75rem', color: TEXT_MUTED }}>
                  {bodyPartLabel(e.body_part, lang)}{e.equipment ? ` · ${equipmentLabel(e.equipment, lang)}` : ""}
                </p>
              </div>
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
        <BottomBar />
      </main>
    </div>
  );
}
