const STORAGE_KEY = "task-manager-tasks";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const activeCount = document.getElementById("active-count");
const doneCount = document.getElementById("done-count");
const clearDoneBtn = document.getElementById("clear-done");
const filterButtons = document.querySelectorAll(".filter");

let tasks = loadTasks();
let currentFilter = "all";

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

function getFilteredTasks() {
  if (currentFilter === "active") return tasks.filter((t) => !t.done);
  if (currentFilter === "done") return tasks.filter((t) => t.done);
  return tasks;
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

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "task-delete";
    deleteBtn.setAttribute("aria-label", `Delete "${task.text}"`);
    deleteBtn.textContent = "×";

    li.append(checkbox, span, deleteBtn);
    list.appendChild(li);
  });

  emptyState.classList.toggle("hidden", tasks.length > 0);
  if (tasks.length > 0 && filtered.length === 0) {
    emptyState.textContent = `No ${currentFilter} tasks.`;
    emptyState.classList.remove("hidden");
  } else if (tasks.length === 0) {
    emptyState.textContent = "No tasks yet. Add one above to get started.";
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  tasks.unshift({ id: createId(), text, done: false });
  saveTasks();
  input.value = "";
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

render();
