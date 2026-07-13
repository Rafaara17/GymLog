//
// format.js — Formatadores e fórmulas (datas, peso, duração, Epley).
//

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// 1RM estimado (Epley) = peso × (1 + reps / 30). reps == 0 → 0.
export function epley(weightKg, reps) {
  if (reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

// TMB (Mifflin-St Jeor): 10·peso + 6.25·altura − 5·idade, +5 (M) ou −161 (F).
export function mifflinStJeor(weightKg, heightCm, age, sex) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "F" ? base - 161 : base + 5;
}

// "1.840 kcal" (milhar no padrão pt-BR).
export function kcal(v) {
  return `${Math.round(v).toLocaleString("pt-BR")} kcal`;
}

// "150 g" se inteiro, senão "12,5 g" (uma casa decimal).
export function grams(v) {
  const r = Math.round(v * 10) / 10;
  return `${r.toLocaleString("pt-BR")} g`;
}

// "82 kg" se inteiro, senão "82.5 kg" (uma casa decimal).
export function weight(kg) {
  if (Math.round(kg) === kg) return `${kg.toFixed(0)} kg`;
  return `${kg.toFixed(1)} kg`;
}

// "1h 12min", "48min" ou "45s" a partir de segundos.
export function duration(seconds) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min`;
  return `${secs}s`;
}

// ISO 8601 com precisão de segundos (sem milissegundos), igual ao formato do CSV.
export function isoString(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Data média localizada, ex.: "22 de jun. de 2026".
export function shortDate(ms) {
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// Data + hora curtas, ex.: "22/06/2026 14:03".
export function dateTime(ms) {
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// "Junho 2026" (mês por extenso capitalizado + ano).
export function monthYear(ms) {
  const d = new Date(ms);
  const nome = MESES[d.getMonth()];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${d.getFullYear()}`;
}

// Nome do dia/mês para rótulos curtos de gráfico, ex.: "22/06".
export function dayMonth(ms) {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Início do dia (00:00 local) em ms.
export function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Início da semana (domingo, padrão pt-BR/iOS) em ms.
export function startOfWeek(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // getDay(): 0 = domingo
  return d.getTime();
}

// Chave AAAA-MM-DD a partir do ano/mês para agrupar por mês.
export function monthKey(ms) {
  const d = new Date(ms);
  return d.getFullYear() * 12 + d.getMonth();
}
