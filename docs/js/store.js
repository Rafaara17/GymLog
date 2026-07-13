//
// store.js — Camada de dados do GymLog.
//
// Modelos (Session, Exercise, WorkoutSet, ExerciseCatalog), métricas derivadas,
// operações de treino, histórico, estatísticas e exportação/importação CSV.
// Persistência local em localStorage.
//

import { epley, mifflinStJeor, isoString, startOfDay, startOfWeek, monthKey, monthYear } from "./format.js";
import { TACO } from "./data/taco.js";
import { CARDIO_ACTIVITIES } from "./data/mets.js";

const STORAGE_KEY = "gymlog.db.v1";

// Tipos de treino.
export const TRAINING_TYPES = ["Push", "Pull", "Upper", "Lower"];

// Refeições do dia.
export const MEAL_TYPES = [
  ["cafe", "Café da manhã"], ["almoco", "Almoço"],
  ["jantar", "Jantar"], ["lanche", "Lanche"],
];

// Níveis de atividade (fator multiplicador da TMB → TDEE).
export const ACTIVITY_LEVELS = [
  ["sedentario", "Sedentário", 1.2],
  ["leve", "Levemente ativo", 1.375],
  ["moderado", "Moderadamente ativo", 1.55],
  ["intenso", "Muito ativo", 1.725],
  ["atleta", "Extremamente ativo", 1.9],
];

// Objetivos (ajuste em kcal sobre o TDEE).
export const GOALS = [
  ["perder", "Perder peso", -500],
  ["manter", "Manter", 0],
  ["ganhar", "Ganhar massa", 300],
];

// Catálogo semente, inserido na primeira execução.
const CATALOG_SEED = [
  ["Supino Reto", "Push"], ["Supino Inclinado", "Push"],
  ["Desenvolvimento Militar", "Push"], ["Tríceps Corda", "Push"],
  ["Elevação Lateral", "Push"], ["Puxada Frontal", "Pull"],
  ["Remada Curvada", "Pull"], ["Remada Baixa", "Pull"],
  ["Rosca Direta", "Pull"], ["Face Pull", "Pull"],
  ["Agachamento", "Legs"], ["Leg Press", "Legs"],
  ["Cadeira Extensora", "Legs"], ["Mesa Flexora", "Legs"],
  ["Levantamento Terra", "Legs"], ["Panturrilha em Pé", "Legs"],
  ["Prancha", "Core"], ["Abdominal Infra", "Core"],
];

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Estado em memória + persistência ───────────────────────────────────
let db = { catalog: [], sessions: [], foods: [], meals: [], cardio: [], profile: null };

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) db = JSON.parse(raw);
  } catch (e) {
    console.warn("Falha ao ler dados, recomeçando:", e);
    db = { catalog: [], sessions: [], foods: [], meals: [], cardio: [], profile: null };
  }
  if (!Array.isArray(db.catalog)) db.catalog = [];
  if (!Array.isArray(db.sessions)) db.sessions = [];
  if (!Array.isArray(db.foods)) db.foods = [];
  if (!Array.isArray(db.meals)) db.meals = [];
  if (!Array.isArray(db.cardio)) db.cardio = [];
  if (db.profile != null && typeof db.profile !== "object") db.profile = null;
  seedCatalogIfNeeded();
  return db;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function seedCatalogIfNeeded() {
  if (db.catalog.length > 0) return;
  db.catalog = CATALOG_SEED.map(([name, category]) => ({ id: uid(), name, category }));
  save();
}

// ── Catálogo ────────────────────────────────────────────────────────────
export function catalog() {
  return [...db.catalog].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function registerInCatalog(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (db.catalog.some((c) => c.name === trimmed)) return;
  db.catalog.push({ id: uid(), name: trimmed, category: null });
}

// Cria (ou atualiza) uma entrada do catálogo com a categoria/divisão escolhida.
// Se já existir sem categoria, apenas preenche a categoria. Retorna a entrada.
export function createCatalogExercise(name, category = null) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = db.catalog.find((c) => c.name === trimmed);
  if (existing) {
    if (category && !existing.category) { existing.category = category; save(); }
    return existing;
  }
  const entry = { id: uid(), name: trimmed, category: category || null };
  db.catalog.push(entry);
  save();
  return entry;
}

// ── Métricas derivadas dos modelos ────────────────────────────────────────
export function setVolume(set) { return set.weightKg * set.reps; }
export function set1RM(set) { return epley(set.weightKg, set.reps); }

export function orderedSets(exercise) {
  return [...exercise.sets].sort((a, b) => a.setNumber - b.setNumber);
}
export function exerciseVolume(exercise) {
  return exercise.sets.reduce((s, x) => s + setVolume(x), 0);
}
export function exerciseBest1RM(exercise) {
  return exercise.sets.reduce((m, x) => Math.max(m, set1RM(x)), 0);
}

export function orderedExercises(session) {
  return [...session.exercises].sort((a, b) => a.position - b.position);
}
export function sessionVolume(session) {
  return session.exercises.reduce((s, e) => s + exerciseVolume(e), 0);
}
export function sessionDuration(session) {
  if (!session.endedAt) return null;
  return (session.endedAt - session.startedAt) / 1000; // segundos
}
export function sessionDensity(session) {
  const dur = sessionDuration(session);
  if (!dur || dur <= 0) return null;
  return sessionVolume(session) / (dur / 60);
}
export function isActive(session) { return session.endedAt == null; }

// ── Consultas ─────────────────────────────────────────────────────────────
export function activeSession() {
  return db.sessions
    .filter((s) => s.endedAt == null)
    .sort((a, b) => b.startedAt - a.startedAt)[0] || null;
}
export function endedSessions() {
  return db.sessions
    .filter((s) => s.endedAt != null)
    .sort((a, b) => b.date - a.date);
}
export function sessionById(id) {
  return db.sessions.find((s) => s.id === id) || null;
}
export function exerciseById(id) {
  for (const s of db.sessions) {
    const e = s.exercises.find((x) => x.id === id);
    if (e) return e;
  }
  return null;
}

// ── Operações de treino ───────────────────────────────────────────────────
export function startSession(type) {
  const now = Date.now();
  const session = {
    id: uid(), date: now, typeRaw: type, notes: null,
    startedAt: now, endedAt: null, exercises: [],
  };
  db.sessions.push(session);
  save();
  return session;
}

export function addExercise(name, session) {
  const trimmed = name.trim();
  const exercise = { id: uid(), name: trimmed, position: session.exercises.length, sets: [] };
  session.exercises.push(exercise);
  registerInCatalog(trimmed);
  save();
  return exercise;
}

// side: null (bilateral), "E" (esquerda) ou "D" (direita) para exercícios unilaterais.
export function confirmSet(weightKg, reps, rpe, exercise, side = null) {
  exercise.sets.push({
    id: uid(),
    setNumber: exercise.sets.length + 1,
    weightKg, reps,
    rpe: rpe == null ? null : rpe,
    side: side || null,
    doneAt: Date.now(),
  });
  save();
}

export function deleteSet(setId, exercise) {
  exercise.sets = exercise.sets.filter((s) => s.id !== setId);
  orderedSets(exercise).forEach((s, i) => { s.setNumber = i + 1; });
  save();
}

export function deleteExercise(exerciseId, session) {
  session.exercises = session.exercises.filter((e) => e.id !== exerciseId);
  orderedExercises(session).forEach((e, i) => { e.position = i; });
  save();
}

export function endSession(session) {
  session.endedAt = Date.now();
  save();
}

export function deleteSession(id) {
  db.sessions = db.sessions.filter((s) => s.id !== id);
  save();
}

// Resumo do último treino com este exercício.
export function lastWorkout(exerciseName) {
  for (const session of endedSessions()) {
    const sets = session.exercises
      .filter((e) => e.name === exerciseName)
      .flatMap((e) => orderedSets(e))
      .sort((a, b) => a.setNumber - b.setNumber);
    if (sets.length === 0) continue;

    const order = [];
    const repsByWeight = {};
    for (const set of sets) {
      if (repsByWeight[set.weightKg] == null) { order.push(set.weightKg); repsByWeight[set.weightKg] = []; }
      repsByWeight[set.weightKg].push(set.reps);
    }
    const groups = order.map((w) => ({ weightKg: w, reps: repsByWeight[w], setCount: repsByWeight[w].length }));
    const suggestedWeight = groups.reduce((best, g) => (!best || g.setCount > best.setCount ? g : best), null)?.weightKg ?? null;
    return { date: session.date, groups, totalSets: sets.length, suggestedWeight };
  }
  return null;
}

// ── Perfil e meta calórica ────────────────────────────────────────────────
const DEFAULT_PROFILE = {
  weightKg: null, heightCm: null, age: null, sex: "M",
  activityLevel: "leve", goal: "perder",
  targetMode: "auto", manualTargetKcal: null,
  countCardioInBalance: true,
};

export function profile() {
  return db.profile;
}

export function saveProfile(patch) {
  db.profile = { ...DEFAULT_PROFILE, ...(db.profile || {}), ...patch, updatedAt: Date.now() };
  save();
  return db.profile;
}

// TMB (Mifflin-St Jeor). null se o perfil estiver incompleto.
export function bmr(p = db.profile) {
  if (!p || !p.weightKg || !p.heightCm || !p.age) return null;
  return mifflinStJeor(p.weightKg, p.heightCm, p.age, p.sex);
}

// Gasto diário total = TMB × fator do nível de atividade.
export function tdee(p = db.profile) {
  const base = bmr(p);
  if (base == null) return null;
  const level = ACTIVITY_LEVELS.find(([id]) => id === p.activityLevel);
  return base * (level ? level[2] : 1.2);
}

// Meta diária de kcal: manual (se escolhida) ou TDEE + ajuste do objetivo,
// arredondada para a dezena.
export function dailyTarget(p = db.profile) {
  if (!p) return null;
  if (p.targetMode === "manual") return p.manualTargetKcal || null;
  const total = tdee(p);
  if (total == null) return null;
  const goal = GOALS.find(([id]) => id === p.goal);
  return Math.round((total + (goal ? goal[2] : 0)) / 10) * 10;
}

// ── Alimentos (TACO + personalizados) ─────────────────────────────────────
// Um "food ref" é a forma comum de alimento usada pela busca e pelo registro:
// { source: "taco"|"custom", refId, name, category, per100, unitName, unitGrams }.

// Remove acentos e baixa a caixa para busca tolerante.
function normalize(s) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Nomes do TACO normalizados uma única vez (busca a cada tecla).
let tacoNames = null;
function tacoNormalized() {
  if (!tacoNames) tacoNames = TACO.map((r) => normalize(r[0]));
  return tacoNames;
}

export function tacoFood(index) {
  const row = TACO[index];
  if (!row) return null;
  return {
    source: "taco", refId: index, name: row[0], category: row[1],
    per100: { kcal: row[2], protein: row[3], carbs: row[4], fat: row[5] },
    unitName: null, unitGrams: null,
  };
}

function customFoodRef(f) {
  return {
    source: "custom", refId: f.id, name: f.name, category: "Meus alimentos",
    per100: f.per100, unitName: f.unitName || null, unitGrams: f.unitGrams || null,
  };
}

export function createFood({ name, per100, unitName = null, unitGrams = null }) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const clean = (v) => Math.max(0, Math.round((parseFloat(v) || 0) * 10) / 10);
  const food = {
    id: uid(), name: trimmed,
    per100: { kcal: clean(per100.kcal), protein: clean(per100.protein), carbs: clean(per100.carbs), fat: clean(per100.fat) },
    unitName: unitName ? String(unitName).trim() || null : null,
    unitGrams: unitGrams ? Math.max(0, parseFloat(unitGrams) || 0) || null : null,
    createdAt: Date.now(),
  };
  db.foods.push(food);
  save();
  return food;
}

export function deleteFood(id) {
  db.foods = db.foods.filter((f) => f.id !== id);
  save();
}

export function customFoods() {
  return [...db.foods].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function foodById(id) {
  return db.foods.find((f) => f.id === id) || null;
}

// Resolve um {source, refId} para a definição atual do alimento (ou null).
export function resolveFoodRef(ref) {
  if (!ref) return null;
  if (ref.source === "taco") return tacoFood(ref.refId);
  if (ref.source === "custom") {
    const f = foodById(ref.refId);
    return f ? customFoodRef(f) : null;
  }
  return null;
}

// Alimentos usados recentemente, por frequência + recência (para busca vazia).
export function recentFoods(limit = 8) {
  const byKey = new Map();
  for (const m of db.meals) {
    const key = `${m.foodRef.source}|${m.foodRef.refId}`;
    const cur = byKey.get(key) || { count: 0, lastUsed: 0, ref: m.foodRef };
    cur.count += 1;
    cur.lastUsed = Math.max(cur.lastUsed, m.date);
    byKey.set(key, cur);
  }
  return [...byKey.values()]
    .sort((a, b) => (b.count - a.count) || (b.lastUsed - a.lastUsed))
    .map((x) => resolveFoodRef(x.ref))
    .filter(Boolean)
    .slice(0, limit);
}

// Busca mesclada sem acentos: recentes → personalizados → TACO.
export function searchFoods(query, limit = 60) {
  const q = normalize(query.trim());
  if (!q) return [];
  const seen = new Set();
  const results = [];
  const push = (ref) => {
    if (!ref) return;
    const key = `${ref.source}|${ref.refId}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(ref);
  };
  for (const ref of recentFoods(12)) {
    if (normalize(ref.name).includes(q)) push(ref);
  }
  for (const f of customFoods()) {
    if (normalize(f.name).includes(q)) push(customFoodRef(f));
  }
  // No TACO, quem começa pelo termo vem antes de quem só o contém.
  const names = tacoNormalized();
  const starts = [], contains = [];
  for (let i = 0; i < names.length; i++) {
    if (names[i].startsWith(q)) starts.push(i);
    else if (names[i].includes(q)) contains.push(i);
  }
  for (const i of starts.concat(contains)) {
    if (results.length >= limit) break;
    push(tacoFood(i));
  }
  return results.slice(0, limit);
}

// ── Refeições ─────────────────────────────────────────────────────────────
// Cada entrada guarda um retrato (per100) do alimento no momento do registro:
// editar o alimento (ou regenerar o TACO) depois não reescreve o histórico.

export function logMeal({ foodRef, name, per100, grams, mealType, date = Date.now() }) {
  const entry = {
    id: uid(), date, mealType,
    foodRef: { source: foodRef.source, refId: foodRef.refId },
    name, grams,
    per100: { kcal: per100.kcal, protein: per100.protein, carbs: per100.carbs, fat: per100.fat },
  };
  db.meals.push(entry);
  save();
  return entry;
}

export function updateMealEntry(id, { grams, mealType } = {}) {
  const entry = db.meals.find((m) => m.id === id);
  if (!entry) return;
  if (grams != null && grams > 0) entry.grams = grams;
  if (mealType) entry.mealType = mealType;
  save();
}

export function deleteMealEntry(id) {
  db.meals = db.meals.filter((m) => m.id !== id);
  save();
}

// kcal e macros de uma entrada = per100 × gramas / 100.
export function entryMacros(entry) {
  const f = entry.grams / 100;
  return {
    kcal: entry.per100.kcal * f,
    protein: entry.per100.protein * f,
    carbs: entry.per100.carbs * f,
    fat: entry.per100.fat * f,
  };
}

// Entradas do dia agrupadas por refeição: { cafe: [...], almoco: [...], ... }.
export function mealsForDay(dayMs) {
  const groups = {};
  for (const [id] of MEAL_TYPES) groups[id] = [];
  for (const m of db.meals) {
    if (startOfDay(m.date) !== dayMs) continue;
    (groups[m.mealType] || (groups[m.mealType] = [])).push(m);
  }
  for (const list of Object.values(groups)) list.sort((a, b) => a.date - b.date);
  return groups;
}

// Totais consumidos no dia.
export function dailyNutrition(dayMs) {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, entryCount: 0 };
  for (const m of db.meals) {
    if (startOfDay(m.date) !== dayMs) continue;
    const x = entryMacros(m);
    total.kcal += x.kcal;
    total.protein += x.protein;
    total.carbs += x.carbs;
    total.fat += x.fat;
    total.entryCount += 1;
  }
  return total;
}

// kcal de cardio registradas no dia.
export function dailyCardioKcal(dayMs) {
  return db.cardio.reduce((s, c) => s + (startOfDay(c.date) === dayMs ? c.kcal : 0), 0);
}

// Saldo do dia frente à meta. Se o perfil pedir (countCardioInBalance),
// o cardio soma como gasto extra na "permissão" do dia.
export function dailyBalance(dayMs) {
  const p = db.profile;
  const target = dailyTarget(p);
  const macros = dailyNutrition(dayMs);
  const cardioKcal = dailyCardioKcal(dayMs);
  const allowance = target == null ? null : target + (p && p.countCardioInBalance ? cardioKcal : 0);
  return {
    target, allowance, cardioKcal, macros,
    consumed: macros.kcal,
    remaining: allowance == null ? null : allowance - macros.kcal,
    logged: macros.entryCount > 0,
  };
}

// ── Progresso nutricional ─────────────────────────────────────────────────
const DAY_MS = 86_400_000;

// Saldo diário dos últimos `days` dias (mais antigo → mais recente).
// Dias sem refeição registrada vêm com logged: false.
export function balanceHistory(days = 28) {
  const today = startOfDay(Date.now());
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = startOfDay(today - i * DAY_MS + DAY_MS / 2);
    const b = dailyBalance(day);
    out.push({
      date: day, consumed: b.consumed, target: b.target,
      allowance: b.allowance, cardioKcal: b.cardioKcal, logged: b.logged,
    });
  }
  return out;
}

// Dias seguidos dentro da meta, terminando hoje (ou ontem, se hoje ainda
// não tem registro). Hoje estourado zera a sequência.
export function deficitStreak() {
  let day = startOfDay(Date.now());
  let streak = 0;
  const today = dailyBalance(day);
  if (today.logged) {
    if (today.remaining == null || today.remaining < 0) return 0;
    streak += 1;
  }
  for (;;) {
    day = startOfDay(day - DAY_MS / 2);
    const b = dailyBalance(day);
    if (!b.logged || b.remaining == null || b.remaining < 0) break;
    streak += 1;
  }
  return streak;
}

// Saldo médio (permissão − consumido) nos últimos `days` dias com registro.
// Positivo = abaixo da meta (déficit); negativo = acima.
export function avgDeficit(days = 7) {
  const hist = balanceHistory(days).filter((d) => d.logged && d.allowance != null);
  if (!hist.length) return null;
  return hist.reduce((s, d) => s + (d.allowance - d.consumed), 0) / hist.length;
}

// ── Cardio ────────────────────────────────────────────────────────────────
// kcal, MET e peso usados ficam gravados na entrada (mudar o perfil depois
// não reescreve o histórico).

export function logCardio({ activityId, intensity, durationMin, distanceKm = null, date = Date.now() }) {
  const activity = CARDIO_ACTIVITIES.find((a) => a.id === activityId) || CARDIO_ACTIVITIES[CARDIO_ACTIVITIES.length - 1];
  const met = activity.mets[intensity] || activity.mets.moderado;
  const weightKgUsed = (db.profile && db.profile.weightKg) || 70;
  const entry = {
    id: uid(), date,
    activityId: activity.id, activity: activity.name,
    intensity, durationMin,
    distanceKm: distanceKm || null,
    met, weightKgUsed,
    kcal: Math.round((met * 3.5 * weightKgUsed) / 200 * durationMin),
  };
  db.cardio.push(entry);
  save();
  return entry;
}

export function deleteCardio(id) {
  db.cardio = db.cardio.filter((c) => c.id !== id);
  save();
}

export function cardioById(id) {
  return db.cardio.find((c) => c.id === id) || null;
}

export function cardioForDay(dayMs) {
  return db.cardio
    .filter((c) => startOfDay(c.date) === dayMs)
    .sort((a, b) => a.date - b.date);
}

// Treinos encerrados + cardio, mesclados por data (desc), para o Histórico.
export function historyItems() {
  const items = [
    ...endedSessions().map((session) => ({ kind: "workout", date: session.date, session })),
    ...db.cardio.map((entry) => ({ kind: "cardio", date: entry.date, entry })),
  ];
  return items.sort((a, b) => b.date - a.date);
}

// ── Histórico (agrupamento por mês) ───────────────────────────────────────
export function groupByMonth(sessions) {
  const buckets = new Map();
  for (const s of sessions) {
    const key = monthKey(s.date);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, list]) => ({
      title: monthYear(list[0].date),
      sessions: [...list].sort((a, b) => b.date - a.date),
    }));
}

// ── Estatísticas ──────────────────────────────────────────────────────────
export function exerciseNames(sessions) {
  const names = new Set();
  sessions.forEach((s) => s.exercises.forEach((e) => names.add(e.name)));
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function oneRMProgress(exerciseName, sessions) {
  const byDay = new Map();
  for (const s of sessions) {
    const day = startOfDay(s.date);
    for (const e of s.exercises) {
      if (e.name !== exerciseName) continue;
      byDay.set(day, Math.max(byDay.get(day) || 0, exerciseBest1RM(e)));
    }
  }
  return [...byDay.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date - b.date);
}

export function loadProgress(exerciseName, sessions) {
  const byDay = new Map();
  for (const s of sessions) {
    const day = startOfDay(s.date);
    for (const e of s.exercises) {
      if (e.name !== exerciseName) continue;
      const maxW = e.sets.reduce((m, x) => Math.max(m, x.weightKg), 0);
      byDay.set(day, Math.max(byDay.get(day) || 0, maxW));
    }
  }
  return [...byDay.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date - b.date);
}

// Calendário de atividade estilo GitHub.
// Retorna `weeks` semanas (colunas), cada uma com 7 dias (domingo→sábado),
// terminando na semana atual. Cada célula traz { date, count, volume } — com
// count/volume = 0 nos dias de folga. A intensidade (cor) é derivada na camada
// de visualização a partir do volume.
export function activityCalendar(sessions, weeks = 53) {
  const DAY = 86_400_000;
  const byDay = new Map(); // dayMs -> { count, volume }
  for (const s of sessions) {
    const day = startOfDay(s.date);
    const cur = byDay.get(day) || { count: 0, volume: 0 };
    cur.count += 1;
    cur.volume += sessionVolume(s);
    byDay.set(day, cur);
  }

  const firstWeek = startOfWeek(Date.now()) - (weeks - 1) * 7 * DAY;
  const result = [];
  for (let w = 0; w < weeks; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = startOfDay(firstWeek + (w * 7 + d) * DAY);
      const info = byDay.get(day) || { count: 0, volume: 0 };
      days.push({ date: day, count: info.count, volume: info.volume });
    }
    result.push({ weekStart: startOfDay(firstWeek + w * 7 * DAY), days });
  }
  return result;
}

export function weeklyVolume(sessions) {
  const bucket = new Map();
  for (const s of sessions) {
    const week = startOfWeek(s.date);
    const key = `${week}|${s.typeRaw}`;
    const prev = bucket.get(key);
    bucket.set(key, { weekStart: week, type: s.typeRaw, volume: (prev?.volume || 0) + sessionVolume(s) });
  }
  return [...bucket.values()].sort((a, b) => a.weekStart - b.weekStart);
}

// ── Exportação CSV ────────────────────────────────────────────────────────
const CSV_HEADER =
  "date,training_type,exercise,set,weight_kg,reps,estimated_1rm,rpe,done_at,rest_seconds,side";

function escapeCSV(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function generateCSV(sessions) {
  const lines = [CSV_HEADER];
  for (const session of [...sessions].sort((a, b) => a.date - b.date)) {
    const date = isoString(session.date);
    const type = session.typeRaw;
    for (const exercise of orderedExercises(session)) {
      const sets = orderedSets(exercise);
      sets.forEach((set, index) => {
        const rest = index > 0 ? String(Math.floor((set.doneAt - sets[index - 1].doneAt) / 1000)) : "";
        lines.push([
          date, type, escapeCSV(exercise.name), String(set.setNumber),
          set.weightKg.toFixed(2), String(set.reps),
          set1RM(set).toFixed(1), set.rpe == null ? "" : String(set.rpe),
          isoString(set.doneAt), rest, set.side || "",
        ].join(","));
      });
    }
  }
  return lines.join("\n");
}

export function exportFilename() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `gymlog_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`;
}

// ── Importação CSV ────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let current = "", inside = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inside && line[i + 1] === '"') { current += '"'; i++; }
      else inside = !inside;
    } else if (ch === "," && !inside) {
      fields.push(current); current = "";
    } else current += ch;
  }
  fields.push(current);
  return fields;
}

export function importCSV(text) {
  const rows = text.split("\n").filter((l) => l.trim().length > 0);
  if (rows.length === 0) throw new Error("Arquivo vazio.");
  if (!rows[0].startsWith("date,training_type,exercise")) throw new Error("Cabeçalho inválido.");

  const sessionsByKey = new Map();
  const exercisesByKey = new Map();
  const newSessions = [];

  for (const line of rows.slice(1)) {
    const cols = parseCSVLine(line);
    if (cols.length < 6) continue;

    const [dateStr, typeStr, exerciseName] = cols;
    const setNumber = parseInt(cols[3], 10) || 0;
    const weight = parseFloat(cols[4]) || 0;
    const reps = parseInt(cols[5], 10) || 0;
    const rpe = cols.length > 7 && cols[7] !== "" ? parseInt(cols[7], 10) : null;
    const doneAt = cols.length > 8 && cols[8] ? Date.parse(cols[8]) : Date.parse(dateStr) || Date.now();
    const side = cols.length > 10 && cols[10] ? cols[10] : null;

    const sessionKey = `${dateStr}|${typeStr}`;
    let session = sessionsByKey.get(sessionKey);
    if (!session) {
      const date = Date.parse(dateStr) || Date.now();
      session = {
        id: uid(), date, typeRaw: TRAINING_TYPES.includes(typeStr) ? typeStr : "Push",
        notes: null, startedAt: date, endedAt: date, exercises: [],
      };
      sessionsByKey.set(sessionKey, session);
      newSessions.push(session);
    }

    const exerciseKey = `${sessionKey}|${exerciseName}`;
    let exercise = exercisesByKey.get(exerciseKey);
    if (!exercise) {
      exercise = { id: uid(), name: exerciseName, position: session.exercises.length, sets: [] };
      session.exercises.push(exercise);
      exercisesByKey.set(exerciseKey, exercise);
      registerInCatalog(exerciseName);
    }

    exercise.sets.push({ id: uid(), setNumber, weightKg: weight, reps, rpe, side, doneAt });
  }

  // endedAt = última série da sessão (para histórico/duração coerentes).
  for (const s of newSessions) {
    const last = s.exercises.flatMap((e) => e.sets).reduce((m, x) => Math.max(m, x.doneAt), s.date);
    s.endedAt = last;
    db.sessions.push(s);
  }
  save();
  return newSessions.length;
}
