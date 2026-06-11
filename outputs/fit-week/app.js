const STORAGE_KEY = "fitweek-planner-v2";

const workoutTypes = [
  "Treino personalizado",
  "Peito e tríceps",
  "Costas e bíceps",
  "Pernas",
  "Ombros",
  "Abdômen",
  "Cardio",
  "Treino full body",
  "Descanso",
];

const days = [
  { key: "monday", label: "Segunda", short: "Seg" },
  { key: "tuesday", label: "Terça", short: "Ter" },
  { key: "wednesday", label: "Quarta", short: "Qua" },
  { key: "thursday", label: "Quinta", short: "Qui" },
  { key: "friday", label: "Sexta", short: "Sex" },
  { key: "saturday", label: "Sábado", short: "Sab" },
  { key: "sunday", label: "Domingo", short: "Dom" },
];

const defaultState = {
  selectedDay: "monday",
  profile: {
    name: "",
    goal: "Hipertrofia",
    level: "Iniciante",
  },
  week: days.map((day) => ({
    ...day,
    type: "Descanso",
    customName: "",
    completed: false,
    exercises: [],
  })),
};

let state = loadState();

const panels = document.querySelectorAll("[data-panel]");
const navButtons = document.querySelectorAll(".nav-button");
const weekGrid = document.querySelector("#week-grid");
const dayDetail = document.querySelector("#day-detail");
const exerciseTemplate = document.querySelector("#exercise-template");
const profileForm = document.querySelector("#profile-form");

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(stored);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      profile: { ...defaultState.profile, ...parsed.profile },
      week: days.map((day) => {
        const existing = parsed.week?.find((item) => item.key === day.key);
        if (!existing) return defaultState.week.find((item) => item.key === day.key);
        return {
          ...day,
          ...existing,
          type: normalizeWorkoutType(existing.type),
          customName: existing.customName || "",
        };
      }),
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function selectedDay() {
  return state.week.find((day) => day.key === state.selectedDay) || state.week[0];
}

function todayKey() {
  const jsDay = new Date().getDay();
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][jsDay];
}

function plannedDays() {
  return state.week.filter(isTrainingDay);
}

function completedExercises(day) {
  return day.exercises.filter((exercise) => exercise.done).length;
}

function isWorkoutDone(day) {
  return isTrainingDay(day) && day.completed;
}

function isTrainingDay(day) {
  return day.type !== "Descanso";
}

function workoutName(day) {
  if (!isTrainingDay(day)) return "Descanso";
  return day.customName?.trim() || day.type || "Treino personalizado";
}

function calculateSummary() {
  const planned = plannedDays();
  const done = planned.filter(isWorkoutDone).length;
  const pending = planned.length - done;
  const percent = planned.length ? Math.round((done / planned.length) * 100) : 0;

  return { planned, done, pending, percent };
}

function setView(view) {
  panels.forEach((panel) => panel.classList.toggle("is-hidden", panel.dataset.panel !== view));
  navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
}

function render() {
  renderDashboard();
  renderWeek();
  renderDetail();
  renderProfile();
  saveState();
}

function renderDashboard() {
  const today = state.week.find((day) => day.key === todayKey()) || state.week[0];
  const summary = calculateSummary();
  const pendingList = state.week.filter((day) => isTrainingDay(day) && !day.completed);
  const circumference = 302;

  document.querySelector("#today-title").textContent = workoutName(today);
  document.querySelector("#today-meta").textContent =
    isTrainingDay(today)
      ? `${today.label}: ${today.exercises.length} exercícios cadastrados.`
      : `${today.label}: personalize este dia quando quiser treinar.`;
  document.querySelector("#progress-title").textContent = `${summary.done} de ${summary.planned.length} treinos`;
  document.querySelector("#progress-copy").textContent =
    summary.pending === 0 && summary.planned.length
      ? "Semana fechada. Excelente consistência."
      : `${summary.pending} treino${summary.pending === 1 ? "" : "s"} pendente${summary.pending === 1 ? "" : "s"}.`;
  document.querySelector("#done-count").textContent = summary.done;
  document.querySelector("#pending-count").textContent = summary.pending;
  document.querySelector("#training-days-count").textContent = summary.planned.length;
  document.querySelector("#progress-percent").textContent = `${summary.percent}%`;
  document.querySelector("#ring-value").style.strokeDashoffset =
    circumference - (summary.percent / 100) * circumference;

  const list = document.querySelector("#pending-list");
  list.innerHTML = "";

  if (!pendingList.length) {
    const item = document.createElement("span");
    item.className = "pending-chip";
    item.textContent = summary.planned.length ? "Nenhuma pendência" : "Nenhum treino cadastrado";
    list.append(item);
  } else {
    pendingList.forEach((day) => {
      const item = document.createElement("button");
      item.className = "pending-chip";
      item.type = "button";
      item.textContent = `${day.label}: ${workoutName(day)}`;
      item.addEventListener("click", () => {
        state.selectedDay = day.key;
        setView("routine");
        render();
      });
      list.append(item);
    });
  }
}

function renderWeek() {
  weekGrid.innerHTML = "";

  state.week.forEach((day) => {
    const card = document.createElement("button");
    card.className = "day-card";
    card.type = "button";
    card.classList.toggle("is-selected", day.key === state.selectedDay);
    card.classList.toggle("is-rest", !isTrainingDay(day));

    const total = day.exercises.length;
    const done = completedExercises(day);
    const status = !isTrainingDay(day) ? "Livre" : day.completed ? "Concluído" : "Pendente";
    const exerciseCopy = total ? `${total} exercício${total === 1 ? "" : "s"}` : "Sem exercícios";

    card.innerHTML = `
      <div class="day-card-top">
        <span class="day-label">${day.label}</span>
        <span class="status-pill ${day.completed ? "done" : ""}">${status}</span>
      </div>
      <p class="workout-type">${workoutName(day)}</p>
      <div class="day-card-bottom">
        <span>${exerciseCopy}</span>
        <span>${done}/${total} feitos</span>
      </div>
    `;

    card.addEventListener("click", () => {
      state.selectedDay = day.key;
      render();
    });

    weekGrid.append(card);
  });
}

function renderDetail() {
  const day = selectedDay();
  dayDetail.innerHTML = "";

  const header = document.createElement("div");
  header.className = "detail-header";
  header.innerHTML = `
    <div>
      <p class="eyebrow">${day.short}</p>
      <h2>${day.label}</h2>
      <p class="muted">${completedExercises(day)} de ${day.exercises.length} exercícios concluídos.</p>
    </div>
  `;

  const completeButton = document.createElement("button");
  completeButton.className = day.completed ? "secondary-button" : "primary-button";
  completeButton.type = "button";
  completeButton.textContent = day.completed ? "Reabrir treino" : "Marcar concluído";
  completeButton.disabled = !isTrainingDay(day);
  completeButton.addEventListener("click", () => {
    day.completed = !day.completed;
    if (day.completed) day.exercises = day.exercises.map((exercise) => ({ ...exercise, done: true }));
    render();
    toast(day.completed ? "Treino concluído." : "Treino reaberto.");
  });
  header.append(completeButton);
  dayDetail.append(header);

  const fieldRow = document.createElement("div");
  fieldRow.className = "field-row";
  fieldRow.append(workoutNameInput(day), workoutSelect(day), activeToggle(day));
  dayDetail.append(fieldRow);

  const actions = document.createElement("div");
  actions.className = "detail-actions";

  const addButton = document.createElement("button");
  addButton.className = "primary-button";
  addButton.type = "button";
  addButton.textContent = "Adicionar exercício";
  addButton.addEventListener("click", () => addExercise(day));

  const clearButton = document.createElement("button");
  clearButton.className = "secondary-button";
  clearButton.type = "button";
  clearButton.textContent = "Excluir treino";
  clearButton.addEventListener("click", () => {
    day.type = "Descanso";
    day.customName = "";
    day.completed = false;
    day.exercises = [];
    render();
    toast("Treino removido do dia.");
  });

  actions.append(addButton, clearButton);
  dayDetail.append(actions);

  const list = document.createElement("div");
  list.className = "exercise-list";

  if (!day.exercises.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum exercício cadastrado para este dia.";
    list.append(empty);
  }

  day.exercises.forEach((exercise) => {
    list.append(exerciseCard(day, exercise));
  });

  dayDetail.append(list);

  const bottomAddButton = document.createElement("button");
  bottomAddButton.className = "primary-button bottom-add-exercise";
  bottomAddButton.type = "button";
  bottomAddButton.textContent = "+ Adicionar exercício";
  bottomAddButton.addEventListener("click", () => addExercise(day));
  dayDetail.append(bottomAddButton);
}

function addExercise(day) {
  if (!isTrainingDay(day)) {
    day.type = "Treino personalizado";
  }
  day.exercises.push({
    id: uid(),
    name: "Novo exercício",
    sets: "3",
    reps: "10",
    load: "",
    notes: "",
    done: false,
  });
  day.completed = false;
  render();
}

function workoutNameInput(day) {
  const label = document.createElement("label");
  label.className = "wide-field";
  label.textContent = "Nome do treino";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ex: Push A, Glúteos, Cardio leve";
  input.value = day.customName || "";
  input.disabled = !isTrainingDay(day);
  input.addEventListener("input", () => {
    day.customName = input.value;
    saveState();
    renderDashboard();
    renderWeek();
  });

  label.append(input);
  return label;
}

function workoutSelect(day) {
  const label = document.createElement("label");
  label.textContent = "Tipo de treino";

  const select = document.createElement("select");
  workoutTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    option.selected = type === day.type;
    select.append(option);
  });

  select.addEventListener("change", () => {
    day.type = select.value;
    day.completed = false;
    if (select.value === "Descanso") {
      day.customName = "";
      day.exercises = [];
    } else if (!day.customName?.trim()) {
      day.customName = select.value === "Treino personalizado" ? "" : select.value;
    }
    render();
  });

  label.append(select);
  return label;
}

function activeToggle(day) {
  const label = document.createElement("label");
  label.className = "done-toggle";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = day.type !== "Descanso";
  input.addEventListener("change", () => {
    if (input.checked) {
      day.type = "Treino personalizado";
    } else {
      day.type = "Descanso";
      day.customName = "";
      day.exercises = [];
    }
    day.completed = false;
    render();
  });

  const span = document.createElement("span");
  span.textContent = "Dia de treino";
  label.append(input, span);
  return label;
}

function exerciseCard(day, exercise) {
  const node = exerciseTemplate.content.firstElementChild.cloneNode(true);
  const fields = {
    name: node.querySelector(".exercise-name"),
    sets: node.querySelector(".exercise-sets"),
    reps: node.querySelector(".exercise-reps"),
    load: node.querySelector(".exercise-load"),
    notes: node.querySelector(".exercise-notes"),
    done: node.querySelector(".exercise-done"),
  };

  fields.name.value = exercise.name;
  fields.sets.value = exercise.sets;
  fields.reps.value = exercise.reps;
  fields.load.value = exercise.load;
  fields.notes.value = exercise.notes;
  fields.done.checked = exercise.done;

  Object.entries(fields).forEach(([key, field]) => {
    const eventName = field.type === "checkbox" ? "change" : "input";
    field.addEventListener(eventName, () => {
      exercise[key] = field.type === "checkbox" ? field.checked : field.value;
      day.completed = day.exercises.length > 0 && day.exercises.every((item) => item.done);
      saveState();
      renderDashboard();
      renderWeek();
    });
  });

  node.querySelector(".remove-exercise").addEventListener("click", () => {
    day.exercises = day.exercises.filter((item) => item.id !== exercise.id);
    day.completed = day.exercises.length > 0 && day.exercises.every((item) => item.done);
    render();
  });

  return node;
}

function renderProfile() {
  document.querySelector("#profile-name").value = state.profile.name;
  state.profile.goal = normalizeOption(state.profile.goal);
  state.profile.level = normalizeOption(state.profile.level);
  document.querySelector("#profile-goal").value = state.profile.goal;
  document.querySelector("#profile-level").value = state.profile.level;
  document.querySelector("#profile-greeting").textContent = state.profile.name
    ? `${state.profile.name}, sua semana esta montada`
    : "Pronto para treinar";
}

function normalizeOption(value) {
  const replacements = {
    Forca: "Força",
    Intermediario: "Intermediário",
    Avancado: "Avançado",
    "Saude e consistencia": "Saúde e consistência",
  };

  return replacements[value] || value;
}

function normalizeWorkoutType(value) {
  const replacements = {
    "Peito e triceps": "Peito e tríceps",
    "Costas e biceps": "Costas e bíceps",
    Abdomen: "Abdômen",
  };

  return replacements[value] || value;
}

function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  document.body.append(item);
  setTimeout(() => item.remove(), 2200);
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelector("#open-today").addEventListener("click", () => {
  state.selectedDay = todayKey();
  setView("routine");
  render();
});

document.querySelector("#reset-week").addEventListener("click", () => {
  state.week = state.week.map((day) => ({
    ...day,
    completed: false,
    exercises: day.exercises.map((exercise) => ({ ...exercise, done: false })),
  }));
  render();
  toast("Progresso semanal resetado.");
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.profile = {
    name: document.querySelector("#profile-name").value.trim(),
    goal: document.querySelector("#profile-goal").value,
    level: document.querySelector("#profile-level").value,
  };
  render();
  toast("Perfil salvo.");
});

render();
