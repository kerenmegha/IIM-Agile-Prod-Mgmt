const STORAGE_KEY = "task-manager-tasks";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const dateInput = document.getElementById("task-date");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const activeCount = document.getElementById("active-count");
const doneCount = document.getElementById("done-count");
const clearDoneBtn = document.getElementById("clear-done");
const filterButtons = document.querySelectorAll(".filter");
const calendarTitle = document.getElementById("calendar-title");
const calendarGrid = document.getElementById("calendar-grid");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const todayBtn = document.getElementById("today-btn");
const clearDateBtn = document.getElementById("clear-date-btn");
const selectedDateLabel = document.getElementById("selected-date-label");
const voiceBtn = document.getElementById("voice-btn");
const voiceStatus = document.getElementById("voice-status");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let tasks = loadTasks();
let currentFilter = "all";
let selectedDate = null;
let calendarMonth = new Date();
calendarMonth.setDate(1);
let recognition = null;
let isListening = false;

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createId() {
  return crypto.randomUUID();
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(key) {
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(task) {
  if (!task.dueDate || task.done) return false;
  return task.dueDate < toDateKey(new Date());
}

function getFilteredTasks() {
  let result = tasks;

  if (currentFilter === "active") result = result.filter((t) => !t.done);
  if (currentFilter === "done") result = result.filter((t) => t.done);
  if (selectedDate) result = result.filter((t) => t.dueDate === selectedDate);

  return result;
}

function tasksOnDate(key) {
  return tasks.filter((t) => t.dueDate === key);
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const todayKey = toDateKey(new Date());

  calendarTitle.textContent = calendarMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  calendarGrid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day";
    btn.setAttribute("role", "gridcell");

    let dayNum;
    let dateKey;
    let inCurrentMonth = true;

    if (i < firstDay) {
      dayNum = daysInPrevMonth - firstDay + i + 1;
      const prevMonth = new Date(year, month - 1, dayNum);
      dateKey = toDateKey(prevMonth);
      inCurrentMonth = false;
    } else if (i >= firstDay + daysInMonth) {
      dayNum = i - firstDay - daysInMonth + 1;
      const nextMonth = new Date(year, month + 1, dayNum);
      dateKey = toDateKey(nextMonth);
      inCurrentMonth = false;
    } else {
      dayNum = i - firstDay + 1;
      dateKey = toDateKey(new Date(year, month, dayNum));
    }

    btn.textContent = dayNum;
    btn.dataset.date = dateKey;
    btn.setAttribute("aria-label", formatDisplayDate(dateKey));

    if (!inCurrentMonth) btn.classList.add("other-month");
    if (dateKey === todayKey) btn.classList.add("today");
    if (dateKey === selectedDate) btn.classList.add("selected");
    if (tasksOnDate(dateKey).length > 0) {
      btn.classList.add("has-tasks");
      const dot = document.createElement("span");
      dot.className = "calendar-dot";
      dot.setAttribute("aria-hidden", "true");
      btn.appendChild(dot);
    }

    calendarGrid.appendChild(btn);
  }

  clearDateBtn.hidden = !selectedDate;
  selectedDateLabel.hidden = !selectedDate;
  selectedDateLabel.textContent = selectedDate
    ? `Showing tasks due ${formatDisplayDate(selectedDate)}`
    : "";
}

function render() {
  const filtered = getFilteredTasks();
  const active = tasks.filter((t) => !t.done).length;
  const done = tasks.filter((t) => t.done).length;

  activeCount.textContent = `${active} active`;
  doneCount.textContent = `${done} done`;
  clearDoneBtn.hidden = done === 0;

  list.innerHTML = "";

  filtered.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item${task.done ? " done" : ""}`;
    li.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.done ? "incomplete" : "complete"}`);

    const body = document.createElement("div");
    body.className = "task-body";

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;

    body.appendChild(span);

    if (task.dueDate) {
      const due = document.createElement("span");
      due.className = `task-due${isOverdue(task) ? " overdue" : ""}`;
      due.textContent = isOverdue(task)
        ? `Overdue · ${formatDisplayDate(task.dueDate)}`
        : formatDisplayDate(task.dueDate);
      body.appendChild(due);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "task-delete";
    deleteBtn.setAttribute("aria-label", `Delete "${task.text}"`);
    deleteBtn.textContent = "×";

    li.append(checkbox, body, deleteBtn);
    list.appendChild(li);
  });

  emptyState.classList.toggle("hidden", tasks.length > 0 && filtered.length > 0);

  if (tasks.length === 0) {
    emptyState.textContent = "No tasks yet. Add one above to get started.";
    emptyState.classList.remove("hidden");
  } else if (filtered.length === 0) {
    if (selectedDate) {
      emptyState.textContent = `No tasks due on ${formatDisplayDate(selectedDate)}.`;
    } else {
      emptyState.textContent = `No ${currentFilter} tasks.`;
    }
    emptyState.classList.remove("hidden");
  }

  renderCalendar();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const dueDate = dateInput.value || null;

  tasks.unshift({ id: createId(), text, done: false, dueDate });
  saveTasks();
  input.value = "";
  dateInput.value = "";
  render();
  input.focus();
});

list.addEventListener("click", (e) => {
  const item = e.target.closest(".task-item");
  if (!item) return;

  const id = item.dataset.id;

  if (e.target.classList.contains("task-checkbox")) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.done = e.target.checked;
      saveTasks();
      render();
    }
  }

  if (e.target.classList.contains("task-delete")) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }
});

calendarGrid.addEventListener("click", (e) => {
  const day = e.target.closest(".calendar-day");
  if (!day) return;

  const date = day.dataset.date;
  selectedDate = selectedDate === date ? null : date;

  if (selectedDate) {
    const parsed = parseDateKey(selectedDate);
    calendarMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  }

  render();
});

prevMonthBtn.addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() + 1);
  renderCalendar();
});

todayBtn.addEventListener("click", () => {
  const today = new Date();
  calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDate = toDateKey(today);
  render();
});

clearDateBtn.addEventListener("click", () => {
  selectedDate = null;
  render();
});

clearDoneBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

dateInput.value = toDateKey(new Date());
initVoiceInput();
render();

function showVoiceStatus(message, isError = false) {
  voiceStatus.textContent = message;
  voiceStatus.hidden = false;
  voiceStatus.classList.toggle("error", isError);
  voiceStatus.classList.remove("hidden");
}

function hideVoiceStatus() {
  voiceStatus.hidden = true;
  voiceStatus.classList.add("hidden");
  voiceStatus.classList.remove("error");
}

function initVoiceInput() {
  if (!SpeechRecognition) {
    voiceBtn.disabled = true;
    voiceBtn.title = "Voice input is not supported in this browser";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";

  recognition.onstart = () => {
    isListening = true;
    voiceBtn.classList.add("listening");
    voiceBtn.setAttribute("aria-label", "Stop voice input");
    showVoiceStatus("Listening… speak your task.");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    input.value = transcript.trim();
  };

  recognition.onend = () => {
    isListening = false;
    voiceBtn.classList.remove("listening");
    voiceBtn.setAttribute("aria-label", "Start voice input");
    hideVoiceStatus();
    input.focus();
  };

  recognition.onerror = (event) => {
    isListening = false;
    voiceBtn.classList.remove("listening");
    voiceBtn.setAttribute("aria-label", "Start voice input");

    if (event.error === "not-allowed") {
      showVoiceStatus("Microphone access denied. Allow mic access and try again.", true);
    } else if (event.error !== "aborted") {
      showVoiceStatus("Voice input failed. Try again.", true);
    }
  };

  voiceBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      input.focus();
      recognition.start();
    } catch {
      showVoiceStatus("Could not start voice input. Try again.", true);
    }
  });
}
