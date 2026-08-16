import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const sourceDir = path.join(root, "content", "large-worlds");
const output = path.join(root, "app", "large-worlds.generated.json");
const definitions = ["l01_data.mjs", "l02_data.mjs"];
const worlds = [];

for (const file of definitions) {
  const source = await import(`${pathToFileURL(path.join(sourceDir, file)).href}?v=${Date.now()}`);
  worlds.push(source.default);
}

for (const world of worlds) {
  if (world.acts.length !== 100 || world.actCount !== 100) throw new Error(`${world.id} act count mismatch`);
  if (world.acts.filter((act) => act.freeInput).length !== 20) throw new Error(`${world.id} free-input count mismatch`);
  if (world.endings.length !== 8) throw new Error(`${world.id} ending count mismatch`);
  if (world.characters.length !== 6) throw new Error(`${world.id} character count mismatch`);
  if (world.metrics.length !== 6) throw new Error(`${world.id} metric count mismatch`);
  if (new Set(world.acts.flatMap((act) => act.choices.map((choice) => choice.id))).size !== 300) throw new Error(`${world.id} choice IDs are not unique`);
  for (const act of world.acts) {
    if (act.choices.length !== 3 || act.prose.length < 5 || !act.objective || !act.conflict || !act.clue || !act.hook) {
      throw new Error(`${world.id} act ${act.no} is incomplete`);
    }
  }
}

fs.writeFileSync(output, `${JSON.stringify(worlds)}\n`, "utf8");
console.log(JSON.stringify({ output, worlds:worlds.map((world) => ({ id:world.id, acts:world.acts.length, free:world.acts.filter((act) => act.freeInput).length, endings:world.endings.length })) }, null, 2));
