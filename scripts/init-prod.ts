// Creates the production database for the "Product" copy of Volty:
//   npm run prod:init
// The same schema as the demo, plus only what a real community needs on day one: the community, the
// Stadtwerk that runs it (with its treasury wallet) and the platform-fee account, copied from the
// demo database. No demo people, sites, readings or payments. The demo database is only read.
// The community starts on Germany's default rules: one fixed community price, the Stadtwerk pays
// sellers and bills buyers (§42c), federation off. Staff change these in the console.
import { execSync } from "node:child_process";
import fs from "node:fs";
import Database from "better-sqlite3";

const demoPath = process.env.DEMO_DATABASE_PATH ?? "data/kiezwatt.db";
const prodPath = process.env.PROD_DATABASE_PATH ?? "data/prod.db";

if (!fs.existsSync(demoPath)) throw new Error(`Demo database not found at ${demoPath}.`);
if (fs.existsSync(prodPath)) {
  const existing = new Database(prodPath, { readonly: true });
  const has = existing.prepare("select count(*) as n from sqlite_master where name = 'communities'").get() as { n: number };
  const rows = has.n ? (existing.prepare("select count(*) as n from communities").get() as { n: number }).n : 0;
  existing.close();
  if (rows > 0) {
    console.log(`${prodPath} is already set up; nothing changed.`);
    process.exit(0);
  }
}

// The schema, from db/schema.ts.
execSync("npx drizzle-kit push --force", { stdio: "inherit", env: { ...process.env, DATABASE_PATH: prodPath } });

const demo = new Database(demoPath, { readonly: true });
const prod = new Database(prodPath);
prod.pragma("journal_mode = WAL");

const copy = (table: string, where: string) => {
  const rows = demo.prepare(`select * from ${table} where ${where}`).all() as Record<string, unknown>[];
  for (const row of rows) {
    const cols = Object.keys(row);
    prod.prepare(`insert into ${table} (${cols.join(", ")}) values (${cols.map(() => "?").join(", ")})`).run(...cols.map((c) => row[c]));
  }
  return rows.length;
};

prod.transaction(() => {
  const members = copy("members", "kind in ('supplier', 'platform')");
  const communities = copy("communities", "1 = 1");
  prod.prepare("update communities set price_mode = 'fixed', settlement_mode = 'supplier', federation_enabled = 0").run();
  console.log(`Created ${prodPath}: ${communities} community, ${members} members (Stadtwerk and platform fees).`);
})();

demo.close();
prod.close();
