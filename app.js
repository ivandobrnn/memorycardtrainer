"use strict";

const STORAGE_KEY = "memory-card-trainer:memorizedeck-v2";
const STUDY_TIMES = [30, 60, 90, 120, 180];

const SUITS = [
  { key: "spades", symbol: "♠", name: "пики", color: "black" },
  { key: "hearts", symbol: "♥", name: "червы", color: "red" },
  { key: "diamonds", symbol: "♦", name: "бубны", color: "red" },
  { key: "clubs", symbol: "♣", name: "трефы", color: "black" },
];

const RANKS = [
  { key: "A", label: "A", name: "туз" },
  { key: "2", label: "2", name: "двойка" },
  { key: "3", label: "3", name: "тройка" },
  { key: "4", label: "4", name: "четверка" },
  { key: "5", label: "5", name: "пятерка" },
  { key: "6", label: "6", name: "шестерка" },
  { key: "7", label: "7", name: "семерка" },
  { key: "8", label: "8", name: "восьмерка" },
  { key: "9", label: "9", name: "девятка" },
  { key: "10", label: "10", name: "десятка" },
  { key: "J", label: "J", name: "валет" },
  { key: "Q", label: "Q", name: "дама" },
  { key: "K", label: "K", name: "король" },
];

const FULL_DECK = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({
    id: `${rank.key}-${suit.key}`,
    suit,
    rank,
  })),
);

const CARD_BY_ID = new Map(FULL_DECK.map((card) => [card.id, card]));

const MEMORIZE_DECK_ORDER = [
  "4-clubs",
  "2-hearts",
  "7-diamonds",
  "3-clubs",
  "4-hearts",
  "6-diamonds",
  "A-spades",
  "5-hearts",
  "9-spades",
  "2-spades",
  "Q-hearts",
  "3-diamonds",
  "Q-clubs",
  "8-hearts",
  "6-spades",
  "5-spades",
  "9-hearts",
  "K-clubs",
  "2-diamonds",
  "J-hearts",
  "3-spades",
  "8-spades",
  "6-hearts",
  "10-clubs",
  "5-diamonds",
  "K-diamonds",
  "2-clubs",
  "3-hearts",
  "8-diamonds",
  "5-clubs",
  "K-spades",
  "J-diamonds",
  "8-clubs",
  "10-spades",
  "K-hearts",
  "J-clubs",
  "7-spades",
  "10-hearts",
  "A-diamonds",
  "4-spades",
  "7-hearts",
  "4-diamonds",
  "A-clubs",
  "9-clubs",
  "J-spades",
  "Q-diamonds",
  "7-clubs",
  "Q-spades",
  "10-diamonds",
  "6-clubs",
  "A-hearts",
  "9-diamonds",
];

const TRAINING_MODES = [
  { id: "1-13", start: 1, end: 13 },
  { id: "14-26", start: 14, end: 26 },
  { id: "1-26", start: 1, end: 26 },
  { id: "27-39", start: 27, end: 39 },
  { id: "1-39", start: 1, end: 39 },
  { id: "40-52", start: 40, end: 52 },
  { id: "1-52", start: 1, end: 52 },
];

const DEFAULT_MODE_ID = TRAINING_MODES[0].id;

const els = {
  installButton: document.getElementById("installButton"),
  offlineStatus: document.getElementById("offlineStatus"),
  roundsCount: document.getElementById("roundsCount"),
  bestScore: document.getElementById("bestScore"),
  averageScore: document.getElementById("averageScore"),
  perfectStreak: document.getElementById("perfectStreak"),
  modeControls: document.getElementById("modeControls"),
  studyNumber: document.getElementById("studyNumber"),
  studyTimeValue: document.getElementById("studyTimeValue"),
  timeMinusBtn: document.getElementById("timeMinusBtn"),
  timePlusBtn: document.getElementById("timePlusBtn"),
  newRoundBtn: document.getElementById("newRoundBtn"),
  studyPanel: document.getElementById("studyPanel"),
  recallPanel: document.getElementById("recallPanel"),
  reviewPanel: document.getElementById("reviewPanel"),
  studyPosition: document.getElementById("studyPosition"),
  studyTotal: document.getElementById("studyTotal"),
  timerValue: document.getElementById("timerValue"),
  timerMeter: document.getElementById("timerMeter"),
  prevCardBtn: document.getElementById("prevCardBtn"),
  nextCardBtn: document.getElementById("nextCardBtn"),
  studyCard: document.getElementById("studyCard"),
  studyStrip: document.getElementById("studyStrip"),
  startRecallBtn: document.getElementById("startRecallBtn"),
  recallProgress: document.getElementById("recallProgress"),
  recallTotal: document.getElementById("recallTotal"),
  undoRecallBtn: document.getElementById("undoRecallBtn"),
  clearRecallBtn: document.getElementById("clearRecallBtn"),
  checkRecallBtn: document.getElementById("checkRecallBtn"),
  answerTrack: document.getElementById("answerTrack"),
  cardPool: document.getElementById("cardPool"),
  reviewScore: document.getElementById("reviewScore"),
  reviewTotal: document.getElementById("reviewTotal"),
  reviewPercent: document.getElementById("reviewPercent"),
  repeatRoundBtn: document.getElementById("repeatRoundBtn"),
  newFromReviewBtn: document.getElementById("newFromReviewBtn"),
  reviewList: document.getElementById("reviewList"),
};

let deferredInstallPrompt = null;
let state = loadState();

if (!state.round) {
  state.round = createRound(state.settings.modeId, state.settings.studySeconds);
  saveState();
}

bindEvents();
registerServiceWorker();
render();
setInterval(tick, 400);

function defaultState() {
  return {
    settings: {
      modeId: DEFAULT_MODE_ID,
      studySeconds: 60,
    },
    stats: {
      rounds: 0,
      bestPercent: 0,
      totalPercent: 0,
      perfectStreak: 0,
      lastPercent: 0,
    },
    round: null,
  };
}

function loadState() {
  const fallback = defaultState();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") {
      return fallback;
    }

    const settings = {
      modeId: getTrainingMode(stored.settings?.modeId)?.id ?? fallback.settings.modeId,
      studySeconds: STUDY_TIMES.includes(stored.settings?.studySeconds)
        ? stored.settings.studySeconds
        : fallback.settings.studySeconds,
    };

    const stats = {
      rounds: readNumber(stored.stats?.rounds, 0),
      bestPercent: readNumber(stored.stats?.bestPercent, 0),
      totalPercent: readNumber(stored.stats?.totalPercent, 0),
      perfectStreak: readNumber(stored.stats?.perfectStreak, 0),
      lastPercent: readNumber(stored.stats?.lastPercent, 0),
    };

    return {
      settings,
      stats,
      round: normalizeRound(stored.round, settings),
    };
  } catch {
    return fallback;
  }
}

function normalizeRound(round, settings) {
  if (!round || typeof round !== "object" || !Array.isArray(round.deck)) {
    return null;
  }

  const deck = round.deck.filter((id) => CARD_BY_ID.has(id)).slice(0, 52);
  if (!deck.length) {
    return null;
  }

  const deckSet = new Set(deck);
  const recall = Array.isArray(round.recall)
    ? round.recall.filter((id, index, list) => deckSet.has(id) && list.indexOf(id) === index)
    : [];
  const pool = Array.isArray(round.pool)
    ? round.pool.filter((id, index, list) => deckSet.has(id) && list.indexOf(id) === index)
    : [];

  const phase = ["study", "recall", "review"].includes(round.phase) ? round.phase : "study";
  const modeId = getTrainingMode(round.modeId)?.id ?? settings.modeId;
  const studyIndex = clamp(readNumber(round.studyIndex, 0), 0, deck.length - 1);
  const studySeconds = STUDY_TIMES.includes(round.studySeconds) ? round.studySeconds : settings.studySeconds;
  const studyStartedAt = readNumber(round.studyStartedAt, Date.now());
  const studyEndsAt = readNumber(round.studyEndsAt, Date.now() + studySeconds * 1000);

  return {
    id: typeof round.id === "string" ? round.id : String(Date.now()),
    phase,
    modeId,
    deck,
    pool: pool.length === deck.length ? pool : shuffle(deck),
    recall,
    studyIndex,
    studySeconds,
    studyStartedAt,
    studyEndsAt,
    checked: round.checked && typeof round.checked === "object" ? round.checked : null,
    saved: Boolean(round.saved),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAndRender() {
  saveState();
  render();
}

function bindEvents() {
  els.modeControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) {
      return;
    }

    const modeId = button.dataset.mode;
    if (!getTrainingMode(modeId)) {
      return;
    }

    state.settings.modeId = modeId;
    state.round = createRound(modeId, state.settings.studySeconds);
    saveAndRender();
  });

  els.timeMinusBtn.addEventListener("click", () => shiftStudyTime(-1));
  els.timePlusBtn.addEventListener("click", () => shiftStudyTime(1));
  els.newRoundBtn.addEventListener("click", () => startNewRound());
  els.prevCardBtn.addEventListener("click", () => moveStudyCard(-1));
  els.nextCardBtn.addEventListener("click", () => moveStudyCard(1));
  els.startRecallBtn.addEventListener("click", () => startRecall());
  els.undoRecallBtn.addEventListener("click", () => undoRecall());
  els.clearRecallBtn.addEventListener("click", () => clearRecall());
  els.checkRecallBtn.addEventListener("click", () => checkRecall());
  els.repeatRoundBtn.addEventListener("click", () => repeatRound());
  els.newFromReviewBtn.addEventListener("click", () => startNewRound());
  els.installButton.addEventListener("click", installApp);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    els.installButton.hidden = true;
  });

  window.addEventListener("online", updateOfflineStatus);
  window.addEventListener("offline", updateOfflineStatus);
}

function createRound(modeId, studySeconds) {
  const mode = getTrainingMode(modeId) ?? getTrainingMode(DEFAULT_MODE_ID);
  const deck = MEMORIZE_DECK_ORDER.slice(mode.start - 1, mode.end);
  const now = Date.now();

  return {
    id: String(now),
    phase: "study",
    modeId: mode.id,
    deck,
    pool: shuffle(deck),
    recall: [],
    studyIndex: 0,
    studySeconds,
    studyStartedAt: now,
    studyEndsAt: now + studySeconds * 1000,
    checked: null,
    saved: false,
  };
}

function startNewRound() {
  state.round = createRound(state.settings.modeId, state.settings.studySeconds);
  saveAndRender();
}

function repeatRound() {
  const deck = state.round.deck.slice();
  const now = Date.now();

  state.round = {
    id: String(now),
    phase: "study",
    modeId: state.round.modeId,
    deck,
    pool: shuffle(deck),
    recall: [],
    studyIndex: 0,
    studySeconds: state.settings.studySeconds,
    studyStartedAt: now,
    studyEndsAt: now + state.settings.studySeconds * 1000,
    checked: null,
    saved: false,
  };
  saveAndRender();
}

function shiftStudyTime(direction) {
  const currentIndex = STUDY_TIMES.indexOf(state.settings.studySeconds);
  const nextIndex = clamp(currentIndex + direction, 0, STUDY_TIMES.length - 1);
  const nextValue = STUDY_TIMES[nextIndex];

  state.settings.studySeconds = nextValue;
  if (state.round.phase === "study") {
    const now = Date.now();
    state.round.studySeconds = nextValue;
    state.round.studyStartedAt = now;
    state.round.studyEndsAt = now + nextValue * 1000;
  }

  saveAndRender();
}

function moveStudyCard(direction) {
  if (state.round.phase !== "study") {
    return;
  }

  state.round.studyIndex = clamp(state.round.studyIndex + direction, 0, state.round.deck.length - 1);
  saveAndRender();
}

function startRecall() {
  if (state.round.phase === "review") {
    return;
  }

  state.round.phase = "recall";
  state.round.recall = [];
  state.round.checked = null;
  saveAndRender();
}

function selectRecallCard(cardId) {
  if (state.round.phase !== "recall" || state.round.recall.includes(cardId)) {
    return;
  }

  if (state.round.recall.length < state.round.deck.length) {
    state.round.recall.push(cardId);
    saveAndRender();
  }
}

function removeRecallAt(index) {
  if (state.round.phase !== "recall") {
    return;
  }

  state.round.recall.splice(index, 1);
  saveAndRender();
}

function undoRecall() {
  if (state.round.phase !== "recall" || !state.round.recall.length) {
    return;
  }

  state.round.recall.pop();
  saveAndRender();
}

function clearRecall() {
  if (state.round.phase !== "recall" || !state.round.recall.length) {
    return;
  }

  state.round.recall = [];
  saveAndRender();
}

function checkRecall() {
  if (state.round.phase !== "recall" || state.round.recall.length !== state.round.deck.length) {
    return;
  }

  const score = state.round.deck.reduce((total, cardId, index) => {
    return total + (state.round.recall[index] === cardId ? 1 : 0);
  }, 0);
  const percent = Math.round((score / state.round.deck.length) * 100);

  state.round.checked = {
    score,
    percent,
    total: state.round.deck.length,
    answers: state.round.recall.slice(),
    checkedAt: Date.now(),
  };
  state.round.phase = "review";

  if (!state.round.saved) {
    state.stats.rounds += 1;
    state.stats.bestPercent = Math.max(state.stats.bestPercent, percent);
    state.stats.totalPercent += percent;
    state.stats.lastPercent = percent;
    state.stats.perfectStreak = percent === 100 ? state.stats.perfectStreak + 1 : 0;
    state.round.saved = true;
  }

  saveAndRender();
}

function render() {
  expireStudyIfNeeded();
  renderStats();
  renderControls();
  renderPanels();
  updateOfflineStatus();
}

function renderStats() {
  const average = state.stats.rounds ? Math.round(state.stats.totalPercent / state.stats.rounds) : 0;

  els.roundsCount.textContent = String(state.stats.rounds);
  els.bestScore.textContent = `${state.stats.bestPercent}%`;
  els.averageScore.textContent = `${average}%`;
  els.perfectStreak.textContent = String(state.stats.perfectStreak);
}

function renderControls() {
  els.modeControls.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === state.settings.modeId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const timeIndex = STUDY_TIMES.indexOf(state.settings.studySeconds);
  els.studyTimeValue.textContent = `${state.settings.studySeconds} c`;
  els.timeMinusBtn.disabled = timeIndex <= 0;
  els.timePlusBtn.disabled = timeIndex >= STUDY_TIMES.length - 1;
}

function renderPanels() {
  const phase = state.round.phase;

  els.studyPanel.classList.toggle("is-active", phase === "study");
  els.recallPanel.classList.toggle("is-active", phase === "recall");
  els.reviewPanel.classList.toggle("is-active", phase === "review");

  if (phase === "study") {
    renderStudy();
  }

  if (phase === "recall") {
    renderRecall();
  }

  if (phase === "review") {
    renderReview();
  }
}

function renderStudy() {
  const round = state.round;
  const currentCardId = round.deck[round.studyIndex];

  els.studyNumber.textContent = String(cardNumberFor(round, round.studyIndex));
  els.studyPosition.textContent = String(round.studyIndex + 1);
  els.studyTotal.textContent = String(round.deck.length);
  els.prevCardBtn.disabled = round.studyIndex === 0;
  els.nextCardBtn.disabled = round.studyIndex === round.deck.length - 1;

  replaceChildren(els.studyCard, createCardElement(currentCardId, "large"));

  els.studyStrip.textContent = "";
  round.deck.forEach((cardId, index) => {
    const card = createCardElement(cardId, "tiny");
    card.classList.toggle("is-correct", index === round.studyIndex);
    card.setAttribute("aria-current", index === round.studyIndex ? "true" : "false");
    els.studyStrip.append(card);
  });

  updateTimer();
}

function renderRecall() {
  const round = state.round;
  const selected = new Set(round.recall);

  els.recallProgress.textContent = String(round.recall.length);
  els.recallTotal.textContent = String(round.deck.length);
  els.undoRecallBtn.disabled = round.recall.length === 0;
  els.clearRecallBtn.disabled = round.recall.length === 0;
  els.checkRecallBtn.disabled = round.recall.length !== round.deck.length;

  renderAnswerTrack(false);

  els.cardPool.textContent = "";
  round.pool.forEach((cardId) => {
    const isSelected = selected.has(cardId);
    const cardButton = createCardElement(cardId, "small", {
      button: true,
      disabled: isSelected,
      selected: isSelected,
    });
    cardButton.addEventListener("click", () => selectRecallCard(cardId));
    els.cardPool.append(cardButton);
  });
}

function renderAnswerTrack(isReview) {
  const round = state.round;
  const answers = isReview ? round.checked?.answers ?? round.recall : round.recall;

  els.answerTrack.textContent = "";
  round.deck.forEach((expectedId, index) => {
    const answerId = answers[index];
    if (!answerId) {
      const slot = document.createElement("div");
      slot.className = "answer-slot";
      slot.classList.toggle("is-current", !isReview && index === round.recall.length);
      slot.textContent = String(cardNumberFor(round, index));
      els.answerTrack.append(slot);
      return;
    }

    const status = isReview ? (answerId === expectedId ? "correct" : "wrong") : "";
    const card = createCardElement(answerId, "tiny", {
      button: !isReview,
      status,
    });

    if (!isReview) {
      card.addEventListener("click", () => removeRecallAt(index));
    }

    els.answerTrack.append(card);
  });
}

function renderReview() {
  const round = state.round;
  const checked = round.checked ?? {
    score: 0,
    total: round.deck.length,
    percent: 0,
    answers: [],
  };

  els.reviewScore.textContent = String(checked.score);
  els.reviewTotal.textContent = String(checked.total);
  els.reviewPercent.textContent = `${checked.percent}%`;
  els.reviewList.textContent = "";

  round.deck.forEach((expectedId, index) => {
    const answerId = checked.answers[index];
    const isCorrect = expectedId === answerId;
    const row = document.createElement("article");
    row.className = "review-row";

    const position = document.createElement("span");
    position.className = "review-index";
    position.textContent = String(cardNumberFor(round, index));

    const expected = createReviewPair("Было", expectedId, isCorrect ? "correct" : "");
    const actual = createReviewPair("Ответ", answerId, isCorrect ? "correct" : "wrong");

    row.append(position, expected, actual);
    els.reviewList.append(row);
  });
}

function createReviewPair(label, cardId, status) {
  const wrap = document.createElement("div");
  wrap.className = "review-card-pair";

  if (cardId) {
    wrap.append(createCardElement(cardId, "tiny", { status }));
  } else {
    const empty = document.createElement("div");
    empty.className = "answer-slot";
    empty.textContent = "·";
    wrap.append(empty);
  }

  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(text);
  return wrap;
}

function createCardElement(cardId, size, options = {}) {
  const card = CARD_BY_ID.get(cardId);
  const node = document.createElement(options.button ? "button" : "div");
  const statusClass = options.status ? ` is-${options.status}` : "";

  node.className = `playing-card ${size} ${card.suit.color}${statusClass}`;
  if (options.button) {
    node.classList.add("button-card");
    node.type = "button";
    node.disabled = Boolean(options.disabled);
  }

  if (options.selected) {
    node.classList.add("is-selected");
  }

  node.setAttribute("aria-label", cardLabel(card));
  node.innerHTML = `
    <span class="card-corner"><span>${card.rank.label}</span><span>${card.suit.symbol}</span></span>
    <span class="card-face"><span class="card-rank">${card.rank.label}</span><span class="card-suit">${card.suit.symbol}</span></span>
    <span class="card-corner is-bottom"><span>${card.rank.label}</span><span>${card.suit.symbol}</span></span>
  `;

  return node;
}

function cardLabel(card) {
  return `${card.rank.name}, ${card.suit.name}`;
}

function getTrainingMode(modeId) {
  return TRAINING_MODES.find((mode) => mode.id === modeId) ?? null;
}

function cardNumberFor(round, index) {
  const mode = getTrainingMode(round.modeId) ?? getTrainingMode(DEFAULT_MODE_ID);
  return mode.start + index;
}

function tick() {
  if (state.round.phase === "study") {
    expireStudyIfNeeded();
    updateTimer();
  }
}

function expireStudyIfNeeded() {
  if (state.round.phase !== "study") {
    return;
  }

  if (Date.now() >= state.round.studyEndsAt) {
    state.round.phase = "recall";
    state.round.recall = [];
    state.round.checked = null;
    saveAndRender();
  }
}

function updateTimer() {
  if (state.round.phase !== "study") {
    return;
  }

  const now = Date.now();
  const remainingMs = Math.max(0, state.round.studyEndsAt - now);
  const elapsedMs = Math.max(0, now - state.round.studyStartedAt);
  const totalMs = Math.max(1, state.round.studySeconds * 1000);
  const ratio = clamp(1 - elapsedMs / totalMs, 0, 1);

  els.timerValue.textContent = formatTime(Math.ceil(remainingMs / 1000));
  els.timerMeter.style.transform = `scaleX(${ratio})`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateOfflineStatus() {
  if (!("serviceWorker" in navigator)) {
    els.offlineStatus.textContent = "Офлайн недоступен";
    els.offlineStatus.classList.add("is-waiting");
    return;
  }

  if (!navigator.serviceWorker.controller) {
    els.offlineStatus.textContent = "Кэш готовится";
    els.offlineStatus.classList.add("is-waiting");
    return;
  }

  els.offlineStatus.textContent = navigator.onLine ? "Офлайн готов" : "Без сети";
  els.offlineStatus.classList.toggle("is-waiting", !navigator.onLine);
}

async function installApp() {
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installButton.hidden = true;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    updateOfflineStatus();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("sw.js");
    await navigator.serviceWorker.ready;
    updateOfflineStatus();

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  } catch {
    els.offlineStatus.textContent = "Кэш недоступен";
    els.offlineStatus.classList.add("is-waiting");
  }
}

function readNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function shuffle(items) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[nextIndex]] = [result[nextIndex], result[index]];
  }
  return result;
}

function replaceChildren(parent, ...children) {
  parent.textContent = "";
  parent.append(...children);
}
