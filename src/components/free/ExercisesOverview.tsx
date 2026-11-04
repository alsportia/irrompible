"use client"

import BottomBar from "./BottomBar";
import { useLang } from "@/lib/i18n/LangContext";
import { exerciseDisplayName } from "@/lib/i18n/exerciseLabels";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@/lib/userContext";
import LoginSelector from "../LoginSelector";
import { PAGE_BG, CARD_BG, TEXT, TEXT_MUTED, ACCENT_STRONG, card } from "./shared";

interface Summary {
  id: number;
  name: string;
  image_url: string | null;
  last_date: string;
  last_time: string | null;
  last_reps: number | null;
  last_weight_kg: number;
  last_duration_seconds: number | null;
  last_one_rm: number | null;
  day_one_rm: number | null;
}

const GENERIC_IMAGE = "/exercise-placeholder.svg";

// Una tarjeta por ejercicio entrenado: último registro y 1RM de ese día
export default function ExercisesOverview() {
  const { user } = useUser();
  const { lang } = useLang();
  const [items, setItems] = useState<Summary[] | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/free/summary?lang=${lang}`, { headers: { "x-user-id": String(user.id) } })
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []));
  }, [user, lang]);

  if (!user) return <LoginSelector />;

  return (
    <div style={{ minHeight: '100dvh', background: PAGE_BG }}>
      <main style={{ minHeight: '100dvh', color: TEXT, maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/libre" aria-label="Volver" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD_BG, color: TEXT_MUTED, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <ChevronLeft size={20} />
          </Link>
          <div>
            <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: 0 }}>{user.name}</p>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: ACCENT_STRONG, margin: 0, lineHeight: 1.1 }}>Mis progresiones</h1>
          </div>
        </header>

        {items === null && <p style={{ color: TEXT_MUTED, fontSize: '0.9rem' }}>Cargando...</p>}
        {items && items.length === 0 && (
          <section style={card}>
            <p style={{ fontSize: '0.9rem' }}>Todavía no hay ejercicios con datos. Registra una serie en Entrenamiento libre para verlos aquí.</p>
          </section>
        )}

        {items?.map(s => (
          <Link key={s.id} href={`/libre/ejercicios/${s.id}`} style={{ ...card, display: 'flex', gap: '0.9rem', alignItems: 'center', textDecoration: 'none', color: TEXT, padding: '1rem' }}>
            <img src={s.image_url ?? GENERIC_IMAGE} alt="" loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = GENERIC_IMAGE; }}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '0.7rem', background: '#f5f5f5', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exerciseDisplayName(s, lang)}</p>
              <p style={{ fontSize: '0.78rem', color: TEXT_MUTED, margin: '0.2rem 0 0' }}>
                Último: {s.last_date}{s.last_time ? ` ${s.last_time}` : ""}
              </p>
              <p style={{ fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                {s.last_reps != null ? `${s.last_reps} reps` : ""}
                {s.last_duration_seconds != null ? ` · ${s.last_duration_seconds}s` : ""}
                {s.last_weight_kg > 0 ? ` · ${s.last_weight_kg} kg` : ""}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: '0.7rem', color: TEXT_MUTED, margin: 0 }}>1RM del día</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: ACCENT_STRONG, margin: 0 }}>
                {s.day_one_rm != null ? `${Number(s.day_one_rm).toFixed(1)}` : "—"}
              </p>
              <p style={{ fontSize: '0.7rem', color: TEXT_MUTED, margin: 0 }}>kg</p>
            </div>
          </Link>
        ))}
        <BottomBar />
      </main>
    </div>
  );
}
