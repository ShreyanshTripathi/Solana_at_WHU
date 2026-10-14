// Volty runs as two separate copies of the same app, each with its own database:
//  - prod: the real product for customers. Privy login only; no demo accounts, no simulator, no
//    demo controls.
//  - demo: the demo community with its history, one-click demo accounts and the live demo.
// VOLTY_MODE picks the copy (default: demo when DEMO_LOGIN=true, else prod). PROD_URL / DEMO_URL
// point at the other copy, for the switch in the header and sidebar.

export type AppMode = "prod" | "demo";

export function appMode(): AppMode {
  const mode = process.env.VOLTY_MODE;
  if (mode === "prod" || mode === "demo") return mode;
  return process.env.DEMO_LOGIN === "true" ? "demo" : "prod";
}

export const isDemoMode = () => appMode() === "demo";

// The other copy's base URL, or null when it isn't configured (the switch is then hidden).
export function otherModeUrl(): string | null {
  const url = appMode() === "demo" ? process.env.PROD_URL : process.env.DEMO_URL;
  return url ? url.replace(/\/+$/, "") : null;
}
