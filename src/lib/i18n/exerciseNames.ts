// Traducción de nombres de ejercicio (inglés del dataset -> castellano).
// Se aplica por reglas en orden: primero frases completas, después términos sueltos.
// Si no hay regla que encaje, se devuelve el nombre original para no inventar nada.

// Frases completas que se traducen de una vez (tienen prioridad)
const PHRASES: [RegExp, string][] = [
  [/\bbarbell bench press\b/gi, "press de banca con barra"],
  [/\bdumbbell bench press\b/gi, "press de banca con mancuernas"],
  [/\bbarbell squat\b/gi, "sentadilla con barra"],
  [/\bbarbell deadlift\b/gi, "peso muerto con barra"],
  [/\bbarbell bent over row\b/gi, "remo con barra"],
  [/\bdumbbell lateral raise\b/gi, "elevación lateral con mancuernas"],
  [/\bdumbbell bicep curl\b/gi, "curl de bíceps con mancuernas"],
  [/\bdumbbell curl\b/gi, "curl con mancuernas"],
  [/\bbody weight\b/gi, "peso corporal"],
  [/\bstanding\b/gi, "de pie"],
  [/\bseated\b/gi, "sentado"],
  [/\blying\b/gi, "tumbado"],
  [/\bkneeling\b/gi, "de rodillas"],
  [/\bincline\b/gi, "inclinado"],
  [/\bdecline\b/gi, "declinado"],
  [/\bpreacher\b/gi, "predicador"],
  [/\bhammer\b/gi, "martillo"],
  [/\breverse\b/gi, "inverso"],
  [/\bclose[- ]grip\b/gi, "agarre cerrado"],
  [/\bwide[- ]grip\b/gi, "agarre ancho"],
  [/\bstraight\b/gi, "recto"],
  [/\bbent over\b/gi, "inclinado"],
  [/\bcable\b/gi, "polea"],
  [/\bbarbell\b/gi, "barra"],
  [/\bdumbbells?\b/gi, "mancuerna"],
  [/\bband\b/gi, "banda"],
  [/\bbodyweight\b/gi, "peso corporal"],
  [/\bpull[- ]?ups?\b/gi, "dominadas"],
  [/\bchin[- ]?ups?\b/gi, "dominadas supinas"],
  [/\bpush[- ]?ups?\b/gi, "flexiones"],
  [/\bsit[- ]?ups?\b/gi, "abdominales"],
  [/\bcrunch(es)?\b/gi, "crunch"],
  [/\bcurl(s)?\b/gi, "curl"],
  [/\bpress(es)?\b/gi, "press"],
  [/\braise(s)?\b/gi, "elevación"],
  [/\bfly\b/gi, "aperturas"],
  [/\bflyes?\b/gi, "aperturas"],
  [/\bextension(s)?\b/gi, "extensión"],
  [/\bsquat(s)?\b/gi, "sentadilla"],
  [/\blunge(s)?\b/gi, "zancada"],
  [/\bdeadlift(s)?\b/gi, "peso muerto"],
  [/\brow(s)?\b/gi, "remo"],
  [/\bpulldown(s)?\b/gi, "jalón"],
  [/\bpullover(s)?\b/gi, "pullover"],
  [/\bshrug(s)?\b/gi, "encogimiento"],
  [/\bdip(s)?\b/gi, "fondos"],
  [/\bcalf raise(s)?\b/gi, "elevación de gemelos"],
  [/\bcalf\b/gi, "gemelo"],
  [/\bbiceps?\b/gi, "bíceps"],
  [/\btriceps?\b/gi, "tríceps"],
  [/\bshoulder\b/gi, "hombro"],
  [/\bchest\b/gi, "pecho"],
  [/\bback\b/gi, "espalda"],
  [/\bleg(s)?\b/gi, "pierna"],
  [/\bwrist\b/gi, "muñeca"],
  [/\bforearm\b/gi, "antebrazo"],
  [/\bhip\b/gi, "cadera"],
  [/\bknee\b/gi, "rodilla"],
  [/\bstretch\b/gi, "estiramiento"],
  [/\bwith\b/gi, "con"],
  [/\bon\b/gi, "en"],
  [/\bover\b/gi, "sobre"],
  [/\band\b/gi, "y"],
  [/\bone arm\b/gi, "a un brazo"],
  [/\bone leg\b/gi, "a una pierna"],
  [/\balternate\b/gi, "alterno"],
  [/\bexercise\b/gi, "ejercicio"],
  [/\bbench\b/gi, "banco"],
  [/\bball\b/gi, "balón"],
  [/\brope\b/gi, "cuerda"],
  [/\bstability\b/gi, "de estabilidad"],
  [/\bassisted\b/gi, "asistido"],
  [/\bmale\b/gi, ""],
  [/\(\s*\)/g, ""],
];

// Palabras que delatan una traducción incompleta: si quedan, se usa el nombre original
const ENGLISH_LEFTOVERS = /\b(arm|legs?|heel|ankle|circles?|touchers?|slingers?|hanging|straight|bent|back|head|blaster|with|on|of|the|and|squad|stretch|alternate|lateral|pulldown|pushdown|pull|up|down|two|rope|sz-bar|v-bar|reverse|grip|incline|decline|tricep|triceps|bench)\b/i;

// Nombre en castellano, o el original si la traducción por reglas no queda limpia
export function translateExerciseName(name: string): string {
  let out = name;
  for (const [re, to] of PHRASES) out = out.replace(re, to);
  // Limpieza: espacios sobrantes y paréntesis vacíos tras eliminar términos
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([,)])/g, "$1").replace(/\(\s+/g, "(").trim();
  if (!out || ENGLISH_LEFTOVERS.test(out)) return name;
  // Primera letra en mayúscula
  return out.charAt(0).toUpperCase() + out.slice(1);
}
