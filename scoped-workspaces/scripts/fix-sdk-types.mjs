// Workaround for @tetralabs/loom-react 0.1.0: its published .d.ts files import
// "../../loom/src/index.ts", a path @tetralabs/loom does not ship. Recreate it
// as a re-export of the shipped typings. Remove when the SDK publishes a fix.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@tetralabs", "loom", "src");
if (!existsSync(join(src, "index.ts"))) {
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, "index.ts"), 'export * from "../dist/index";\n');
  writeFileSync(join(src, "admin.ts"), 'export * from "../dist/admin";\n');
}
