"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Settings } from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { ACCENT, ACCENT_STRONG, CARD_BG, TEXT, TEXT_MUTED } from "./shared";

// Barra inferior fija del módulo Entrenamiento libre: siempre visible, por encima del contenido.
// Accesos: inicio del módulo, progresiones, calendario, editar ejercicios e idioma.
function ProgressIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="12" width="4" height="8" rx="0.5" fill={color} stroke="none" />
      <rect x="10" y="8" width="4" height="12" rx="0.5" fill={color} stroke="none" />
      <rect x="17" y="4" width="4" height="16" rx="0.5" fill={color} stroke="none" />
      <path d="M3 10 L9 6 L14 9 L21 3" />
      <path d="M16 3 L21 3 L21 8" />
    </svg>
  );
}

export default function BottomBar() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();

  const items = [
    { href: "/libre", label: "Registro", icon: <Home size={22} /> },
    { href: "/libre/ejercicios", label: "Progresiones", icon: <ProgressIcon color="currentColor" /> },
    { href: "/libre/calendario", label: "Calendario", icon: <CalendarDays size={22} /> },
    { href: "/libre/editar", label: "Ejercicios", icon: <Settings size={22} /> },
  ];

  const active = (href: string) => pathname === href || (href !== "/libre" && pathname.startsWith(href));

  return (
    <nav aria-label="Entrenamiento libre"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom))', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%', maxWidth: '26rem', background: CARD_BG, borderRadius: '999px', padding: '0.4rem', boxShadow: '0 6px 24px rgba(0,0,0,0.14)' }}>
        {items.map(it => {
          const on = active(it.href);
          return (
            <Link key={it.href} href={it.href} aria-label={it.label} aria-current={on ? "page" : undefined}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', padding: '0.35rem 0', borderRadius: '999px', textDecoration: 'none', color: on ? ACCENT_STRONG : TEXT_MUTED, background: on ? '#fff1e0' : 'transparent', fontSize: '0.62rem', fontWeight: on ? 700 : 500 }}>
              {it.icon}
              <span>{it.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setLang(lang === "es" ? "en" : "es")} aria-label="Cambiar idioma de los ejercicios" title="Idioma de los ejercicios"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', padding: '0.35rem 0', borderRadius: '999px', border: 'none', background: 'transparent', color: TEXT, cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700 }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: ACCENT }}>{lang === "es" ? "ES" : "EN"}</span>
          <span>Idioma</span>
        </button>
      </div>
    </nav>
  );
}
