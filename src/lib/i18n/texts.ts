import { DB } from "@/lib/db";

// Idioma pedido por el cliente en la cabecera Accept-Language o ?lang. Por defecto castellano.
export type AppLang = "es" | "en";

export function langFromRequest(req: { headers: Headers; nextUrl: URL }): AppLang {
  const q = req.nextUrl.searchParams.get("lang");
  if (q === "es" || q === "en") return q;
  const h = req.headers.get("accept-language") ?? "";
  return h.toLowerCase().startsWith("en") ? "en" : "es";
}

// Devuelve el texto de cada entidad en el idioma pedido. Si no hay traducción, usa el inglés
// (el original del dataset) y, si tampoco existe, devuelve null.
// Uso: const names = await textsFor("exercise", ids, "name", lang);  names.get(id)
export async function textsFor(
  entity: string,
  ids: number[],
  field: string,
  lang: AppLang
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (ids.length === 0) return out;
  const marks = ids.map(() => "?").join(",");
  const rows = await DB.query<{ entity_id: number; lang: string; text: string }>(
    `SELECT entity_id, lang, text FROM i18n_texts
     WHERE entity = ? AND field = ? AND entity_id IN (${marks}) AND lang IN (?, 'en')`,
    [entity, field, ...ids, lang]
  );
  // Primero el idioma pedido; el inglés solo rellena lo que falte
  for (const r of rows) if (r.lang === lang) out.set(r.entity_id, r.text);
  for (const r of rows) if (r.lang === "en" && !out.has(r.entity_id)) out.set(r.entity_id, r.text);
  return out;
}
