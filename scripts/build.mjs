import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const result = await build({
  entryPoints: ["src/business.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  legalComments: "inline",
});
const template = await readFile("src/index.html", "utf8");
await writeFile(
  "downloads/Lemonade-Lane.html",
  template.replace(
    "<!-- GAME_BUNDLE -->",
    () =>
      "<script>" +
      result.outputFiles[0].text.replaceAll("</script", "<\/script") +
      "</script>",
  ),
);
execFileSync("python3", ["scripts/package.py"], { stdio: "inherit" });
