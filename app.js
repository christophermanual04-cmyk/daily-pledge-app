const STORAGE_KEY = "dailyPledge.v1";

const defaultState = {
  pledge: "",
  why: "",
  createdAt: "",
  reminderTime: "08:00",
  completions: {}
};

let state = loadState();
let activeView = "today";
let visibleMonth = new Date();
let deferredInstallPrompt = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  dateLabel: $("#dateLabel"),
  installButton: $("#installButton"),
  pledgeText: $("#pledgeText"),
  openPledgeReaderButton: $("#openPledgeReaderButton"),
  pledgeReader: $("#pledgeReader"),
  pledgeReaderText: $("#pledgeReaderText"),
  closePledgeReaderButton: $("#closePledgeReaderButton"),
  whyText: $("#whyText"),
  completeButton: $("#completeButton"),
  streakCount: $("#streakCount"),
  bestCount: $("#bestCount"),
  totalCount: $("#totalCount"),
  weekStrip: $("#weekStrip"),
  reflectionInput: $("#reflectionInput"),
  saveNoteButton: $("#saveNoteButton"),
  undoTodayButton: $("#undoTodayButton"),
  monthLabel: $("#monthLabel"),
  monthGrid: $("#monthGrid"),
  historyList: $("#historyList"),
  prevMonthButton: $("#prevMonthButton"),
  nextMonthButton: $("#nextMonthButton"),
  pledgeForm: $("#pledgeForm"),
  pledgeInput: $("#pledgeInput"),
  whyInput: $("#whyInput"),
  reminderTime: $("#reminderTime"),
  calendarButton: $("#calendarButton"),
  exportButton: $("#exportButton"),
  importInput: $("#importInput"),
  clearButton: $("#clearButton"),
  toast: $("#toast")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      completions: parsed.completions && typeof parsed.completions === "object" ? parsed.completions : {}
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function keyFor(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function monthName(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  }).format(date);
}

function shortDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(date);
}

function completionKeys() {
  return Object.keys(state.completions).sort();
}

function computeStats() {
  const keys = completionKeys();
  const done = new Set(keys);
  const todayKey = keyFor(new Date());
  let cursor = done.has(todayKey) ? new Date() : addDays(new Date(), -1);
  let current = 0;

  while (done.has(keyFor(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previous = null;

  keys.forEach((key) => {
    const date = dateFromKey(key);
    if (previous && daysBetween(previous, date) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    previous = date;
  });

  return { current, best, total: keys.length };
}

function daysBetween(first, second) {
  const start = Date.UTC(first.getFullYear(), first.getMonth(), first.getDate());
  const end = Date.UTC(second.getFullYear(), second.getMonth(), second.getDate());
  return Math.round((end - start) / 86400000);
}

function render() {
  const today = new Date();
  const todayKey = keyFor(today);
  const todayRecord = state.completions[todayKey];
  const hasPledge = state.pledge.trim().length > 0;
  const isLongPledge = state.pledge.length > 220 || state.pledge.includes("\n");
  const stats = computeStats();

  els.dateLabel.textContent = shortDate(today);
  els.pledgeText.textContent = hasPledge ? state.pledge : "Choose a pledge to begin.";
  els.pledgeText.classList.toggle("is-long", isLongPledge);
  els.pledgeText.classList.toggle("is-collapsed", isLongPledge);
  els.openPledgeReaderButton.hidden = !isLongPledge;
  els.pledgeReaderText.textContent = state.pledge;
  els.whyText.textContent = state.why ? state.why : "";
  els.whyText.hidden = !state.why;
  els.completeButton.disabled = !hasPledge;
  els.completeButton.classList.toggle("is-complete", Boolean(todayRecord));
  els.completeButton.querySelector("span").textContent = todayRecord ? "Completed today" : "Complete today";
  els.undoTodayButton.hidden = !todayRecord;
  els.reflectionInput.value = todayRecord?.note || "";
  els.streakCount.textContent = stats.current;
  els.bestCount.textContent = stats.best;
  els.totalCount.textContent = stats.total;
  els.pledgeInput.value = state.pledge;
  els.whyInput.value = state.why;
  els.reminderTime.value = state.reminderTime;

  renderWeek();
  renderMonth();
  renderHistory();
  renderViews();
}

function renderWeek() {
  const today = new Date();
  const dayIndex = today.getDay();
  const start = addDays(today, -dayIndex);
  const todayKey = keyFor(today);
  els.weekStrip.replaceChildren();

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(start, index);
    const key = keyFor(date);
    const item = document.createElement("div");
    item.className = "week-day";
    item.classList.toggle("is-done", Boolean(state.completions[key]));
    item.classList.toggle("is-today", key === todayKey);
    item.innerHTML = `<span>${new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date)}</span><strong>${date.getDate()}</strong>`;
    els.weekStrip.append(item);
  }
}

function renderMonth() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const todayKey = keyFor(new Date());
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const labels = ["S", "M", "T", "W", "T", "F", "S"];

  els.monthLabel.textContent = monthName(visibleMonth);
  els.monthGrid.replaceChildren();

  labels.forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell is-label";
    cell.textContent = label;
    els.monthGrid.append(cell);
  });

  for (let index = 0; index < first.getDay(); index += 1) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell is-empty";
    els.monthGrid.append(cell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = keyFor(date);
    const button = document.createElement("button");
    button.className = "calendar-cell";
    button.type = "button";
    button.textContent = String(day);
    button.ariaLabel = `${shortDate(date)} ${state.completions[key] ? "completed" : "not completed"}`;
    button.classList.toggle("is-done", Boolean(state.completions[key]));
    button.classList.toggle("is-today", key === todayKey);
    button.addEventListener("click", () => toggleCompletion(key));
    els.monthGrid.append(button);
  }
}

function renderHistory() {
  const entries = completionKeys()
    .slice()
    .reverse()
    .slice(0, 8)
    .map((key) => ({ key, record: state.completions[key] }));

  els.historyList.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    empty.innerHTML = "<strong>No completions yet</strong><p>Your first one will appear here.</p>";
    els.historyList.append(empty);
    return;
  }

  entries.forEach(({ key, record }) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const note = record.note ? `<p>${escapeHtml(record.note)}</p>` : "<p>Completed</p>";
    item.innerHTML = `<strong>${shortDate(dateFromKey(key))}</strong>${note}`;
    els.historyList.append(item);
  });
}

function renderViews() {
  $$(".view").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === activeView);
  });

  $$(".nav-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === activeView);
  });
}

function setActiveView(view) {
  activeView = view;
  render();
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

function toggleCompletion(key = keyFor(new Date())) {
  if (!state.pledge.trim()) {
    setActiveView("settings");
    showToast("Save a pledge first.");
    return;
  }

  if (state.completions[key]) {
    delete state.completions[key];
    showToast("Completion removed.");
  } else {
    state.completions[key] = {
      completedAt: new Date().toISOString(),
      pledge: state.pledge,
      note: key === keyFor(new Date()) ? els.reflectionInput.value.trim() : ""
    };
    showToast("Pledge completed.");
  }

  saveState();
  render();
}

function saveNote() {
  const todayKey = keyFor(new Date());
  if (!state.completions[todayKey]) {
    showToast("Complete today first.");
    return;
  }

  state.completions[todayKey].note = els.reflectionInput.value.trim();
  saveState();
  render();
  showToast("Note saved.");
}

function savePledge(event) {
  event.preventDefault();
  const pledge = els.pledgeInput.value.trim();
  if (!pledge) {
    showToast("Enter a pledge.");
    return;
  }

  state.pledge = pledge;
  state.why = els.whyInput.value.trim();
  state.createdAt ||= new Date().toISOString();
  saveState();
  setActiveView("today");
  showToast("Pledge saved.");
}

function openPledgeReader() {
  if (!state.pledge.trim()) {
    return;
  }

  els.pledgeReaderText.textContent = state.pledge;
  els.pledgeReader.hidden = false;
  document.body.classList.add("reader-open");
  requestAnimationFrame(() => els.pledgeReaderText.focus());
}

function closePledgeReader() {
  els.pledgeReader.hidden = true;
  document.body.classList.remove("reader-open");
  els.openPledgeReaderButton.focus();
}

function createCalendarReminder() {
  const time = els.reminderTime.value || "08:00";
  state.reminderTime = time;
  saveState();

  const [hour, minute] = time.split(":").map(Number);
  const start = new Date();
  start.setHours(hour, minute, 0, 0);
  const stamp = icsStamp(new Date());
  const startStamp = icsFloatingStamp(start);
  const summary = escapeIcs("Daily Pledge");
  const description = escapeIcs(state.pledge || "Complete your daily pledge.");
  const uid = `daily-pledge-${Date.now()}@local`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Daily Pledge//Local PWA//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${startStamp}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  downloadFile("daily-pledge-reminder.ics", ics, "text/calendar");
  showToast("Calendar reminder created.");
}

function exportData() {
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "Daily Pledge",
      data: state
    },
    null,
    2
  );
  downloadFile("daily-pledge-backup.json", payload, "application/json");
  showToast("Backup exported.");
}

async function importData(event) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = parsed.data || parsed;
    if (!imported || typeof imported !== "object" || !imported.completions) {
      throw new Error("Invalid backup");
    }
    state = {
      ...defaultState,
      ...imported,
      completions: imported.completions
    };
    saveState();
    render();
    showToast("Backup imported.");
  } catch {
    showToast("Import failed.");
  }
}

function clearData() {
  const ok = confirm("Clear your pledge and history?");
  if (!ok) {
    return;
  }
  state = { ...defaultState };
  saveState();
  setActiveView("settings");
  showToast("Data cleared.");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function icsStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsFloatingStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}00`;
}

function escapeIcs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimer = 0;

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2200);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installButton.hidden = false;
});

els.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installButton.hidden = true;
});

els.completeButton.addEventListener("click", () => toggleCompletion());
els.openPledgeReaderButton.addEventListener("click", openPledgeReader);
els.closePledgeReaderButton.addEventListener("click", closePledgeReader);
els.pledgeReader.addEventListener("click", (event) => {
  if (event.target === els.pledgeReader) {
    closePledgeReader();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.pledgeReader.hidden) {
    closePledgeReader();
  }
});
els.saveNoteButton.addEventListener("click", saveNote);
els.undoTodayButton.addEventListener("click", () => toggleCompletion());
els.pledgeForm.addEventListener("submit", savePledge);
els.reminderTime.addEventListener("change", () => {
  state.reminderTime = els.reminderTime.value || "08:00";
  saveState();
});
els.calendarButton.addEventListener("click", createCalendarReminder);
els.exportButton.addEventListener("click", exportData);
els.importInput.addEventListener("change", importData);
els.clearButton.addEventListener("click", clearData);
els.prevMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  render();
});
els.nextMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  render();
});

$$(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.tab);
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

if (!state.pledge) {
  activeView = "settings";
}

render();
