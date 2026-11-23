// Puts the prototype together into one page: node design/prototype/build.mjs > themes.html
// BASE_STRINGS comes from core/locales.ts (en, ru, ar); RASTER is empty since the picture samples were dropped.
import { readFileSync } from "node:fs";
const here = new URL(".", import.meta.url);
const read = f => readFileSync(new URL(f, here), "utf8");
const src = readFileSync(new URL("../../core/locales.ts", here), "utf8")
    .replace(/^import .*$/m, "").replace(/^type Strings.*$/m, "")
    .replace(/^const ([a-z]+): Strings/gm, "const $1").replace(/: Record<string, Strings>/, "");
const tables = new Function(src.slice(0, src.indexOf("const STRINGS")) + "return { en, ru, ar };")();
let page = read("page.html")
    .replace("/*RASTER*/", "const RASTER = {};")
    .replace("/*STRINGS*/", () => "const BASE_STRINGS = " + JSON.stringify(tables) + ";")
    .replace("/*NEW*/", () => read("strings-new.js"))
    .replace("/*ART*/", () => read("art.js"))
    .replace("/*APP*/", () => read("app.js"));
process.stdout.write(page);
