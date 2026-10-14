import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DATABASE_PATH } from "@/lib/config";
import * as schema from "./schema";

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

const sqlite = new Database(DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Columns added after a database may already have been deployed: add them if missing, so new code
// can open an older database (an existing database is otherwise only changed by drizzle-kit push).
const hasTable = (table: string) =>
  sqlite
    .prepare("select 1 from sqlite_master where type = 'table' and name = ?")
    .get(table) !== undefined;
const hasColumn = (table: string, column: string) =>
  (
    sqlite.prepare(`pragma table_info(${table})`).all() as { name: string }[]
  ).some((c) => c.name === column);
if (hasTable("accounts") && !hasColumn("accounts", "password_hash"))
  sqlite.exec("alter table accounts add column password_hash text");

export const db = drizzle({ client: sqlite, schema });
export { schema };
