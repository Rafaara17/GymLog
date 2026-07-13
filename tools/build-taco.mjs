//
// build-taco.mjs — gera docs/js/data/taco.js a partir da tabela TACO.
//
// Fonte: TACO 4ª edição (NEPA/UNICAMP), via JSON público em
// https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/TACO.json
// (cópia local em tools/taco-source.json — baixada na primeira execução).
//
// Uso: node tools/build-taco.mjs
//
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_URL = "https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/TACO.json";
const SOURCE_FILE = join(ROOT, "tools", "taco-source.json");
const OUT_FILE = join(ROOT, "docs", "js", "data", "taco.js");

// "NA", "Tr" (traço) e vazio contam como zero.
function num(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : 0;
}

async function loadSource() {
  if (!existsSync(SOURCE_FILE)) {
    console.log(`Baixando ${SOURCE_URL} ...`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`Download falhou: HTTP ${res.status}`);
    writeFileSync(SOURCE_FILE, await res.text());
  }
  return JSON.parse(readFileSync(SOURCE_FILE, "utf8"));
}

const source = await loadSource();
if (!Array.isArray(source) || source.length < 500) {
  throw new Error(`Fonte inesperada: ${Array.isArray(source) ? source.length + " itens" : typeof source}`);
}

const rows = source.map((item) => {
  const name = String(item.description || "").trim();
  const category = String(item.category || "").trim();
  if (!name) throw new Error(`Item sem nome: ${JSON.stringify(item).slice(0, 80)}`);
  return [name, category, num(item.energy_kcal), num(item.protein_g), num(item.carbohydrate_g), num(item.lipid_g)];
});

const body = rows.map((r) => `  ${JSON.stringify(r)},`).join("\n");
const out = `//
// taco.js — Tabela Brasileira de Composição de Alimentos (TACO, 4ª ed., NEPA/UNICAMP).
// Valores por 100 g: [nome, categoria, kcal, proteína_g, carboidrato_g, gordura_g].
// GERADO por tools/build-taco.mjs — não editar à mão.
//
export const TACO = [
${body}
];
`;

writeFileSync(OUT_FILE, out);
console.log(`OK: ${rows.length} alimentos → ${OUT_FILE} (${(out.length / 1024).toFixed(0)} KB)`);
