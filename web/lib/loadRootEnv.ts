import fs from "node:fs";
import path from "node:path";

let loaded = false;

/** Load repo-root `.env` into process.env for keys Next did not set (monorepo). */
export function loadRootEnvOnce(): void {
  if (loaded) return;
  loaded = true;

  const roots = [
    path.join(process.cwd(), ".."),
    process.cwd(),
    path.join(process.cwd(), "../.."),
  ];

  for (const root of roots) {
    for (const name of [".env.local", ".env"]) {
      const filePath = path.join(root, name);
      if (!fs.existsSync(filePath)) continue;
      applyEnvFile(filePath);
    }
  }
}

function applyEnvFile(filePath: string): void {
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
