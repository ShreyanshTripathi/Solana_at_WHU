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

export const db = drizzle({ client: sqlite, schema });
export { schema };
