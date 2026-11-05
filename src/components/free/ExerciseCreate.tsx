"use client"

import BottomBar from "./BottomBar";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useUser } from "@/lib/userContext";
import { bodyPartLabel, equipmentLabel } from "@/lib/i18n/exerciseLabels";
import { useLang } from "@/lib/i18n/LangContext";
import LoginSelector from "../LoginSelector";
import { PAGE_BG, CARD_BG, TEXT, TEXT_MUTED, ACCENT_STRONG, card, input } from "./shared";

// Zonas y equipos que usa el catálogo (mismos valores que el dataset)
const BODY_PARTS = ["upper arms", "lower arms", "back", "chest", "shoulders", "upper legs", "lower legs", "waist"];
const EQUIPMENT = ["body weight", "cable", "barbell", "dumbbell", "band", "rope", "stability ball", "medicine ball", "leverage machine", "assisted"];

const MAX_SIDE = 256;
const MAX_CHARS = 150_000;

// Redimensiona la imagen en el navegador y la devuelve como JPEG en data URL pequeña
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No se pudo procesar la imagen"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Calidad bajando hasta caber en el límite
      let q = 0.85;
      let url = canvas.toDataURL("image/jpeg", q);
      while (url.length > MAX_CHARS && q > 0.4) { q -= 0.1; url = canvas.toDataURL("image/jpeg", q); }
      url.length > MAX_CHARS ? reject(new Error("La imagen sigue siendo demasiado grande")) : resolve(url);
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

export default function ExerciseCreate() {
  const { user } = useUser();
  const { lang } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return <LoginSelector />;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      setImageData(await resizeToDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error con la imagen");
    }
  };

  const save = async () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError("");
    const headers = { "x-user-id": String(user.id), "Content-Type": "application/json" };
    const res = await fetch("/api/free/exercises", { method: "POST", headers, body: JSON.stringify({ name, bodyPart, equipment }) });
    const created = await res.json();
    if (!res.ok) { setSaving(false); setError(created.error ?? "No se pudo crear"); return; }
    // La zona, el equipo y la imagen se guardan con una segunda llamada sobre el ejercicio recién creado
    if (bodyPart || equipment || imageData) {
      const up = await fetch(`/api/free/exercises/${created.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ bodyPart, equipment, imageData: imageData ?? undefined }),
      });
      if (!up.ok) { setSaving(false); setError("Ejercicio creado, pero no se guardaron sus datos"); return; }
    }
    setSaving(false);
    router.push("/libre/editar");
  };

  return (
    <div style={{ minHeight: '100dvh', background: PAGE_BG }}>
      <main style={{ minHeight: '100dvh', color: TEXT, maxWidth: '28rem', margin: '0 auto', padding: '2rem 1.1rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/libre/editar" aria-label="Volver" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: CARD_BG, color: TEXT_MUTED, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <ChevronLeft size={20} />
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: ACCENT_STRONG, margin: 0, lineHeight: 1.1 }}>Nuevo ejercicio</h1>
        </header>

        <section style={card}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>Nombre
              <input style={{ ...input, marginTop: '0.3rem' }} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Press con mancuerna a un brazo" />
            </label>
            <label style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>Zona del cuerpo
              <select style={{ ...input, marginTop: '0.3rem' }} value={bodyPart} onChange={e => setBodyPart(e.target.value)}>
                <option value="">Sin especificar</option>
                {BODY_PARTS.map(v => <option key={v} value={v}>{bodyPartLabel(v, lang)}</option>)}
              </select>
            </label>
            <label style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>Equipo
              <select style={{ ...input, marginTop: '0.3rem' }} value={equipment} onChange={e => setEquipment(e.target.value)}>
                <option value="">Sin especificar</option>
                {EQUIPMENT.map(v => <option key={v} value={v}>{equipmentLabel(v, lang)}</option>)}
              </select>
            </label>
            <label style={{ fontSize: '0.8rem', color: TEXT_MUTED }}>Imagen (opcional)
              <input type="file" accept="image/*" onChange={e => onFile(e.target.files?.[0])} style={{ marginTop: '0.3rem', fontSize: '0.85rem' }} />
            </label>
            {imageData && (
              <img src={imageData} alt="Vista previa" style={{ width: '100%', maxHeight: '12rem', objectFit: 'contain', borderRadius: '0.8rem', background: '#f5f5f5' }} />
            )}
          </div>
        </section>

        {error && <p style={{ color: '#e05555', fontSize: '0.85rem' }}>{error}</p>}

        <button onClick={save} disabled={saving}
          style={{ ...input, background: 'linear-gradient(90deg, #ffd23f, #ffa94d)', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '999px', padding: '0.85rem', cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? "Guardando..." : "Crear ejercicio"}
        </button>
      </main>
      <BottomBar />
    </div>
  );
}
