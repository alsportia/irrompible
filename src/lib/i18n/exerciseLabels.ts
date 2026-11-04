// Etiquetas en castellano para los valores del dataset (body_part y equipment).
// Los valores de la base se mantienen en inglés; solo cambia cómo se muestran.

export type Lang = "es" | "en";

// Zona del cuerpo (body_part del dataset)
export const BODY_PART_LABELS: Record<string, string> = {
  "upper arms": "Brazo Sup.",
  "lower arms": "Brazo Inf.",
  "back": "Espalda",
  "chest": "Pecho",
  "shoulders": "Hombros",
  "upper legs": "Piernas",
  "lower legs": "Gemelos",
  "waist": "Cintura",
};

// Equipo usado (equipment del dataset)
export const EQUIPMENT_LABELS: Record<string, string> = {
  "dumbbell": "Mancuerna",
  "cable": "Polea",
  "barbell": "Barra",
  "body weight": "Peso corporal",
  "band": "Banda elástica",
  "assisted": "Asistido",
  "leverage machine": "Máquina",
  "stability ball": "Fitball",
  "rope": "Cuerda",
  "medicine ball": "Balón medicinal",
};

// Nombre a mostrar de un ejercicio: el castellano si existe y el idioma es "es"; si no, el original.
// Los ejercicios propios no tienen traducción y siempre muestran el nombre que escribió el usuario.
export function exerciseDisplayName(
  ex: { name: string; name_es?: string | null; is_global?: number },
  lang: Lang = "es"
): string {
  if (lang === "es" && ex.is_global && ex.name_es) return ex.name_es;
  return ex.name;
}

export function bodyPartLabel(value: string | null | undefined, lang: Lang = "es"): string {
  if (!value) return "";
  if (lang === "en") return value;
  return BODY_PART_LABELS[value] ?? value;
}

export function equipmentLabel(value: string | null | undefined, lang: Lang = "es"): string {
  if (!value) return "";
  if (lang === "en") return value;
  return EQUIPMENT_LABELS[value] ?? value;
}
