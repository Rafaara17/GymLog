//
// store.js — Camada de dados do GymLog.
//
// Modelos (Session, Exercise, WorkoutSet, ExerciseCatalog), métricas derivadas,
// operações de treino, histórico, estatísticas e exportação/importação CSV.
// Persistência local em localStorage.
//

import { epley, isoString, startOfDay, startOfWeek, monthKey, monthYear } from "./format.js";

const STORAGE_KEY = "gymlog.db.v1";

// Tipos de treino.
export const TRAINING_TYPES = ["Push", "Pull", "Upper", "Lower"];

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
let db = { catalog: [], sessions: [] };

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) db = JSON.parse(raw);
  } catch (e) {
    console.warn("Falha ao ler dados, recomeçando:", e);
    db = { catalog: [], sessions: [] };
  }
  if (!Array.isArray(db.catalog)) db.catalog = [];
  if (!Array.isArray(db.sessions)) db.sessions = [];
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

export function confirmSet(weightKg, reps, rpe, exercise) {
  exercise.sets.push({
    id: uid(),
    setNumber: exercise.sets.length + 1,
    weightKg, reps,
    rpe: rpe == null ? null : rpe,
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
  "date,training_type,exercise,set,weight_kg,reps,estimated_1rm,rpe,done_at,rest_seconds";

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
          isoString(set.doneAt), rest,
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

    exercise.sets.push({ id: uid(), setNumber, weightKg: weight, reps, rpe, doneAt });
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
