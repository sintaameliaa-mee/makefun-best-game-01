// Entrypoint for the Aurora Keep submission: copies game/ and screenshots/
// into the output directory and writes dossier.json with the kit's
// buildDossier. On the grader the output directory is a mounted volume, so
// this never removes the directory itself — it only empties its contents.
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const TEXT_MAX_BYTES = 163840;

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

async function emptyContents(dir) {
  await mkdir(dir, { recursive: true });
  const children = await readdir(dir);
  for (const child of children) {
    await rm(join(dir, child), { recursive: true, force: true });
  }
}

async function main() {
  await emptyContents(outputDir);
  await cp(join(repoRoot, "game"), join(outputDir, "game"), { recursive: true });
  await cp(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });
  const dossier = await buildDossier(outputDir, { text_max_bytes: TEXT_MAX_BYTES });
  await writeFile(join(outputDir, "dossier.json"), dossier);
  console.log(`wrote ${join(outputDir, "dossier.json")} (${dossier.length} bytes)`);
}

await main();
