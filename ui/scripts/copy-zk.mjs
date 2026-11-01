// Copies the compiled proving keys and ZKIR into public/ so the browser can fetch them.
// Run `npm run compile` in the repo root first.
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const managed = path.resolve(here, "../../contract/managed/feedback");
const destRoot = path.resolve(here, "../public/managed/feedback");

for (const dir of ["keys", "zkir"]) {
  if (!existsSync(path.join(managed, dir))) {
    console.error(`[copy:zk] ${path.join(managed, dir)} not found.\nCompile the contract first, from the repo root:  npm run compile`);
    process.exit(1);
  }
}
rmSync(destRoot, { recursive: true, force: true });
for (const dir of ["keys", "zkir"]) {
  cpSync(path.join(managed, dir), path.join(destRoot, dir), { recursive: true });
}
console.log(`[copy:zk] copied keys/ and zkir/ to ${path.relative(process.cwd(), destRoot)}`);
