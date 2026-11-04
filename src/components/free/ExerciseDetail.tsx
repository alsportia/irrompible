"use client"

import BottomBar from "./BottomBar";
import { useLang } from "@/lib/i18n/LangContext";
import { exerciseDisplayName } from "@/lib/i18n/exerciseLabels";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUser } from "@/lib/userContext";
import LoginSelector from "../LoginSelector";
import {
  PAGE_BG, CARD_BG, TEXT, TEXT_MUTED, ACCENT, ACCENT_STRONG, ACCENT_SOFT, BORDER,
  card, input, PERIOD_LABEL, Period, periodTitle, rowsInPeriod, ProgressChart, ProgressRow,
} from "./shared";

// Gráfica de un ejercicio con navegación de periodos (misma lógica que en Registro libre)
export default function ExerciseDetail({ exerciseId }: { exerciseId: number }) {
  const { user } = useUser();
  const { lang } = useLang();
  const [name, setName] = useState<string>("");
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [period, setPeriod] = useState<Period>("week");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!user) return;
    const h = { "x-user-id": String(user.id) };
    fetch(`/api/free/progress?exerciseId=${exerciseId}`, { headers: h })
      .then(r => r.json())
      .then(d => setProgress(Array.isArray(d) ? d : []));
    fetch(`/api/free/exercises?lang=${lang}`, { headers: h })
      .then(r => r.json())
      .then((list: { id: number; name: string }[]) => {
        const found = Array.isArray(list) ? list.find(e => e.id === exerciseId) : undefined;
        setName(found ? exerciseDisplayName(found, lang) : "");
      });
  }, [user, exerciseId, lang]);

  if (!user) return <LoginSelector />;

  const periodRows = rowsInPeriod(progress, period, offset);

  return (
    <div style={{ minHeight: '100dvh', background: PAGE_BG }}>
      <main style={{ minHeight: '100dvh', color: TEXT, maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/libre/ejercicios" aria-label="Volver" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD_BG, color: TEXT_MUTED, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <ChevronLeft size={20} />
          </Link>
          <div>
            <p style={{ fontSize: '0.8rem', color: TEXT_MUTED, margin: 0 }}>Progresión</p>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: ACCENT_STRONG, margin: 0, lineHeight: 1.15 }}>{name || "Ejercicio"}</h1>
          </div>
        </header>

        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button onClick={() => setOffset(o => o - 1)} aria-label="Periodo anterior"
              style={{ ...input, width: 'auto', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', textAlign: 'center', textTransform: 'capitalize' }}>{periodTitle(period, offset)}</span>
            <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset >= 0} aria-label="Periodo siguiente"
              style={{ ...input, width: 'auto', padding: '0.3rem 0.6rem', cursor: offset >= 0 ? 'not-allowed' : 'pointer', opacity: offset >= 0 ? 0.4 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>

          <ProgressChart rows={progress} period={period} offset={offset} />

          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            {(["week", "month", "year"] as Period[]).map(p => (
              <button key={p} onClick={() => { setPeriod(p); setOffset(0); }}
                style={{ ...input, width: 'auto', flex: 1, padding: '0.4rem 0', textAlign: 'center', cursor: 'pointer', fontWeight: period === p ? 700 : 400, background: period === p ? ACCENT_SOFT : '#fafafa', color: period === p ? ACCENT_STRONG : TEXT, borderColor: period === p ? ACCENT : BORDER }}>
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>

          {periodRows.length > 0 && (
            <table style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: TEXT_MUTED, textAlign: 'left' }}>
                  <th style={{ padding: '0.3rem 0' }}>Fecha</th>
                  <th>1RM</th>
                  <th>Peso máx.</th>
                  <th>Series</th>
                  <th>Reps</th>
                </tr>
              </thead>
              <tbody>
                {[...periodRows].sort((a, b) => b.session_date.localeCompare(a.session_date)).map(r => (
                  <tr key={r.session_date} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '0.3rem 0' }}>{r.session_date}</td>
                    <td>{r.best_one_rm != null ? `${Number(r.best_one_rm).toFixed(1)} kg` : "—"}</td>
                    <td>{Number(r.max_weight) > 0 ? `${r.max_weight} kg` : "—"}</td>
                    <td>{r.sets}</td>
                    <td>{r.total_reps ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <BottomBar />
      </main>
    </div>
  );
}
