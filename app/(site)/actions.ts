"use server";

import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";

// "Talk to us about a pilot" on the home page. Kept in a small file next to the database (data/ is
// never committed) until there is a CRM; the Stadtwerk console doesn't need it.
export async function requestPilot(formData: FormData) {
  const field = (name: string, max: number) => String(formData.get(name) ?? "").trim().slice(0, max);
  const request = { name: field("name", 120), organisation: field("organisation", 160), email: field("email", 200), at: new Date().toISOString() };
  if (!request.name || !request.organisation || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) redirect("/?pilot=invalid#stadtwerke");
  const file = path.join(process.cwd(), "data", "pilot-requests.jsonl");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(request) + "\n");
  redirect("/?pilot=1#stadtwerke");
}
