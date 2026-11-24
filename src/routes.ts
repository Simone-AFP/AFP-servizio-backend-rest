import { Hono } from "hono";
import type { TaskCreate, TaskUpdate, TaskCreateInput, TaskUpdateInput } from "./types.js";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
} from "./types.js";
import { validateBody } from "./validation.js";
import { AppError } from "./errorHandler.js";
import { all, get, run } from "./db.js";

const routes = new Hono();

function getTaskCategories(taskId: number) {
  // Restituisce le categorie associate a un task tramite la tabella di join task_category
  return all<{ id: number; name: string }>(
    `
      SELECT c.id, c.name
      FROM category c
      JOIN task_category tc ON tc.category_id = c.id
      WHERE tc.task_id = ?
    `,
    [taskId]
  );
}

function buildTask(row: any) {
  // Converte una riga del DB in un oggetto task completo con categorie
  return {
    id: Number(row.id),
    title: String(row.title),
    description: String(row.description),
    completed: row.completed === 1 ? 1 : 0,
    categories: getTaskCategories(Number(row.id)),
  };
}

function parseCategoryIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((id) => Number.isInteger(id));
}

function getTaskById(id: number) {
  return get<Record<string, unknown>>(
    "SELECT * FROM task WHERE id = ?",
    [id]
  );
}

function assignCategories(taskId: number, categoryIds: number[]) {
  run("DELETE FROM task_category WHERE task_id = ?", [taskId]);

  for (const categoryId of categoryIds) {
    run(
      "INSERT OR IGNORE INTO task_category (task_id, category_id) VALUES (?, ?)",
      [taskId, categoryId]
    );
  }
}

routes.get("/categories", (c) => {
  const categories = all<{ id: number; name: string }>(
    "SELECT * FROM category ORDER BY id"
  );
  return c.json(categories);
});

routes.get("/tasks", (c) => {
  const rows = all<Record<string, unknown>>(
    "SELECT * FROM task ORDER BY id DESC"
  );
  return c.json(rows.map(buildTask));
});

routes.get("/tasks/:id", (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json(
      {
        error: "ID non valido",
        status: 400,
      },
      400
    );
  }

  const row = getTaskById(id);
  if (!row) {
    return c.json(
      {
        error: "Task non trovato",
        status: 404,
      },
      404
    );
  }
  return c.json(buildTask(row));
});

routes.post("/tasks", async (c) => {
  // Valida il body con Zod
  const validatedData = await validateBody<TaskCreateInput>(
    c,
    CreateTaskSchema
  );
  if (!validatedData) {
    return; // validateBody ha già inviato la risposta di errore
  }

  run(
    "INSERT INTO task (title, description, completed) VALUES (?, ?, ?)",
    [validatedData.title, validatedData.description, validatedData.completed]
  );

  const task = all<Record<string, unknown>>(
    "SELECT * FROM task ORDER BY id DESC LIMIT 1"
  )[0];

  if (!task) {
    return c.json(
      {
        error: "Impossibile creare il task",
        status: 500,
      },
      500
    );
  }

  const taskId = Number(task.id);
  assignCategories(taskId, validatedData.categoryIds);
  return c.json(buildTask(task), 201);
});

routes.put("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json(
      {
        error: "ID non valido",
        status: 400,
      },
      400
    );
  }

  const existing = getTaskById(id);
  if (!existing) {
    return c.json(
      {
        error: "Task non trovato",
        status: 404,
      },
      404
    );
  }

  // Valida il body con Zod
  const validatedData = await validateBody<TaskUpdateInput>(
    c,
    UpdateTaskSchema
  );
  if (!validatedData) {
    return; // validateBody ha già inviato la risposta di errore
  }

  const title = validatedData.title ?? String(existing.title ?? "");
  const description =
    validatedData.description ?? String(existing.description ?? "");
  const completed =
    validatedData.completed ?? Number(existing.completed ?? 0);

  run(
    "UPDATE task SET title = ?, description = ?, completed = ? WHERE id = ?",
    [title, description, completed, id]
  );

  if (validatedData.categoryIds) {
    assignCategories(id, validatedData.categoryIds);
  }

  const task = getTaskById(id);
  return c.json(buildTask(task));
});

// PATCH: aggiornamento parziale del task, modifica solo i campi forniti
routes.patch("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json(
      {
        error: "ID non valido",
        status: 400,
      },
      400
    );
  }

  const existing = getTaskById(id);
  if (!existing) {
    return c.json(
      {
        error: "Task non trovato",
        status: 404,
      },
      404
    );
  }

  // Valida il body con Zod (tutti i campi opzionali per PATCH)
  const validatedData = await validateBody<Partial<TaskUpdateInput>>(
    c,
    UpdateTaskSchema.partial()
  );
  if (!validatedData) {
    return; // validateBody ha già inviato la risposta di errore
  }

  const fields: string[] = [];
  const params: any[] = [];

  if (validatedData.title !== undefined) {
    fields.push("title = ?");
    params.push(validatedData.title);
  }
  if (validatedData.description !== undefined) {
    fields.push("description = ?");
    params.push(validatedData.description);
  }
  if (validatedData.completed !== undefined) {
    fields.push("completed = ?");
    params.push(validatedData.completed);
  }

  if (fields.length > 0) {
    params.push(id);
    run(`UPDATE task SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  if (validatedData.categoryIds) {
    assignCategories(id, validatedData.categoryIds);
  }

  const task = getTaskById(id);
  return c.json(buildTask(task));
});

routes.delete("/tasks/:id", (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json(
      {
        error: "ID non valido",
        status: 400,
      },
      400
    );
  }

  const existing = getTaskById(id);
  if (!existing) {
    return c.json(
      {
        error: "Task non trovato",
        status: 404,
      },
      404
    );
  }

  run("DELETE FROM task WHERE id = ?", [id]);
  return c.body(null, 204);
});

export default routes;
