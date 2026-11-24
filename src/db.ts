import initSqlJs, { type SqlValue } from "sql.js";
import fs from "fs";
import type { CategoryName } from "./types.js";

const DB_FILE = "./data/todo.db";
const SQL = await initSqlJs();

// Carica il database SQLite dal file se esiste, altrimenti ne crea uno in memoria
let database = new SQL.Database(
  fs.existsSync(DB_FILE)
    ? new Uint8Array(fs.readFileSync(DB_FILE))
    : undefined
);

database.run("PRAGMA foreign_keys = ON;");

database.run(`
CREATE TABLE IF NOT EXISTS category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK(name IN ('casa','lavoro','compere','tempo libero','sport','famiglia'))
);
`);

database.run(`
CREATE TABLE IF NOT EXISTS task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1))
);
`);

database.run(`
CREATE TABLE IF NOT EXISTS task_category (
  task_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, category_id),
  FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE CASCADE
);
`);

const defaultCategories: CategoryName[] = [
  "casa",
  "lavoro",
  "compere",
  "tempo libero",
  "sport",
  "famiglia",
];

const insertCategory = database.prepare(
  "INSERT OR IGNORE INTO category (name) VALUES (?)"
);
for (const name of defaultCategories) {
  insertCategory.run([name]);
}
insertCategory.free();

function saveDatabase() {
  const data = database.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

export function all<T = Record<string, unknown>>(sql: string, params?: SqlValue[]) {
  const stmt = database.prepare(sql);
  if (params?.length) {
    stmt.bind(params as any);
  }
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function get<T = Record<string, unknown>>(sql: string, params?: SqlValue[]) {
  const stmt = database.prepare(sql);
  if (params?.length) {
    stmt.bind(params as any);
  }
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as T;
  stmt.free();
  return row;
}

export function run(sql: string, params?: SqlValue[]) {
  const stmt = database.prepare(sql);
  if (params?.length) {
    stmt.bind(params as any);
  }
  stmt.step();
  stmt.free();
  saveDatabase();
}

// Esporta l'istanza del database per eventuali accessi diretti
export default database;
