const apiRoot = "/api";
const state = {
  categories: [],
  tasks: [],
};

// Stato dell'applicazione front-end: categorie disponibili e lista dei task

const elements = {
  categories: document.getElementById("categories"),
  tasks: document.getElementById("tasks"),
  form: document.getElementById("task-form"),
  title: document.getElementById("title"),
  description: document.getElementById("description"),
};

let editingId = null;

function resetFormState() {
  editingId = null;
  const submit = elements.form.querySelector("button[type='submit']");
  if (submit) submit.textContent = "Aggiungi task";
  const cancel = elements.form.querySelector("button[data-action='cancel']");
  if (cancel) cancel.remove();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchJson(url, options = {}) {
  // Wrapper fetch per gestire JSON e errori API in modo uniforme
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Errore API: ${response.status}`);
  }
  return await response.json();
}

function renderCategories() {
  elements.categories.innerHTML = "";
  state.categories.forEach((category) => {
    const label = document.createElement("label");
    label.innerHTML = `
      ${escapeHtml(category.name)}
      <input type="checkbox" name="category" value="${category.id}" />
    `;
    elements.categories.appendChild(label);
  });
}

function renderTasks() {
  elements.tasks.innerHTML = "";

  if (state.tasks.length === 0) {
    elements.tasks.innerHTML = "<p>Nessun task presente.</p>";
    return;
  }

  state.tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = `task-card${task.completed === 1 ? " done" : ""}`;

    const categoriesMarkup = task.categories
      .map((category) => `<span class="tag">${escapeHtml(category.name)}</span>`)
      .join("");

    card.innerHTML = `
      <header>
        <h3>${escapeHtml(task.title)}</h3>
        <div class="controls">
          <label class="completed-label">Completata <input type="checkbox" data-action="delete-checkbox" data-id="${task.id}" ${task.completed === 1 ? "checked" : ""} /></label>
          <button data-action="edit" data-id="${task.id}">Modifica</button>
          <button data-action="delete" data-id="${task.id}">Elimina</button>
        </div>
      </header>
      <p>${escapeHtml(task.description)}</p>
      <div class="meta">${categoriesMarkup}</div>
    `;

    const deleteCheckbox = card.querySelector("input[data-action='delete-checkbox']");
    const editBtn = card.querySelector("button[data-action='edit']");
    const remove = card.querySelector("button[data-action='delete']");

    // Quando la checkbox di completamento viene cliccata, esegui la delete (come richiesto)
    deleteCheckbox?.addEventListener("change", async () => {
      await deleteTask(task.id);
    });

    editBtn?.addEventListener("click", async () => {
      // popola il form con i dati del task per modifica
      editingId = task.id;
      elements.title.value = task.title;
      elements.description.value = task.description || "";
      // set categories
      document.querySelectorAll("input[name='category']").forEach((input) => {
        input.checked = task.categories.some((c) => Number(c.id) === Number(input.value));
      });

      const submit = elements.form.querySelector("button[type='submit']");
      if (submit) submit.textContent = "Aggiorna task";

      // add cancel button
      if (!elements.form.querySelector("button[data-action='cancel']")) {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.dataset.action = "cancel";
        cancel.textContent = "Annulla";
        cancel.style.marginLeft = "0.5rem";
        cancel.addEventListener("click", () => {
          elements.title.value = "";
          elements.description.value = "";
          document.querySelectorAll("input[name='category']").forEach((i) => (i.checked = false));
          resetFormState();
        });
        elements.form.appendChild(cancel);
      }
    });

    remove?.addEventListener("click", async () => {
      await deleteTask(task.id);
    });

    elements.tasks.appendChild(card);
  });
}

function getSelectedCategoryIds() {
  return Array.from(document.querySelectorAll("input[name='category']:checked"))
    .map((input) => Number(input.value))
    .filter((value) => Number.isInteger(value));
}

async function loadCategories() {
  state.categories = await fetchJson(`${apiRoot}/categories`);
  renderCategories();
}

async function loadTasks() {
  state.tasks = await fetchJson(`${apiRoot}/tasks`);
  renderTasks();
}

async function createTask(event) {
  event.preventDefault();

  const title = elements.title.value.trim();
  const description = elements.description.value.trim();
  const categoryIds = getSelectedCategoryIds();

  // quando editingId è settato, stiamo aggiornando un task esistente;
  // altrimenti creiamo un nuovo task

  if (!title) {
    return;
  }

  if (editingId) {
    // usa PATCH per aggiornamento parziale
    await fetchJson(`${apiRoot}/tasks/${editingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title,
        description,
        categoryIds,
      }),
    });
    resetFormState();
  } else {
    await fetchJson(`${apiRoot}/tasks`, {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        completed: 0,
        categoryIds,
      }),
    });
  }

  elements.title.value = "";
  elements.description.value = "";
  document.querySelectorAll("input[name='category']").forEach((input) => {
    input.checked = false;
  });

  await loadTasks();
}

async function updateTask(id, update) {
  await fetchJson(`${apiRoot}/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(update),
  });
  await loadTasks();
}

async function deleteTask(id) {
  await fetch(`${apiRoot}/tasks/${id}`, { method: "DELETE" });
  await loadTasks();
}

async function init() {
  elements.form.addEventListener("submit", createTask);
  await loadCategories();
  await loadTasks();
}

init().catch((error) => {
  console.error(error);
  elements.tasks.innerHTML = `<p class="error">Errore di caricamento: ${escapeHtml(error.message)}</p>`;
});
