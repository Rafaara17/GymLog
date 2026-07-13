//
// charts.js — Gráficos em SVG puro (sem dependências): volume semanal (barras
// empilhadas), 1RM estimado (linha), carga máxima (barras) e mapa de atividade
// estilo GitHub. Usam variáveis CSS para acompanhar o tema.
//

import { dayMonth } from "./format.js";

// Cores por tipo de treino (System Colors do iOS) + cardio (rosa Fitness).
export const CARDIO_COLOR = "#FF375F";
export const TYPE_COLORS = {
  Push: "#0A84FF", Pull: "#30D158", Upper: "#FF9F0A", Lower: "#BF5AF2",
  Cardio: CARDIO_COLOR,
};

const W = 360, H = 240;
const PAD = { l: 38, r: 12, t: 12, b: 30 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

function niceMax(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function fmtK(v) {
  if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(Math.round(v));
}

function svgOpen() {
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">`;
}

function yAxis(max) {
  let out = "";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (max / steps) * i;
    const y = PAD.t + plotH - (val / max) * plotH;
    out += `<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}" class="grid"/>`;
    out += `<text x="${PAD.l - 6}" y="${(y + 3).toFixed(1)}" class="axis-label" text-anchor="end">${fmtK(val)}</text>`;
  }
  return out;
}

function xLabels(items, labelFn) {
  // Mostra no máximo ~5 rótulos para não poluir.
  const n = items.length;
  const stride = Math.max(1, Math.ceil(n / 5));
  let out = "";
  items.forEach((it, i) => {
    if (i % stride !== 0 && i !== n - 1) return;
    const x = PAD.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    out += `<text x="${x.toFixed(1)}" y="${H - 10}" class="axis-label" text-anchor="middle">${labelFn(it)}</text>`;
  });
  return out;
}

function empty(msg) {
  return `<div class="chart-empty">${msg}</div>`;
}

// ── Mapa de atividade estilo GitHub (quadradinhos por dia) ─────────────────
const MES_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DOW_ABBR = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Nível de intensidade 0–4 a partir do volume do dia (0 = folga).
function activityLevel(day, maxVolume) {
  if (day.count <= 0) return 0;
  const ratio = maxVolume > 0 ? day.volume / maxVolume : 1;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function heatmapChart(weeks) {
  if (!weeks.length) return empty("Sem dados.");

  const cell = 13, gap = 3, rows = 7;
  const leftPad = 24; // espaço para rótulos dos dias da semana
  const topPad = 16;  // espaço para rótulos dos meses
  const step = cell + gap;
  const w = leftPad + weeks.length * step;
  const h = topPad + rows * step;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const maxVolume = Math.max(0, ...weeks.flatMap((wk) => wk.days.map((d) => d.volume)));

  let cells = "", months = "";
  let lastMonth = -1;
  weeks.forEach((wk, ci) => {
    const x = leftPad + ci * step;
    // Rótulo do mês ao mudar de mês (na primeira semana onde o mês aparece).
    const m = new Date(wk.days[0].date).getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      months += `<text x="${x}" y="10" class="hm-label">${MES_ABBR[m]}</text>`;
    }
    wk.days.forEach((d, ri) => {
      if (d.date > todayMs) return; // não desenha dias futuros (grade termina hoje)
      const y = topPad + ri * step;
      const lvl = activityLevel(d, maxVolume);
      const date = new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      const tip = d.count > 0 ? `${date}: ${d.count} treino${d.count > 1 ? "s" : ""} · ${fmtK(d.volume)} kg` : `${date}: sem treino`;
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" class="hm hm-${lvl}"><title>${tip}</title></rect>`;
    });
  });

  // Rótulos seg/qua/sex (linhas 1, 3, 5), como no GitHub.
  let dows = "";
  [1, 3, 5].forEach((ri) => {
    const y = topPad + ri * step + cell - 3;
    dows += `<text x="0" y="${y}" class="hm-label">${DOW_ABBR[ri]}</text>`;
  });

  return `<svg class="heatmap-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${months}${dows}${cells}</svg>`;
}

// ── Volume semanal por tipo (barras empilhadas) ───────────────────────────
export function volumeChart(data) {
  if (!data.length) return empty("Sem dados.");

  // Agrupa por semana preservando ordem; soma por tipo.
  const weeks = [];
  const byWeek = new Map();
  for (const d of data) {
    if (!byWeek.has(d.weekStart)) { byWeek.set(d.weekStart, { weekStart: d.weekStart, types: {} }); weeks.push(byWeek.get(d.weekStart)); }
    byWeek.get(d.weekStart).types[d.type] = (byWeek.get(d.weekStart).types[d.type] || 0) + d.volume;
  }
  weeks.sort((a, b) => a.weekStart - b.weekStart);

  const totals = weeks.map((w) => Object.values(w.types).reduce((s, v) => s + v, 0));
  const max = niceMax(Math.max(...totals));
  const n = weeks.length;
  const slot = plotW / n;
  const barW = Math.min(34, slot * 0.6);

  let bars = "";
  weeks.forEach((w, i) => {
    const cx = PAD.l + slot * (i + 0.5);
    let acc = 0;
    for (const type of Object.keys(TYPE_COLORS)) {
      const v = w.types[type];
      if (!v) continue;
      const h = (v / max) * plotH;
      const y = PAD.t + plotH - acc - h;
      bars += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" fill="${TYPE_COLORS[type]}" rx="2"/>`;
      acc += h;
    }
  });

  const labels = xLabels(weeks, (w) => dayMonth(w.weekStart));

  // Legenda dos tipos presentes.
  const present = Object.keys(TYPE_COLORS).filter((t) => weeks.some((w) => w.types[t]));
  const legend = present.map((t) =>
    `<span class="legend-item"><span class="legend-dot" style="background:${TYPE_COLORS[t]}"></span>${t}</span>`
  ).join("");

  return `${svgOpen()}${yAxis(max)}${bars}${labels}</svg><div class="legend">${legend}</div>`;
}

// ── 1RM estimado (linha + pontos) ─────────────────────────────────────────
export function lineChart(data) {
  if (!data.length) return empty("Sem dados para este exercício.");
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const n = data.length;
  const xOf = (i) => PAD.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yOf = (v) => PAD.t + plotH - (v / max) * plotH;

  const pts = data.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.value).toFixed(1)}`).join(" ");
  const area = `${PAD.l},${(PAD.t + plotH).toFixed(1)} ${pts} ${(PAD.l + plotW).toFixed(1)},${(PAD.t + plotH).toFixed(1)}`;
  const dots = data.map((d, i) => `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(d.value).toFixed(1)}" r="3" class="dot"/>`).join("");
  const labels = xLabels(data, (d) => dayMonth(d.date));

  return `${svgOpen()}${yAxis(max)}<polygon points="${area}" class="area"/><polyline points="${pts}" class="line"/>${dots}${labels}</svg>`;
}

// ── Carga máxima por dia (barras) ─────────────────────────────────────────
export function barChart(data) {
  if (!data.length) return empty("Sem dados para este exercício.");
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const n = data.length;
  const slot = plotW / n;
  const barW = Math.min(30, slot * 0.6);

  const bars = data.map((d, i) => {
    const cx = PAD.l + slot * (i + 0.5);
    const h = (d.value / max) * plotH;
    const y = PAD.t + plotH - h;
    return `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" class="bar" rx="2"/>`;
  }).join("");
  const labels = xLabels(data, (d) => dayMonth(d.date));

  return `${svgOpen()}${yAxis(max)}${bars}${labels}</svg>`;
}
