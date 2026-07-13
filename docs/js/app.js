//
// app.js — Camada de interface do GymLog.
//
// TabView (Treino, Histórico, Stats) + navegação por pilha + folhas modais,
// estilo iOS, sobre a camada de dados em store.js.
//

import * as db from "./store.js";
import * as fmt from "./format.js";
import { volumeChart, lineChart, barChart, heatmapChart, balanceChart, TYPE_COLORS } from "./charts.js";
import { CARDIO_ACTIVITIES, INTENSITIES } from "./data/mets.js";

// ── Mini-helper de DOM (hyperscript) ───────────────────────────────────────
function E(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "style") node.setAttribute("style", v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  return node;
}

// ── Ícones SVG inline ───────────────────────────────────────────────────────
const ICONS = {
  dumbbell: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="1.5" y="9" width="3" height="6" rx="1"/><rect x="5" y="7" width="3" height="10" rx="1.2"/><rect x="16" y="7" width="3" height="10" rx="1.2"/><rect x="19.5" y="9" width="3" height="6" rx="1"/><rect x="8" y="10.8" width="8" height="2.4" rx="1"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6"/><line x1="16" y1="2.5" x2="16" y2="6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 11 15.3 16 9.2"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 5 8 12 15 19"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><polyline points="8 7 12 3 16 7"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><polyline points="8 11 12 15 16 11"/><path d="M5 21h14"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><polyline points="21 3.5 21 7.5 17 7.5"/><polyline points="12 8 12 12 14.8 13.2"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10-6.5z"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3v5.5a2.5 2.5 0 0 0 5 0V3"/><line x1="8" y1="11" x2="8" y2="21"/><path d="M18.5 3c-2 1.8-3 4.4-3 7.5V13h3v8"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c1.2-3.5 4-5.5 7.5-5.5s6.3 2 7.5 5.5"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5C7.2 16.2 3.5 13 3.5 9.1 3.5 6.6 5.4 4.5 7.9 4.5c1.6 0 3.1.9 4.1 2.4 1-1.5 2.5-2.4 4.1-2.4 2.5 0 4.4 2.1 4.4 4.6 0 3.9-3.7 7.1-8.5 11.4z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c.4 3-.9 4.6-2.2 6.2C8.4 10.4 7 12.1 7 14.4a5 5 0 0 0 10 0c0-1.1-.3-2.1-.9-3-.7.9-1.5 1.4-2.4 1.5.9-2.7.3-6.3-1.7-10.4z"/></svg>',
  forward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 5 16 12 9 19"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.4 3.8 5.5 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3z"/></svg>',
};

function icon(name, cls = "icon") {
  return E("span", { class: cls, html: ICONS[name] || "" });
}

// Rótulo curto do lado (unilateral).
const sideLabel = (s) => (s === "E" ? "Esq." : s === "D" ? "Dir." : "");

// Campo numérico editável com botões −passo/+passo (dá pra digitar também).
// Retorna { el, get } — `get()` devolve o valor atual.
function makeStepperField(initial, { step = 1, min = 0, decimals = 1 } = {}, onChange = () => {}) {
  const show = (v) => {
    const f = Math.pow(10, decimals);
    return String(Math.round(v * f) / f);
  };
  let value = Math.max(min, initial || 0);
  const input = E("input", {
    class: "weight-input", type: "number",
    inputmode: decimals > 0 ? "decimal" : "numeric",
    step: String(step), min: String(min),
  });
  input.value = show(value);
  const sync = () => { input.value = show(value); };
  const commit = (v) => { value = Math.max(min, Math.round(v * 100) / 100); onChange(value); };
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    value = isNaN(v) || v < min ? min : v;
    onChange(value);
  });
  input.addEventListener("blur", sync);
  const el = E("div", { class: "stepper" }, [
    E("button", { class: "step-btn", onclick: () => { commit(value - step); sync(); } }, `-${show(step)}`),
    input,
    E("button", { class: "step-btn", onclick: () => { commit(value + step); sync(); } }, `+${show(step)}`),
  ]);
  return { el, get: () => value, set: (v) => { commit(v); sync(); } };
}

// Campo de peso da série: passos de 2.5 kg.
function makeWeightField(initial, onChange) {
  return makeStepperField(initial, { step: 2.5 }, onChange);
}

// ── Estado + navegação ──────────────────────────────────────────────────────
const state = {
  tab: "treino",          // treino | dieta | historico | stats
  stack: [],              // telas empilhadas: {name, ...}
  startType: "Push",      // tipo selecionado na tela inicial
  statsExercise: null,    // exercício selecionado em Stats
  setInput: null,         // estado transitório da entrada de séries
  dietDate: null,         // dia exibido na aba Dieta (ms, início do dia); null = hoje
  cardioInput: null,      // estado transitório do registro de cardio
};

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const top = state.stack[state.stack.length - 1];
  if (top) {
    app.appendChild(screenFor(top));
  } else {
    app.appendChild(tabRoot());
    app.appendChild(tabBar());
  }
}

function push(screen) { state.stack.push(screen); render(); }
function pop() { state.stack.pop(); render(); }
function switchTab(tab) { if (state.tab === tab && !state.stack.length) return; state.tab = tab; state.stack = []; render(); }

// ── Barra de abas ────────────────────────────────────────────────────────────
function tabBar() {
  const tabs = [
    ["treino", "dumbbell", "Treino"],
    ["dieta", "food", "Dieta"],
    ["historico", "calendar", "Histórico"],
    ["stats", "chart", "Stats"],
  ];
  return E("nav", { class: "tabbar" },
    tabs.map(([id, ic, label]) =>
      E("button", { class: "tab" + (state.tab === id ? " active" : ""), onclick: () => switchTab(id) },
        [icon(ic, "tab-icon"), E("span", { class: "tab-label" }, label)])
    )
  );
}

// ── Barras de navegação ──────────────────────────────────────────────────────
function navBar(title, { back, trailing, inline } = {}) {
  return E("header", { class: "navbar" + (inline ? " inline" : "") }, [
    E("div", { class: "nav-side nav-left" }, back
      ? [E("button", { class: "nav-btn", onclick: back }, [icon("back", "icon sm"), E("span", {}, "Voltar")])]
      : []),
    E("h1", { class: "nav-title" }, title),
    E("div", { class: "nav-side nav-right" }, trailing || []),
  ]);
}

// ── Telas raiz por aba ───────────────────────────────────────────────────────
function tabRoot() {
  if (state.tab === "treino") return workoutRoot();
  if (state.tab === "dieta") return dietRoot();
  if (state.tab === "historico") return historyRoot();
  return statsRoot();
}

// ════════════ TREINO ════════════
function workoutRoot() {
  const active = db.activeSession();
  return active ? activeWorkout(active) : startWorkout();
}

function startWorkout() {
  const screen = E("section", { class: "screen" }, [
    navBar("Treino"),
    E("div", { class: "start-wrap" }, [
      icon("dumbbell", "hero-icon"),
      E("h2", { class: "start-title" }, "Começar treino"),
      E("div", { class: "field-label" }, "Tipo de treino"),
      segmented(db.TRAINING_TYPES, state.startType, (t) => { state.startType = t; render(); }),
      E("button", {
        class: "btn-primary big", onclick: () => { db.startSession(state.startType); render(); },
      }, [icon("play", "icon sm"), E("span", {}, "Iniciar")]),
      E("button", {
        class: "btn-secondary", onclick: () => push({ name: "cardioLog" }),
      }, [icon("heart", "icon sm"), E("span", {}, "Registrar cardio")]),
    ]),
  ]);
  return screen;
}

// ════════════ CARDIO ════════════
function cardioLogScreen() {
  let activity = CARDIO_ACTIVITIES[0];
  let intensity = "moderado";
  const hasWeight = !!db.profile()?.weightKg;
  const weight = db.profile()?.weightKg || 70;

  const preview = E("div", { class: "amount-preview" });
  const durField = makeStepperField(30, { step: 5, decimals: 0 }, () => updatePreview());
  function updatePreview() {
    const met = activity.mets[intensity];
    const k = Math.round((met * 3.5 * weight) / 200 * durField.get());
    preview.textContent = `≈ ${fmt.kcal(k)} · MET ${met.toLocaleString("pt-BR")} × ${weight} kg × ${durField.get()} min`;
  }

  const distInput = E("input", { class: "form-input", type: "number", inputmode: "decimal", min: "0", placeholder: "5" });
  const distWrap = E("div", { class: "card list", style: activity.hasDistance ? "" : "display:none" }, [
    E("div", { class: "form-row" }, [E("span", { class: "form-label" }, "Distância (km) — opcional"), distInput]),
  ]);

  const grid = E("div", { class: "activity-grid" }, CARDIO_ACTIVITIES.map((a) =>
    E("button", {
      class: "activity-chip" + (a.id === activity.id ? " active" : ""),
      onclick: (e) => {
        activity = a;
        grid.querySelectorAll(".activity-chip").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        distWrap.style.display = a.hasDistance ? "" : "none";
        updatePreview();
      },
    }, a.name)));

  const intSeg = E("div", { class: "segmented" }, INTENSITIES.map(([id, label]) =>
    E("button", {
      class: "seg" + (id === intensity ? " active" : ""),
      onclick: (e) => {
        intensity = id;
        intSeg.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        updatePreview();
      },
    }, label)));

  updatePreview();

  return E("section", { class: "screen" }, [
    navBar("Cardio", { back: pop, inline: true }),
    E("div", { class: "scroll" }, [
      E("div", { class: "section-header" }, "Atividade"),
      grid,
      E("div", { class: "section-header" }, "Intensidade"),
      E("div", { class: "seg-wrap" }, [intSeg]),
      E("div", { class: "section-header" }, "Duração (min)"),
      E("div", { class: "cardio-dur" }, [durField.el]),
      E("div", { class: "section-header" }, "Distância"),
      distWrap,
      E("div", { class: "cardio-save" }, [
        preview,
        hasWeight ? null : E("p", { class: "hint" }, "Usando 70 kg na estimativa — defina seu peso no Perfil (aba Dieta)."),
        E("button", {
          class: "btn-primary green",
          onclick: () => {
            const min = durField.get();
            if (min <= 0) return;
            db.logCardio({
              activityId: activity.id, intensity, durationMin: min,
              distanceKm: parseFloat(distInput.value) || null,
            });
            toast(`${activity.name} registrado.`);
            pop();
          },
        }, [icon("check", "icon sm"), E("span", {}, "Salvar cardio")]),
      ]),
    ]),
  ]);
}

function cardioDetailScreen(cardioId) {
  const c = db.cardioById(cardioId);
  if (!c) { pop(); return E("div"); }
  const intensityLabel = (INTENSITIES.find(([id]) => id === c.intensity) || [])[1] || c.intensity;

  return E("section", { class: "screen" }, [
    navBar(c.activity, { back: pop, inline: true }),
    E("div", { class: "scroll" }, [
      E("div", { class: "section-header" }, "Resumo"),
      E("div", { class: "card metrics" }, [
        metricRow("Data", fmt.dateTime(c.date)),
        metricRow("Intensidade", intensityLabel),
        metricRow("Duração", fmt.duration(c.durationMin * 60)),
        c.distanceKm ? metricRow("Distância", `${c.distanceKm.toLocaleString("pt-BR")} km`) : null,
        metricRow("Calorias", fmt.kcal(c.kcal)),
        metricRow("Cálculo", `MET ${c.met.toLocaleString("pt-BR")} × ${c.weightKgUsed} kg`),
      ]),
      E("div", { class: "card list", style: "margin-top: 18px" }, [
        E("button", {
          class: "row tappable",
          onclick: () => confirmDelete("Apagar cardio?", () => { db.deleteCardio(c.id); pop(); }),
        }, [E("span", { class: "row-title", style: "color: var(--danger)" }, "Apagar registro")]),
      ]),
    ]),
  ]);
}

function activeWorkout(session) {
  const exercises = db.orderedExercises(session);
  const rows = exercises.map((ex) => {
    const row = E("button", { class: "row tappable", onclick: () => push({ name: "setInput", exerciseId: ex.id }) }, [
      E("div", { class: "row-main" }, [
        E("div", { class: "row-title" }, ex.name),
        E("div", { class: "row-sub" }, [
          chip(`${ex.sets.length} séries`),
          db.exerciseVolume(ex) > 0 ? chip(fmt.weight(db.exerciseVolume(ex))) : null,
          db.exerciseBest1RM(ex) > 0 ? chip(`${Math.round(db.exerciseBest1RM(ex))} 1RM`) : null,
        ]),
      ]),
      E("span", { class: "chevron", html: ICONS.back }),
    ]);
    attachLongPress(row, () => confirmDelete("Apagar exercício?", () => { db.deleteExercise(ex.id, session); render(); }));
    return row;
  });

  return E("section", { class: "screen" }, [
    navBar(session.typeRaw, {
      inline: true,
      trailing: [E("button", { class: "nav-btn danger", onclick: () => confirmEnd(session) }, "Encerrar")],
    }),
    E("div", { class: "scroll" }, [
      E("div", { class: "section-header" }, "Exercícios"),
      exercises.length
        ? E("div", { class: "card list" }, rows)
        : E("div", { class: "empty-inline" }, "Adicione o primeiro exercício para começar."),
      E("div", { class: "card list" }, [
        E("button", { class: "row tappable accent", onclick: () => openPicker((name) => { db.addExercise(name, session); render(); }, session.typeRaw) },
          [icon("plus", "icon"), E("span", { class: "row-title accent" }, "Adicionar exercício")]),
      ]),
      exercises.length ? E("p", { class: "hint" }, "Toque para registrar séries · segure para apagar") : null,
    ]),
    E("div", { class: "summary-bar" }, [
      E("span", {}, fmt.weight(db.sessionVolume(session))),
      E("span", {}, `${exercises.length} exercícios`),
    ]),
  ]);
}

function confirmEnd(session) {
  openActionSheet({
    title: "Encerrar treino?",
    actions: [
      { label: "Encerrar", role: "destructive", onClick: () => { db.endSession(session); render(); } },
      { label: "Continuar treinando", role: "cancel" },
    ],
  });
}

// ════════════ ENTRADA DE SÉRIES (SetInput) ════════════
function setInputScreen(exerciseId) {
  const exercise = db.exerciseById(exerciseId);
  if (!exercise) { pop(); return E("div"); }
  const last = db.lastWorkout(exercise.name);

  // Estado transitório: sugere carga (continua de onde parou; senão último treino; senão 20).
  if (!state.setInput || state.setInput.exerciseId !== exerciseId) {
    const sets = db.orderedSets(exercise);
    const startW = sets.length ? sets[sets.length - 1].weightKg : (last?.suggestedWeight ?? 20);
    state.setInput = {
      exerciseId,
      unilateral: false,
      weight: startW,
      reps: 0,
      rpe: 0,
      leftWeight: startW, leftReps: 0,
      rightWeight: startW, rightReps: 0,
    };
  }
  const si = state.setInput;

  // Card "Último treino".
  const lastCard = last ? E("div", { class: "last-card" }, [
    E("div", { class: "last-head" }, [
      E("span", { class: "last-title" }, [icon("clock", "icon sm"), E("span", {}, "Último treino")]),
      E("span", { class: "muted sm" }, fmt.shortDate(last.date)),
    ]),
    E("div", { class: "last-groups" }, last.groups.map((g) =>
      E("div", { class: "last-group" }, [
        E("span", { class: "lg-weight" }, fmt.weight(g.weightKg)),
        E("span", { class: "muted" }, g.setCount === 1 ? "1 série" : `${g.setCount} séries`),
        E("span", { class: "lg-reps muted sm" }, g.reps.join(", ") + " reps"),
      ])
    )),
  ]) : null;

  // Histórico das séries já feitas nesta sessão (com rótulo de lado se unilateral).
  const sets = db.orderedSets(exercise);
  const history = E("div", { class: "set-history" },
    sets.length ? sets.map((s) => {
      const row = E("div", { class: "set-row" }, [
        E("span", { class: "muted" }, `Série ${s.setNumber}`),
        s.side ? E("span", { class: "side-badge" }, sideLabel(s.side)) : null,
        E("span", { class: "spacer" }),
        E("span", { class: "set-weight" }, fmt.weight(s.weightKg)),
        E("span", { class: "muted" }, `× ${s.reps}`),
        E("span", { class: "faint sm" }, `≈ ${Math.round(db.set1RM(s))} 1RM`),
      ]);
      attachLongPress(row, () => confirmDelete("Apagar série?", () => {
        db.deleteSet(s.id, exercise); render();
      }));
      return row;
    }) : E("p", { class: "empty-inline center" }, "Nenhuma série ainda. Confirme a primeira abaixo.")
  );

  const confirmBtn = E("button", { class: "btn-primary green" }, [icon("check", "icon sm"), E("span", {}, "Confirmar série")]);

  // Seletor de RPE (—, 6..10) — compartilhado entre os dois lados no unilateral.
  const rpeOptions = [["—", 0], ["6", 6], ["7", 7], ["8", 8], ["9", 9], ["10", 10]];
  const rpeSeg = E("div", { class: "segmented small" }, rpeOptions.map(([label, val]) =>
    E("button", {
      class: "seg" + (si.rpe === val ? " active" : ""),
      onclick: (e) => {
        si.rpe = val;
        rpeSeg.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
      },
    }, label)
  ));

  // Botão liga/desliga modo unilateral (esquerda/direita separados).
  const uniToggle = E("button", {
    class: "uni-toggle" + (si.unilateral ? " active" : ""),
    onclick: () => {
      si.unilateral = !si.unilateral;
      if (si.unilateral) { si.leftWeight = si.weight; si.rightWeight = si.weight; }
      render();
    },
  }, si.unilateral ? "● Unilateral ativado" : "Unilateral");

  // Monta o corpo de entrada conforme o modo, expondo syncConfirm/doConfirm/focusEl.
  let inputBody, syncConfirm, doConfirm, focusEl;

  if (!si.unilateral) {
    const wField = makeWeightField(si.weight, (v) => { si.weight = v; });
    const repsInput = E("input", {
      class: "reps-input", type: "number", inputmode: "numeric", min: "0",
      value: si.reps ? String(si.reps) : "", placeholder: "0",
    });
    repsInput.addEventListener("input", () => { si.reps = parseInt(repsInput.value, 10) || 0; syncConfirm(); });
    inputBody = E("div", { class: "input-grid" }, [
      E("div", { class: "input-col" }, [E("div", { class: "field-label" }, "Peso (kg)"), wField.el]),
      E("div", { class: "input-col" }, [E("div", { class: "field-label" }, "Reps"), repsInput]),
    ]);
    syncConfirm = () => { confirmBtn.disabled = !(parseInt(repsInput.value, 10) > 0); };
    doConfirm = () => {
      const reps = parseInt(repsInput.value, 10) || 0;
      if (reps <= 0) return;
      db.confirmSet(wField.get(), reps, si.rpe === 0 ? null : si.rpe, exercise, null);
      si.reps = 0; si.weight = wField.get();
      render();
    };
    focusEl = repsInput;
  } else {
    const buildSide = (label, wKey, rKey) => {
      const wField = makeWeightField(si[wKey], (v) => { si[wKey] = v; });
      const repsInput = E("input", {
        class: "reps-input", type: "number", inputmode: "numeric", min: "0",
        value: si[rKey] ? String(si[rKey]) : "", placeholder: "0",
      });
      repsInput.addEventListener("input", () => { si[rKey] = parseInt(repsInput.value, 10) || 0; syncConfirm(); });
      const block = E("div", { class: "uni-side" }, [
        E("div", { class: "uni-side-head" }, label),
        E("div", { class: "uni-side-row" }, [
          E("div", { class: "input-col" }, [E("div", { class: "field-label" }, "Peso (kg)"), wField.el]),
          E("div", { class: "input-col" }, [E("div", { class: "field-label" }, "Reps"), repsInput]),
        ]),
      ]);
      return { block, wField, repsInput };
    };
    const left = buildSide("Esquerda", "leftWeight", "leftReps");
    const right = buildSide("Direita", "rightWeight", "rightReps");
    inputBody = E("div", { class: "uni-grid" }, [left.block, right.block]);
    syncConfirm = () => {
      const ok = parseInt(left.repsInput.value, 10) > 0 && parseInt(right.repsInput.value, 10) > 0;
      confirmBtn.disabled = !ok;
    };
    doConfirm = () => {
      const lr = parseInt(left.repsInput.value, 10) || 0;
      const rr = parseInt(right.repsInput.value, 10) || 0;
      if (lr <= 0 || rr <= 0) return;
      const rpe = si.rpe === 0 ? null : si.rpe;
      db.confirmSet(left.wField.get(), lr, rpe, exercise, "E");
      db.confirmSet(right.wField.get(), rr, rpe, exercise, "D");
      si.leftReps = 0; si.rightReps = 0;
      si.leftWeight = left.wField.get(); si.rightWeight = right.wField.get();
      render();
    };
    focusEl = left.repsInput;
  }

  confirmBtn.addEventListener("click", doConfirm);
  syncConfirm();

  const inputArea = E("div", { class: "input-area" }, [
    E("div", { class: "next-set" }, `Série ${exercise.sets.length + 1}`),
    uniToggle,
    inputBody,
    E("div", { class: "input-col" }, [E("div", { class: "field-label" }, "RPE (opcional)"), rpeSeg]),
    confirmBtn,
  ]);

  // Foca o campo de reps após montar (mantém o teclado aberto).
  requestAnimationFrame(() => { focusEl && focusEl.focus(); });

  return E("section", { class: "screen" }, [
    navBar(exercise.name, { back: () => { state.setInput = null; pop(); }, inline: true }),
    E("div", { class: "scroll set-input-scroll" }, [lastCard, history, inputArea]),
  ]);
}

// ════════════ SELETOR DE EXERCÍCIO (folha) ════════════
function openPicker(onSelect, defaultCategory) {
  let search = "";
  const overlay = E("div", { class: "overlay sheet-overlay" });
  const listEl = E("div", { class: "picker-list" });

  const close = () => overlay.remove();
  const select = (name) => { const t = name.trim(); if (!t) return; close(); onSelect(t); };

  // Passo de criação: escolhe em qual divisão (Push/Pull/Upper/Lower) o novo
  // exercício será alocado antes de adicioná-lo ao treino.
  function startCreate(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    let chosen = db.TRAINING_TYPES.includes(defaultCategory) ? defaultCategory : db.TRAINING_TYPES[0];
    listEl.innerHTML = "";
    const seg = E("div", { class: "segmented" }, db.TRAINING_TYPES.map((t) =>
      E("button", {
        class: "seg" + (t === chosen ? " active" : ""),
        onclick: (e) => {
          chosen = t;
          seg.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
          e.currentTarget.classList.add("active");
        },
      }, t)
    ));
    listEl.appendChild(E("div", { class: "create-cat" }, [
      E("div", { class: "section-header" }, `Criar “${trimmed}”`),
      E("div", { class: "field-label create-cat-label" }, "Em qual divisão de treino?"),
      seg,
      E("button", {
        class: "btn-primary", onclick: () => { db.createCatalogExercise(trimmed, chosen); select(trimmed); },
      }, "Criar e adicionar"),
      E("button", { class: "nav-btn create-cat-back", onclick: renderList }, "Voltar"),
    ]));
  }

  function renderList() {
    listEl.innerHTML = "";
    const all = db.catalog();
    const q = search.trim().toLowerCase();
    const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
    const canCreate = q && !all.some((c) => c.name.toLowerCase() === q);

    if (canCreate) {
      listEl.appendChild(E("div", { class: "card list" }, [
        E("button", { class: "row tappable accent", onclick: () => startCreate(search) },
          [icon("plus", "icon"), E("span", { class: "row-title accent" }, `Criar “${search.trim()}”`)]),
      ]));
    }
    listEl.appendChild(E("div", { class: "card list" }, filtered.map((c) =>
      E("button", { class: "row tappable", onclick: () => select(c.name) }, [
        E("span", { class: "row-title" }, c.name),
        c.category ? E("span", { class: "muted sm" }, c.category) : null,
      ])
    )));
  }

  const input = E("input", { class: "search-input", type: "text", placeholder: "Buscar ou criar exercício", autocomplete: "off" });
  input.addEventListener("input", () => { search = input.value; renderList(); });

  overlay.appendChild(E("div", { class: "sheet picker-sheet", onclick: (e) => e.stopPropagation() }, [
    E("header", { class: "navbar inline sheet-nav" }, [
      E("div", { class: "nav-side nav-left" }, [E("button", { class: "nav-btn", onclick: close }, "Cancelar")]),
      E("h1", { class: "nav-title" }, "Exercício"),
      E("div", { class: "nav-side nav-right" }, []),
    ]),
    E("div", { class: "search-bar" }, [input]),
    listEl,
  ]));
  overlay.addEventListener("click", close);
  document.body.appendChild(overlay);
  renderList();
  requestAnimationFrame(() => input.focus());
}

// ════════════ DIETA ════════════
// Dia exibido na aba Dieta (início do dia em ms).
function dietDay() {
  return state.dietDate != null ? state.dietDate : fmt.startOfDay(Date.now());
}

const DAY_MS = 86_400_000;

// Refeição sugerida pelo horário.
function suggestMealType(ms = Date.now()) {
  const d = new Date(ms);
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return "cafe";
  if (h < 14.5) return "almoco";
  if (h < 18.5) return "lanche";
  return "jantar";
}

// Registro em outro dia entra ao meio-dia (ordem estável); hoje entra agora.
function mealDate(dayMs) {
  return dayMs === fmt.startOfDay(Date.now()) ? Date.now() : dayMs + DAY_MS / 2;
}

function dietRoot() {
  const day = dietDay();
  const bal = db.dailyBalance(day);
  const groups = db.mealsForDay(day);
  const trailing = [
    E("button", { class: "nav-btn icon-btn", title: "Perfil", onclick: () => push({ name: "profile" }) }, [icon("user", "icon")]),
  ];

  const sections = db.MEAL_TYPES.map(([id, label]) => {
    const entries = groups[id] || [];
    const subtotal = entries.reduce((s, e) => s + db.entryMacros(e).kcal, 0);
    const rows = entries.map((entry) => {
      const m = db.entryMacros(entry);
      const row = E("button", { class: "row tappable", onclick: () => openMealEntryEditor(entry) }, [
        E("div", { class: "row-main" }, [
          E("div", { class: "row-title" }, entry.name),
          E("div", { class: "row-sub" }, [
            chip(fmt.grams(entry.grams)),
            m.protein >= 1 ? chip(`P ${Math.round(m.protein)} g`) : null,
          ]),
        ]),
        E("span", { class: "row-kcal" }, fmt.kcal(m.kcal)),
      ]);
      attachLongPress(row, () => confirmDelete("Apagar alimento?", () => { db.deleteMealEntry(entry.id); render(); }));
      return row;
    });

    return E("div", {}, [
      E("div", { class: "section-header sh-split" }, [
        E("span", {}, label),
        subtotal > 0 ? E("span", { class: "sh-value" }, fmt.kcal(subtotal)) : null,
      ]),
      E("div", { class: "card list" }, [
        ...rows,
        E("button", { class: "row tappable accent", onclick: () => openFoodPicker(id, day) },
          [icon("plus", "icon"), E("span", { class: "row-title accent" }, "Adicionar alimento")]),
      ]),
    ]);
  });

  return E("section", { class: "screen" }, [
    navBar("Dieta", { trailing }),
    E("div", { class: "scroll" }, [
      dayNav(),
      dailySummaryCard(bal),
      ...sections,
      bal.logged ? E("p", { class: "hint" }, "Toque para editar · segure para apagar") : null,
    ]),
  ]);
}

// Navegador de dia: ‹ Hoje ›.
function dayNav() {
  const day = dietDay();
  const today = fmt.startOfDay(Date.now());
  const label = day === today ? "Hoje"
    : day === fmt.startOfDay(today - DAY_MS / 2) ? "Ontem"
    : fmt.shortDate(day);
  const go = (d) => { state.dietDate = d >= today ? null : d; render(); };
  return E("div", { class: "day-nav" }, [
    E("button", { class: "day-btn", onclick: () => go(fmt.startOfDay(day - DAY_MS / 2)) }, [icon("back", "icon sm")]),
    E("button", { class: "day-label", onclick: () => go(today) }, label),
    E("button", { class: "day-btn", disabled: day >= today, onclick: () => go(fmt.startOfDay(day + DAY_MS * 1.5)) }, [icon("forward", "icon sm")]),
  ]);
}

// Card-resumo do dia: saldo, barra de progresso, macros e cardio.
function dailySummaryCard(bal) {
  const macroRow = E("div", { class: "macro-row" }, [
    ["Proteína", bal.macros.protein], ["Carboidrato", bal.macros.carbs], ["Gordura", bal.macros.fat],
  ].map(([label, v]) => E("div", { class: "macro" }, [
    E("span", { class: "macro-label" }, label),
    E("span", { class: "macro-value" }, `${Math.round(v)} g`),
  ])));

  if (bal.target == null) {
    return E("div", { class: "card diet-summary" }, [
      E("div", { class: "kcal-remaining" }, fmt.kcal(bal.consumed)),
      E("div", { class: "muted sm" }, "kcal consumidas neste dia"),
      macroRow,
      E("button", { class: "btn-primary", onclick: () => push({ name: "profile" }) }, "Configurar meta de calorias"),
    ]);
  }

  const over = bal.remaining < 0;
  const pct = Math.min(100, bal.allowance > 0 ? (bal.consumed / bal.allowance) * 100 : 0);
  const cardioCounted = db.profile()?.countCardioInBalance;
  return E("div", { class: "card diet-summary" }, [
    E("div", { class: "kcal-remaining" + (over ? " over" : "") },
      over ? `Excedeu ${fmt.kcal(-bal.remaining)}` : `Restam ${fmt.kcal(bal.remaining)}`),
    E("div", { class: "kcal-bar" }, [
      E("div", { class: "kcal-bar-fill" + (over ? " over" : ""), style: `width:${pct.toFixed(1)}%` }),
    ]),
    E("div", { class: "muted sm" }, `${fmt.kcal(bal.consumed)} de ${fmt.kcal(bal.allowance)}`),
    macroRow,
    bal.cardioKcal > 0 ? E("div", { class: "cardio-line" }, [
      icon("flame", "icon sm"),
      E("span", {}, cardioCounted
        ? `Cardio: +${fmt.kcal(bal.cardioKcal)} na meta do dia`
        : `Cardio: ${fmt.kcal(bal.cardioKcal)} gastas (fora da meta)`),
    ]) : null,
  ]);
}

// ════════════ SELETOR DE ALIMENTO (folha) ════════════
function openFoodPicker(mealType, dayMs) {
  let search = "";
  const overlay = E("div", { class: "overlay sheet-overlay" });
  const listEl = E("div", { class: "picker-list" });
  const searchBar = E("div", { class: "search-bar" });
  const navTitle = E("h1", { class: "nav-title" }, "Alimento");

  const close = () => overlay.remove();

  function foodRow(ref) {
    // Resultado da internet é salvo em "Meus alimentos" ao ser escolhido.
    const pick = () => showAmount(ref.source === "off" ? db.saveOnlineFood(ref) : ref);
    return E("button", { class: "row tappable", onclick: pick }, [
      E("div", { class: "row-main" }, [
        E("div", { class: "row-title" }, ref.name),
        E("div", { class: "row-sub" }, [
          chip(`${Math.round(ref.per100.kcal)} kcal / 100 g`),
          chip(`P ${ref.per100.protein} g`),
          ref.source === "custom" ? chip("meu") : null,
          ref.source === "off" ? chip("internet") : null,
        ]),
      ]),
    ]);
  }

  // Busca explícita no Open Food Facts; resultados entram abaixo dos locais.
  async function searchOnline(q, container) {
    container.innerHTML = "";
    container.appendChild(E("p", { class: "empty-inline center" }, "Buscando na internet…"));
    try {
      const results = await db.searchOnlineFoods(q);
      container.innerHTML = "";
      if (!results.length) {
        container.appendChild(E("p", { class: "empty-inline center" }, "Nenhum produto encontrado na internet."));
        return;
      }
      container.appendChild(E("div", { class: "section-header" }, "Internet (Open Food Facts)"));
      container.appendChild(E("div", { class: "card list" }, results.map(foodRow)));
    } catch (e) {
      container.innerHTML = "";
      container.appendChild(E("p", { class: "empty-inline center" }, "Não foi possível buscar agora — verifique a internet."));
    }
  }

  function renderList() {
    listEl.innerHTML = "";
    const q = search.trim();
    if (!q) {
      const recents = db.recentFoods();
      const customs = db.customFoods().map((f) => db.resolveFoodRef({ source: "custom", refId: f.id }));
      if (recents.length) {
        listEl.appendChild(E("div", { class: "section-header" }, "Recentes"));
        listEl.appendChild(E("div", { class: "card list" }, recents.map(foodRow)));
      }
      if (customs.length) {
        listEl.appendChild(E("div", { class: "section-header" }, "Meus alimentos"));
        listEl.appendChild(E("div", { class: "card list" }, customs.map(foodRow)));
      }
      if (!recents.length && !customs.length) {
        listEl.appendChild(E("p", { class: "empty-inline center" }, "Busque um alimento da tabela TACO ou crie o seu."));
      }
      return;
    }
    const results = db.searchFoods(q);
    const exact = results.some((r) => r.name.toLowerCase() === q.toLowerCase());
    if (!exact) {
      listEl.appendChild(E("div", { class: "card list" }, [
        E("button", { class: "row tappable accent", onclick: () => showCreate(q) },
          [icon("plus", "icon"), E("span", { class: "row-title accent" }, `Criar “${q}”`)]),
      ]));
    }
    if (results.length) {
      listEl.appendChild(E("div", { class: "card list" }, results.map(foodRow)));
    } else {
      listEl.appendChild(E("p", { class: "empty-inline center" }, "Nada encontrado na TACO. Busque na internet ou crie o alimento."));
    }
    // Busca online sob demanda (um toque; não a cada tecla).
    const onlineWrap = E("div", {});
    onlineWrap.appendChild(E("div", { class: "card list" }, [
      E("button", { class: "row tappable accent", onclick: () => searchOnline(q, onlineWrap) },
        [icon("globe", "icon"), E("span", { class: "row-title accent" }, `Buscar “${q}” na internet`)]),
    ]));
    listEl.appendChild(onlineWrap);
  }

  // Passo de criação de alimento personalizado (valores por 100 g).
  function showCreate(name) {
    navTitle.textContent = "Novo alimento";
    searchBar.style.display = "none";
    listEl.innerHTML = "";
    const field = (label, placeholder, inputmode = "decimal") => {
      const input = E("input", { class: "form-input wide", type: inputmode === "text" ? "text" : "number", inputmode, min: "0", placeholder });
      return { row: E("div", { class: "form-row" }, [E("span", { class: "form-label" }, label), input]), input };
    };
    const nameField = field("Nome", "Ex.: Pão de queijo da vó", "text");
    nameField.input.value = name;
    const kcalField = field("kcal / 100 g", "250", "numeric");
    const protField = field("Proteína (g)", "8");
    const carbField = field("Carboidrato (g)", "30");
    const fatField = field("Gordura (g)", "10");
    const unitNameField = field("Nome da porção (opcional)", "fatia, unidade…", "text");
    const unitGramsField = field("Gramas por porção", "50", "numeric");

    const createBtn = E("button", {
      class: "btn-primary",
      onclick: () => {
        const food = db.createFood({
          name: nameField.input.value,
          per100: { kcal: kcalField.input.value, protein: protField.input.value, carbs: carbField.input.value, fat: fatField.input.value },
          unitName: unitNameField.input.value,
          unitGrams: unitGramsField.input.value,
        });
        if (!food) return;
        showAmount(db.resolveFoodRef({ source: "custom", refId: food.id }));
      },
    }, "Criar e adicionar");

    listEl.appendChild(E("div", { class: "create-food-form" }, [
      E("div", { class: "card list" }, [nameField.row]),
      E("div", { class: "section-header" }, "Por 100 g"),
      E("div", { class: "card list" }, [kcalField.row, protField.row, carbField.row, fatField.row]),
      E("div", { class: "section-header" }, "Porção (opcional)"),
      E("div", { class: "card list" }, [unitNameField.row, unitGramsField.row]),
      createBtn,
      E("button", { class: "nav-btn create-cat-back", onclick: () => { navTitle.textContent = "Alimento"; searchBar.style.display = ""; renderList(); } }, "Voltar"),
    ]));
  }

  // Passo de quantidade: gramas + refeição, com prévia de kcal/macros.
  function showAmount(ref) {
    navTitle.textContent = "Quantidade";
    searchBar.style.display = "none";
    listEl.innerHTML = "";

    let chosenMeal = mealType || suggestMealType();
    const preview = E("div", { class: "amount-preview" });
    const gramsField = makeStepperField(ref.unitGrams || 100, { step: 10, decimals: 0 }, () => updatePreview());
    function updatePreview() {
      const f = gramsField.get() / 100;
      preview.textContent = `≈ ${fmt.kcal(ref.per100.kcal * f)} · P ${Math.round(ref.per100.protein * f)} g · C ${Math.round(ref.per100.carbs * f)} g · G ${Math.round(ref.per100.fat * f)} g`;
    }
    updatePreview();

    const unitChips = ref.unitGrams ? E("div", { class: "unit-chips" }, [1, 2, 3].map((n) =>
      E("button", { class: "unit-chip", onclick: () => { gramsField.set(n * ref.unitGrams); updatePreview(); } },
        `${n} ${ref.unitName || "porção"}${n > 1 ? "s" : ""} (${fmt.grams(n * ref.unitGrams)})`)
    )) : null;

    const mealSeg = E("div", { class: "segmented small" }, db.MEAL_TYPES.map(([id, label]) =>
      E("button", {
        class: "seg" + (id === chosenMeal ? " active" : ""),
        onclick: (e) => {
          chosenMeal = id;
          mealSeg.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
          e.currentTarget.classList.add("active");
        },
      }, label.replace("Café da manhã", "Café"))
    ));

    listEl.appendChild(E("div", { class: "amount-form" }, [
      E("div", { class: "amount-food" }, ref.name),
      E("div", { class: "field-label" }, "Quantidade (g)"),
      gramsField.el,
      unitChips,
      preview,
      E("div", { class: "field-label" }, "Refeição"),
      mealSeg,
      E("button", {
        class: "btn-primary green",
        onclick: () => {
          const grams = gramsField.get();
          if (grams <= 0) return;
          db.logMeal({ foodRef: ref, name: ref.name, per100: ref.per100, grams, mealType: chosenMeal, date: mealDate(dayMs) });
          close();
          render();
          toast(`Adicionado: ${ref.name}`);
        },
      }, [icon("check", "icon sm"), E("span", {}, "Adicionar")]),
    ]));
  }

  const input = E("input", { class: "search-input", type: "text", placeholder: "Buscar alimento (TACO)", autocomplete: "off" });
  input.addEventListener("input", () => { search = input.value; renderList(); });
  searchBar.appendChild(input);

  overlay.appendChild(E("div", { class: "sheet picker-sheet", onclick: (e) => e.stopPropagation() }, [
    E("header", { class: "navbar inline sheet-nav" }, [
      E("div", { class: "nav-side nav-left" }, [E("button", { class: "nav-btn", onclick: close }, "Cancelar")]),
      navTitle,
      E("div", { class: "nav-side nav-right" }, []),
    ]),
    searchBar,
    listEl,
  ]));
  overlay.addEventListener("click", close);
  document.body.appendChild(overlay);
  renderList();
  requestAnimationFrame(() => input.focus());
}

// Folha compacta para editar gramas/refeição de uma entrada existente.
function openMealEntryEditor(entry) {
  const overlay = E("div", { class: "overlay sheet-overlay" });
  const close = () => overlay.remove();

  let chosenMeal = entry.mealType;
  const preview = E("div", { class: "amount-preview" });
  const gramsField = makeStepperField(entry.grams, { step: 10, decimals: 0 }, () => updatePreview());
  function updatePreview() {
    const f = gramsField.get() / 100;
    preview.textContent = `≈ ${fmt.kcal(entry.per100.kcal * f)} · P ${Math.round(entry.per100.protein * f)} g · C ${Math.round(entry.per100.carbs * f)} g · G ${Math.round(entry.per100.fat * f)} g`;
  }
  updatePreview();

  const mealSeg = E("div", { class: "segmented small" }, db.MEAL_TYPES.map(([id, label]) =>
    E("button", {
      class: "seg" + (id === chosenMeal ? " active" : ""),
      onclick: (e) => {
        chosenMeal = id;
        mealSeg.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
      },
    }, label.replace("Café da manhã", "Café"))
  ));

  overlay.appendChild(E("div", { class: "sheet compact", onclick: (e) => e.stopPropagation() }, [
    E("header", { class: "navbar inline sheet-nav" }, [
      E("div", { class: "nav-side nav-left" }, [E("button", { class: "nav-btn", onclick: close }, "Cancelar")]),
      E("h1", { class: "nav-title" }, "Editar"),
      E("div", { class: "nav-side nav-right" }, []),
    ]),
    E("div", { class: "amount-form" }, [
      E("div", { class: "amount-food" }, entry.name),
      E("div", { class: "field-label" }, "Quantidade (g)"),
      gramsField.el,
      preview,
      E("div", { class: "field-label" }, "Refeição"),
      mealSeg,
      E("button", {
        class: "btn-primary",
        onclick: () => {
          db.updateMealEntry(entry.id, { grams: gramsField.get(), mealType: chosenMeal });
          close();
          render();
        },
      }, "Salvar"),
    ]),
  ]));
  overlay.addEventListener("click", close);
  document.body.appendChild(overlay);
}

// ════════════ PERFIL ════════════
function profileScreen() {
  // Valores padrão apenas para exibição; só viram dados ao editar.
  const p = {
    weightKg: 70, heightCm: 170, age: 25, sex: "M", activityLevel: "leve",
    goal: "perder", targetMode: "auto", manualTargetKcal: null, countCardioInBalance: true,
    ...(db.profile() || {}),
  };

  // Card de resultados atualizado localmente (sem re-render, para não perder o foco).
  const resultsCard = E("div", { class: "card metrics" });
  function refreshResults() {
    const prof = db.profile();
    const b = db.bmr(prof), t = db.tdee(prof), target = db.dailyTarget(prof);
    const cardioToday = db.dailyCardioKcal(fmt.startOfDay(Date.now()));
    const counts = !!(prof && prof.countCardioInBalance);
    const todayTarget = target == null ? null : target + (counts ? cardioToday : 0);
    resultsCard.innerHTML = "";
    resultsCard.append(
      metricRow("TMB (em repouso)", b != null ? fmt.kcal(b) : "—"),
      metricRow("Gasto diário (TDEE)", t != null ? fmt.kcal(t) : "—"),
      metricRow("Meta base", target != null ? fmt.kcal(target) : "—"),
      metricRow("Cardio de hoje", cardioToday > 0 ? `+${fmt.kcal(cardioToday)}` : "nenhum registro"),
      metricRow("Meta de hoje", todayTarget != null
        ? fmt.kcal(todayTarget) + (counts && cardioToday > 0 ? " (base + cardio)" : "")
        : "—"),
    );
  }

  // Campos digitáveis salvam sem re-render; controles de toque re-renderizam.
  const set = (patch) => { Object.assign(p, patch); db.saveProfile(patch); refreshResults(); };
  const setAndRender = (patch) => { db.saveProfile(patch); render(); };

  const weightField = makeStepperField(p.weightKg, { step: 0.5 }, (v) => set({ weightKg: v }));
  const numInput = (value, placeholder, onValue) => {
    const input = E("input", {
      class: "form-input", type: "number", inputmode: "numeric", min: "0", placeholder,
      value: value ? String(value) : "",
    });
    input.addEventListener("input", () => { onValue(parseInt(input.value, 10) || null); });
    return input;
  };
  const heightInput = numInput(db.profile()?.heightCm, "170", (v) => set({ heightCm: v }));
  const ageInput = numInput(db.profile()?.age, "25", (v) => set({ age: v }));

  const formRow = (label, control) =>
    E("div", { class: "form-row" }, [E("span", { class: "form-label" }, label), control]);

  const sexSeg = segmented(["Masculino", "Feminino"], p.sex === "F" ? "Feminino" : "Masculino",
    (opt) => setAndRender({ sex: opt === "Feminino" ? "F" : "M" }));

  const activitySelect = E("select", {
    class: "select",
    onchange: (e) => setAndRender({ activityLevel: e.target.value }),
  }, db.ACTIVITY_LEVELS.map(([id, label]) =>
    E("option", { value: id, selected: id === p.activityLevel }, label)));

  const goalSeg = segmented(db.GOALS.map(([, label]) => label),
    (db.GOALS.find(([id]) => id === p.goal) || db.GOALS[0])[1],
    (label) => setAndRender({ goal: db.GOALS.find(([, l]) => l === label)[0] }));

  const modeSeg = segmented(["Automática", "Manual"], p.targetMode === "manual" ? "Manual" : "Automática",
    (opt) => setAndRender({ targetMode: opt === "Manual" ? "manual" : "auto" }));

  const manualInput = numInput(p.manualTargetKcal, "2000", (v) => set({ manualTargetKcal: v }));

  // A linha inteira alterna o switch (alvo de toque generoso); o switch é só indicador.
  const cardioToggleRow = E("button", {
    class: "form-row row tappable",
    onclick: () => setAndRender({ countCardioInBalance: !p.countCardioInBalance }),
  }, [
    E("span", { class: "form-label" }, "Somar cardio à meta do dia"),
    E("span", { class: "switch" + (p.countCardioInBalance ? " on" : "") }, [E("span", { class: "knob" })]),
  ]);

  refreshResults();

  return E("section", { class: "screen" }, [
    navBar("Perfil", { back: pop, inline: true }),
    E("div", { class: "scroll" }, [
      E("div", { class: "section-header" }, "Sobre você"),
      E("div", { class: "card list" }, [
        formRow("Peso (kg)", weightField.el),
        formRow("Altura (cm)", heightInput),
        formRow("Idade", ageInput),
      ]),
      E("div", { class: "section-header" }, "Sexo"),
      E("div", { class: "seg-wrap" }, [sexSeg]),
      E("div", { class: "section-header" }, "Nível de atividade"),
      E("div", { class: "select-wrap flush" }, [activitySelect]),
      E("div", { class: "section-header" }, "Objetivo"),
      E("div", { class: "seg-wrap" }, [goalSeg]),
      E("div", { class: "section-header" }, "Meta de calorias"),
      E("div", { class: "seg-wrap" }, [modeSeg]),
      p.targetMode === "manual"
        ? E("div", { class: "card list" }, [formRow("Meta diária (kcal)", manualInput)])
        : null,
      E("div", { class: "card list", style: "margin-top: 10px" }, [cardioToggleRow]),
      E("p", { class: "hint" }, p.countCardioInBalance
        ? "Cada cardio registrado soma na meta do dia em que foi feito (veja “Meta de hoje” abaixo). Prefira um nível de atividade Sedentário ou Leve para não contar o exercício duas vezes."
        : "Desligado: o cardio aparece apenas como informação e a meta do dia fica fixa."),
      E("div", { class: "section-header" }, "Resultado"),
      resultsCard,
      E("p", { class: "hint" }, "Gasto diário (TDEE) = TMB × nível de atividade. Meta base = TDEE ajustado ao objetivo (ou meta manual). As alterações são salvas automaticamente."),
    ]),
  ]);
}

// ════════════ HISTÓRICO ════════════
function sessionRow(s) {
  const row = E("button", { class: "row tappable", onclick: () => push({ name: "sessionDetail", sessionId: s.id }) }, [
    E("div", { class: "row-main" }, [
      E("div", { class: "row-title with-dot" }, [typeDot(s.typeRaw), s.typeRaw]),
      E("div", { class: "row-sub" }, [
        chip(`${s.exercises.length} exercícios`),
        chip(fmt.weight(db.sessionVolume(s))),
        db.sessionDuration(s) != null ? chip(fmt.duration(db.sessionDuration(s))) : null,
      ]),
    ]),
    E("span", { class: "row-date muted sm" }, fmt.shortDate(s.date)),
    E("span", { class: "chevron", html: ICONS.back }),
  ]);
  attachLongPress(row, () => confirmDelete("Apagar treino?", () => { db.deleteSession(s.id); render(); }));
  return row;
}

function cardioRow(c) {
  const row = E("button", { class: "row tappable", onclick: () => push({ name: "cardioDetail", cardioId: c.id }) }, [
    E("div", { class: "row-main" }, [
      E("div", { class: "row-title with-dot" }, [typeDot("Cardio"), c.activity]),
      E("div", { class: "row-sub" }, [
        chip(fmt.duration(c.durationMin * 60)),
        chip(fmt.kcal(c.kcal)),
        c.distanceKm ? chip(`${c.distanceKm.toLocaleString("pt-BR")} km`) : null,
      ]),
    ]),
    E("span", { class: "row-date muted sm" }, fmt.shortDate(c.date)),
    E("span", { class: "chevron", html: ICONS.back }),
  ]);
  attachLongPress(row, () => confirmDelete("Apagar cardio?", () => { db.deleteCardio(c.id); render(); }));
  return row;
}

function historyRoot() {
  const items = db.historyItems();
  const trailing = [
    E("button", { class: "nav-btn icon-btn", title: "Importar CSV", onclick: importCSVFlow }, [icon("download", "icon")]),
    E("button", { class: "nav-btn icon-btn", title: "Exportar CSV", onclick: exportFlow }, [icon("share", "icon")]),
  ];

  if (!items.length) {
    return E("section", { class: "screen" }, [
      navBar("Histórico", { trailing }),
      emptyState("calendar", "Nenhum treino registrado", "Treinos encerrados e cardio aparecem aqui."),
    ]);
  }

  const groups = db.groupByMonth(items);
  return E("section", { class: "screen" }, [
    navBar("Histórico", { trailing }),
    E("div", { class: "scroll" }, groups.map((g) =>
      E("div", { class: "month-group" }, [
        E("div", { class: "section-header" }, g.title),
        E("div", { class: "card list" }, g.sessions.map((item) =>
          item.kind === "cardio" ? cardioRow(item.entry) : sessionRow(item.session))),
      ])
    )),
  ]);
}

function sessionDetailScreen(sessionId) {
  const s = db.sessionById(sessionId);
  if (!s) { pop(); return E("div"); }

  const summary = E("div", { class: "card metrics" }, [
    metricRow("Data", fmt.dateTime(s.date)),
    metricRow("Tipo", s.typeRaw),
    db.sessionDuration(s) != null ? metricRow("Duração", fmt.duration(db.sessionDuration(s))) : null,
    metricRow("Volume total", fmt.weight(db.sessionVolume(s))),
    db.sessionDensity(s) != null ? metricRow("Densidade", `${Math.round(db.sessionDensity(s))} kg/min`) : null,
  ]);

  const exercises = db.orderedExercises(s).map((ex) =>
    E("div", { class: "detail-ex" }, [
      E("div", { class: "section-header" }, ex.name),
      E("div", { class: "card list" }, db.orderedSets(ex).map((set) =>
        E("div", { class: "set-row detail" }, [
          E("span", { class: "muted" }, `Série ${set.setNumber}`),
          set.side ? E("span", { class: "side-badge" }, sideLabel(set.side)) : null,
          E("span", { class: "spacer" }),
          E("span", { class: "set-weight" }, fmt.weight(set.weightKg)),
          E("span", { class: "muted" }, `× ${set.reps}`),
          set.rpe != null ? E("span", { class: "faint sm" }, `RPE ${set.rpe}`) : null,
          E("span", { class: "faint sm" }, `≈ ${Math.round(db.set1RM(set))}`),
        ])
      )),
    ])
  );

  return E("section", { class: "screen" }, [
    navBar(s.typeRaw, { back: pop, inline: true }),
    E("div", { class: "scroll" }, [
      E("div", { class: "section-header" }, "Resumo"),
      summary,
      ...exercises,
      s.notes ? E("div", {}, [E("div", { class: "section-header" }, "Notas"), E("div", { class: "card" }, [E("p", { class: "notes" }, s.notes)])]) : null,
    ]),
  ]);
}

// ════════════ STATS ════════════
function statsRoot() {
  const sessions = db.endedSessions();
  const balance = db.balanceHistory(28);
  const hasNutrition = balance.some((d) => d.logged);

  if (!sessions.length && !hasNutrition) {
    return E("section", { class: "screen" }, [
      navBar("Estatísticas"),
      emptyState("chart", "Sem dados ainda", "Conclua treinos ou registre refeições para ver suas estatísticas."),
    ]);
  }

  const children = [];

  if (sessions.length) {
    const names = db.exerciseNames(sessions);
    if (state.statsExercise == null || !names.includes(state.statsExercise)) state.statsExercise = names[0] || null;
    const selector = E("select", { class: "select", onchange: (e) => { state.statsExercise = e.target.value; render(); } },
      names.map((n) => E("option", { value: n, selected: n === state.statsExercise }, n)));
    const ex = state.statsExercise;

    children.push(
      heatmapCard(db.activityCalendar(sessions)),
      chartCard("Volume semanal por tipo", volumeChart(db.weeklyVolume(sessions))),
      ex ? E("div", { class: "stats-ex" }, [
        E("div", { class: "select-wrap" }, [selector]),
        chartCard(`1RM estimado — ${ex}`, lineChart(db.oneRMProgress(ex, sessions))),
        chartCard(`Carga máxima — ${ex}`, barChart(db.loadProgress(ex, sessions))),
      ]) : null,
    );
  }

  if (hasNutrition) {
    const target = db.dailyTarget();
    const avg = db.avgDeficit(7);
    const streak = db.deficitStreak();
    children.push(
      E("div", { class: "section-header", style: "padding-top: 22px" }, "Nutrição"),
      target != null || avg != null ? E("div", { class: "card metrics" }, [
        target != null ? metricRow("Meta atual", fmt.kcal(target)) : null,
        avg != null ? metricRow("Média (7 dias)", avg >= 0
          ? `${fmt.kcal(avg)} abaixo da meta`
          : `${fmt.kcal(-avg)} acima da meta`) : null,
        target != null ? metricRow("Sequência na meta", streak === 1 ? "1 dia" : `${streak} dias`) : null,
      ]) : null,
      chartCard("Calorias por dia (4 semanas)", balanceChart(balance)),
    );
  }

  return E("section", { class: "screen" }, [
    navBar("Estatísticas"),
    E("div", { class: "scroll" }, children),
  ]);
}

function chartCard(title, svgHtml) {
  return E("div", { class: "chart-card" }, [
    E("div", { class: "chart-title" }, title),
    E("div", { class: "chart-body", html: svgHtml }),
  ]);
}

// Card do mapa de atividade (estilo GitHub): corpo rolável na horizontal,
// posicionado no presente, com legenda Menos → Mais.
function heatmapCard(weeks) {
  const activeDays = weeks.reduce((sum, wk) => sum + wk.days.filter((d) => d.count > 0).length, 0);
  const scale = E("div", { class: "hm-legend" }, [
    E("span", { class: "hm-legend-label" }, "Menos"),
    ...[0, 1, 2, 3, 4].map((l) => E("span", { class: `hm hm-${l} hm-swatch` })),
    E("span", { class: "hm-legend-label" }, "Mais"),
  ]);
  const body = E("div", { class: "chart-body hm-scroll", html: heatmapChart(weeks) });
  // Posiciona a rolagem no presente (extremidade direita), como no GitHub.
  requestAnimationFrame(() => { body.scrollLeft = body.scrollWidth; });

  return E("div", { class: "chart-card" }, [
    E("div", { class: "chart-title" }, "Atividade"),
    E("div", { class: "chart-sub muted sm" }, activeDays ? `${activeDays} dias na academia no último ano` : "Seus dias de treino aparecem aqui."),
    body,
    scale,
  ]);
}

// ── Componentes reutilizáveis ────────────────────────────────────────────────
function screenFor(s) {
  if (s.name === "setInput") return setInputScreen(s.exerciseId);
  if (s.name === "sessionDetail") return sessionDetailScreen(s.sessionId);
  if (s.name === "profile") return profileScreen();
  if (s.name === "cardioLog") return cardioLogScreen();
  if (s.name === "cardioDetail") return cardioDetailScreen(s.cardioId);
  return E("div");
}

function segmented(options, selected, onPick) {
  return E("div", { class: "segmented" }, options.map((opt) =>
    E("button", { class: "seg" + (opt === selected ? " active" : ""), onclick: () => onPick(opt) }, opt)
  ));
}

function chip(text) { return text ? E("span", { class: "chip" }, text) : null; }
function typeDot(type) { return E("span", { class: "type-dot", style: `background:${TYPE_COLORS[type] || "#888"}` }); }
function metricRow(label, value) {
  return E("div", { class: "metric-row" }, [E("span", { class: "muted" }, label), E("span", { class: "metric-value" }, value)]);
}
function emptyState(ic, title, sub) {
  return E("div", { class: "empty-state" }, [icon(ic, "empty-icon"), E("h2", {}, title), E("p", { class: "muted" }, sub)]);
}

// ── Folhas de ação / diálogos ─────────────────────────────────────────────────
function openActionSheet({ title, message, actions }) {
  const overlay = E("div", { class: "overlay action-overlay" });
  const close = () => overlay.remove();
  const card = E("div", { class: "action-card", onclick: (e) => e.stopPropagation() }, [
    (title || message) ? E("div", { class: "action-head" }, [
      title ? E("div", { class: "action-title" }, title) : null,
      message ? E("div", { class: "action-msg" }, message) : null,
    ]) : null,
    ...actions.filter((a) => a.role !== "cancel").map((a) =>
      E("button", { class: "action-btn" + (a.role === "destructive" ? " destructive" : ""), onclick: () => { close(); a.onClick && a.onClick(); } }, a.label)),
  ]);
  const cancel = actions.find((a) => a.role === "cancel");
  const wrap = E("div", { class: "action-wrap", onclick: (e) => e.stopPropagation() }, [
    card,
    cancel ? E("button", { class: "action-btn cancel", onclick: () => { close(); cancel.onClick && cancel.onClick(); } }, cancel.label) : null,
  ]);
  overlay.appendChild(wrap);
  overlay.addEventListener("click", close);
  document.body.appendChild(overlay);
}

function confirmDelete(title, onConfirm) {
  openActionSheet({ title, actions: [{ label: "Apagar", role: "destructive", onClick: onConfirm }, { label: "Cancelar", role: "cancel" }] });
}

// Long-press (toque longo) + clique direito → ação de apagar.
function attachLongPress(node, handler) {
  let timer = null;
  const start = () => { timer = setTimeout(() => { timer = null; handler(); }, 500); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  node.addEventListener("touchstart", start, { passive: true });
  node.addEventListener("touchend", cancel);
  node.addEventListener("touchmove", cancel, { passive: true });
  node.addEventListener("contextmenu", (e) => { e.preventDefault(); handler(); });
}

function toast(msg) {
  const t = E("div", { class: "toast" }, msg);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2200);
}

// ── Exportar / importar CSV ───────────────────────────────────────────────────
async function shareCSVFile(csv, filename) {
  try {
    const file = new File([csv], filename, { type: "text/csv" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "GymLog" });
      return;
    }
  } catch (e) { if (e && e.name === "AbortError") return; }
  // Fallback: download direto.
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = E("a", { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Folha com um export por tipo de dado (só os que têm registros).
function exportFlow() {
  const sessions = db.endedSessions();
  const actions = [];
  if (sessions.length) {
    actions.push({ label: "Treinos", onClick: () => shareCSVFile(db.generateCSV(sessions), db.exportFilename()) });
  }
  if (db.generateNutritionCSV().includes("\n")) {
    actions.push({ label: "Dieta (refeições)", onClick: () => shareCSVFile(db.generateNutritionCSV(), db.exportFilename("gymlog_dieta")) });
  }
  if (db.generateCardioCSV().includes("\n")) {
    actions.push({ label: "Cardio", onClick: () => shareCSVFile(db.generateCardioCSV(), db.exportFilename("gymlog_cardio")) });
  }
  if (db.customFoods().length) {
    actions.push({ label: "Meus alimentos", onClick: () => shareCSVFile(db.generateFoodsCSV(), db.exportFilename("gymlog_alimentos")) });
  }
  if (!actions.length) { toast("Nada para exportar ainda."); return; }
  actions.push({ label: "Cancelar", role: "cancel" });
  openActionSheet({ title: "Exportar CSV", actions });
}

function importCSVFlow() {
  const input = E("input", { type: "file", accept: ".csv,text/csv", style: "display:none" });
  input.addEventListener("change", async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    try {
      const r = db.importAnyCSV(await f.text());
      toast(`${r.count} ${r.kind} importado(s).`);
      render();
    } catch (e) { toast("Erro ao importar: " + e.message); }
  });
  document.body.appendChild(input); input.click(); input.remove();
}

// ── Inicialização ─────────────────────────────────────────────────────────────
db.load();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((e) => console.warn("SW falhou:", e));
  });
}
