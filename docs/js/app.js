//
// app.js — Camada de interface do GymLog.
//
// TabView (Treino, Histórico, Stats) + navegação por pilha + folhas modais,
// estilo iOS, sobre a camada de dados em store.js.
//

import * as db from "./store.js";
import * as fmt from "./format.js";
import { volumeChart, lineChart, barChart, heatmapChart, TYPE_COLORS } from "./charts.js";

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
};

function icon(name, cls = "icon") {
  return E("span", { class: cls, html: ICONS[name] || "" });
}

// ── Estado + navegação ──────────────────────────────────────────────────────
const state = {
  tab: "treino",          // treino | historico | stats
  stack: [],              // telas empilhadas: {name, ...}
  startType: "Push",      // tipo selecionado na tela inicial
  statsExercise: null,    // exercício selecionado em Stats
  setInput: null,         // estado transitório da entrada de séries
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
    ]),
  ]);
  return screen;
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
        E("button", { class: "row tappable accent", onclick: () => openPicker((name) => { db.addExercise(name, session); render(); }) },
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
    state.setInput = {
      exerciseId,
      weight: sets.length ? sets[sets.length - 1].weightKg : (last?.suggestedWeight ?? 20),
      reps: 0,
      rpe: 0,
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

  // Histórico das séries já feitas nesta sessão.
  const sets = db.orderedSets(exercise);
  const history = E("div", { class: "set-history" },
    sets.length ? sets.map((s) => {
      const row = E("div", { class: "set-row" }, [
        E("span", { class: "muted" }, `Série ${s.setNumber}`),
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

  // Display de peso (atualizado sem re-render para preservar o teclado).
  const weightDisplay = E("span", { class: "weight-value" }, si.weight.toFixed(1));
  const setWeight = (w) => { si.weight = Math.max(0, w); weightDisplay.textContent = si.weight.toFixed(1); };

  const repsInput = E("input", {
    class: "reps-input", type: "number", inputmode: "numeric", min: "0",
    value: si.reps ? String(si.reps) : "", placeholder: "0",
  });

  const confirmBtn = E("button", { class: "btn-primary green" }, [icon("check", "icon sm"), E("span", {}, "Confirmar série")]);
  const syncConfirm = () => { confirmBtn.disabled = !(parseInt(repsInput.value, 10) > 0); };
  repsInput.addEventListener("input", () => { si.reps = parseInt(repsInput.value, 10) || 0; syncConfirm(); });
  syncConfirm();

  // Seletor de RPE (—, 6..10).
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

  confirmBtn.addEventListener("click", () => {
    const reps = parseInt(repsInput.value, 10) || 0;
    if (reps <= 0) return;
    db.confirmSet(si.weight, reps, si.rpe === 0 ? null : si.rpe, exercise);
    si.reps = 0;
    render(); // a lista de séries muda; re-renderiza e refoca reps
  });

  const inputArea = E("div", { class: "input-area" }, [
    E("div", { class: "next-set" }, `Série ${exercise.sets.length + 1}`),
    E("div", { class: "input-grid" }, [
      E("div", { class: "input-col" }, [
        E("div", { class: "field-label" }, "Peso (kg)"),
        E("div", { class: "stepper" }, [
          E("button", { class: "step-btn", onclick: () => setWeight(si.weight - 2.5) }, "-2.5"),
          weightDisplay,
          E("button", { class: "step-btn", onclick: () => setWeight(si.weight + 2.5) }, "+2.5"),
        ]),
      ]),
      E("div", { class: "input-col" }, [
        E("div", { class: "field-label" }, "Reps"),
        repsInput,
      ]),
    ]),
    E("div", { class: "input-col" }, [E("div", { class: "field-label" }, "RPE (opcional)"), rpeSeg]),
    confirmBtn,
  ]);

  // Foca o campo de reps após montar (mantém o teclado aberto).
  requestAnimationFrame(() => { repsInput.focus(); });

  return E("section", { class: "screen" }, [
    navBar(exercise.name, { back: () => { state.setInput = null; pop(); }, inline: true }),
    E("div", { class: "scroll set-input-scroll" }, [lastCard, history, inputArea]),
  ]);
}

// ════════════ SELETOR DE EXERCÍCIO (folha) ════════════
function openPicker(onSelect) {
  let search = "";
  const overlay = E("div", { class: "overlay sheet-overlay" });
  const listEl = E("div", { class: "picker-list" });

  const close = () => overlay.remove();
  const select = (name) => { const t = name.trim(); if (!t) return; close(); onSelect(t); };

  function renderList() {
    listEl.innerHTML = "";
    const all = db.catalog();
    const q = search.trim().toLowerCase();
    const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
    const canCreate = q && !all.some((c) => c.name.toLowerCase() === q);

    if (canCreate) {
      listEl.appendChild(E("div", { class: "card list" }, [
        E("button", { class: "row tappable accent", onclick: () => select(search) },
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

// ════════════ HISTÓRICO ════════════
function historyRoot() {
  const sessions = db.endedSessions();
  const trailing = [
    E("button", { class: "nav-btn icon-btn", title: "Importar CSV", onclick: importCSVFlow }, [icon("download", "icon")]),
    E("button", { class: "nav-btn icon-btn", title: "Exportar CSV", disabled: !sessions.length, onclick: shareCSV }, [icon("share", "icon")]),
  ];

  if (!sessions.length) {
    return E("section", { class: "screen" }, [
      navBar("Histórico", { trailing }),
      emptyState("calendar", "Nenhum treino registrado", "Os treinos encerrados aparecem aqui."),
    ]);
  }

  const groups = db.groupByMonth(sessions);
  return E("section", { class: "screen" }, [
    navBar("Histórico", { trailing }),
    E("div", { class: "scroll" }, groups.map((g) =>
      E("div", { class: "month-group" }, [
        E("div", { class: "section-header" }, g.title),
        E("div", { class: "card list" }, g.sessions.map((s) => {
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
        })),
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
  if (!sessions.length) {
    return E("section", { class: "screen" }, [
      navBar("Estatísticas"),
      emptyState("chart", "Sem dados ainda", "Conclua alguns treinos para ver suas estatísticas."),
    ]);
  }

  const names = db.exerciseNames(sessions);
  if (state.statsExercise == null || !names.includes(state.statsExercise)) state.statsExercise = names[0] || null;

  const selector = E("select", { class: "select", onchange: (e) => { state.statsExercise = e.target.value; render(); } },
    names.map((n) => E("option", { value: n, selected: n === state.statsExercise }, n)));

  const ex = state.statsExercise;
  return E("section", { class: "screen" }, [
    navBar("Estatísticas"),
    E("div", { class: "scroll" }, [
      heatmapCard(db.activityCalendar(sessions)),
      chartCard("Volume semanal por tipo", volumeChart(db.weeklyVolume(sessions))),
      ex ? E("div", { class: "stats-ex" }, [
        E("div", { class: "select-wrap" }, [selector]),
        chartCard(`1RM estimado — ${ex}`, lineChart(db.oneRMProgress(ex, sessions))),
        chartCard(`Carga máxima — ${ex}`, barChart(db.loadProgress(ex, sessions))),
      ]) : null,
    ]),
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
async function shareCSV() {
  const sessions = db.endedSessions();
  if (!sessions.length) return;
  const csv = db.generateCSV(sessions);
  const filename = db.exportFilename();
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

function importCSVFlow() {
  const input = E("input", { type: "file", accept: ".csv,text/csv", style: "display:none" });
  input.addEventListener("change", async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    try {
      const n = db.importCSV(await f.text());
      toast(`${n} treino(s) importado(s).`);
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
