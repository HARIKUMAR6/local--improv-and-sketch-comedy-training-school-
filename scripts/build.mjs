/*
 * Static site build. Assembles pages from shared partials, copies JS and
 * assets, and compiles Tailwind CSS into dist/.
 *
 *   node scripts/build.mjs                   production build (minified CSS)
 *   node scripts/build.mjs --watch           rebuild on change, includes dev-only pages
 *   node scripts/build.mjs --watch --serve   ...and serve dist/ locally
 *
 * Page syntax (see README.md):
 *   <!-- @page title="Classes" nav="classes" description="..." -->   first line of a page
 *   <!-- @include partials/header.html -->                          path relative to src/
 *   {{site.name}}  {{page.title}}  {{build.year}}                    values from site.json / @page
 */
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const pagesDir = path.join(srcDir, "pages");
const distDir = path.join(root, "dist");
const tailwindBin = path.join(root, "node_modules", "@tailwindcss", "cli", "dist", "index.mjs");

const args = new Set(process.argv.slice(2));
const isWatch = args.has("--watch");
const shouldServe = args.has("--serve");

const PAGE_RE = /^\s*<!--\s*@page\b([\s\S]*?)-->\s*/;
const INCLUDE_RE = /<!--\s*@include\s+(\S+)\s*-->/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

// Pages whose file name starts with "_" are development references (e.g. the
// component style guide). They are built in watch mode only.
const isDevOnlyPage = (file) => file.startsWith("_");

function parseAttrs(source) {
  return Object.fromEntries([...source.matchAll(ATTR_RE)].map((m) => [m[1], m[2]]));
}

async function resolveIncludes(html, from, stack = []) {
  let output = "";
  let last = 0;
  for (const match of html.matchAll(INCLUDE_RE)) {
    const target = match[1];
    if (stack.includes(target)) {
      throw new Error(`Circular include: ${[...stack, target].join(" -> ")}`);
    }
    let content;
    try {
      content = await readFile(path.join(srcDir, target), "utf8");
    } catch {
      throw new Error(`${from}: cannot include "${target}" (expected at src/${target})`);
    }
    output += html.slice(last, match.index);
    output += await resolveIncludes(content.trim(), target, [...stack, target]);
    last = match.index + match[0].length;
  }
  return output + html.slice(last);
}

function interpolate(html, context, file) {
  return html.replace(TOKEN_RE, (token, key) => {
    const value = key.split(".").reduce((obj, part) => obj?.[part], context);
    if (value === undefined) throw new Error(`${file}: unknown value ${token}`);
    return String(value);
  });
}

async function renderPage(file, site) {
  const raw = await readFile(path.join(pagesDir, file), "utf8");
  const declaration = raw.match(PAGE_RE);
  if (!declaration) throw new Error(`${file}: missing <!-- @page ... --> declaration on the first line`);

  const page = {
    description: site.description,
    robots: "index, follow",
    ...parseAttrs(declaration[1]),
  };
  page.documentTitle = page.title ? `${page.title} | ${site.name}` : `${site.name} | ${site.tagline}`;

  const context = { site, page, build: { year: new Date().getFullYear() } };
  let html = await resolveIncludes(raw.slice(declaration[0].length), file);
  html = interpolate(html, context, file);

  // Highlight the current page in the shared navigation.
  if (page.nav) {
    const marker = `data-nav="${page.nav}"`;
    if (!html.includes(marker)) console.warn(`[html] ${file}: no navigation item for nav="${page.nav}"`);
    html = html.replaceAll(marker, `${marker} aria-current="page"`);
  }
  return html;
}

async function buildHtml() {
  const site = JSON.parse(await readFile(path.join(srcDir, "site.json"), "utf8"));
  const files = (await readdir(pagesDir)).filter(
    (file) => file.endsWith(".html") && (isWatch || !isDevOnlyPage(file)),
  );
  await mkdir(distDir, { recursive: true });
  await Promise.all(
    files.map(async (file) => writeFile(path.join(distDir, file), await renderPage(file, site))),
  );
  console.log(`[html] built ${files.length} page(s): ${files.join(", ")}`);
}

async function copyStatic() {
  for (const dir of ["js", "assets"]) {
    await rm(path.join(distDir, dir), { recursive: true, force: true });
    await cp(path.join(srcDir, dir), path.join(distDir, dir), {
      recursive: true,
      filter: (source) => path.basename(source) !== ".gitkeep",
    });
  }
  console.log("[static] copied js/ and assets/");
}

function runTailwind() {
  const child = spawn(
    process.execPath,
    // "--watch=always" keeps watching even when stdin is closed (e.g. in CI or background shells).
    [tailwindBin, "-i", "src/css/main.css", "-o", "dist/css/main.css", isWatch ? "--watch=always" : "--minify"],
    { cwd: root, stdio: "inherit" },
  );
  if (isWatch) {
    child.on("exit", (code) => {
      console.error(`[css] Tailwind watcher stopped (code ${code}); restart \`npm run dev\`.`);
      process.exit(1);
    });
    process.on("exit", () => child.kill());
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Tailwind exited with code ${code}`))));
  });
}

function watchSources() {
  const changed = new Set();
  let timer;

  async function rebuild() {
    const areas = [...changed];
    changed.clear();
    try {
      // Icons are inlined into pages, so asset changes rebuild HTML too.
      if (areas.some((area) => ["pages", "partials", "assets", "site.json"].includes(area))) await buildHtml();
      if (areas.some((area) => ["js", "assets"].includes(area))) await copyStatic();
    } catch (error) {
      console.error(`[build] ${error.message}`);
    }
  }

  watch(srcDir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    changed.add(filename.split(/[\\/]/)[0]);
    clearTimeout(timer);
    timer = setTimeout(rebuild, 75);
  });
  console.log("[watch] watching src/ for changes (Ctrl+C to stop)");
}

try {
  await rm(distDir, { recursive: true, force: true });
  await Promise.all([buildHtml(), copyStatic()]);
  await runTailwind();
  if (isWatch) {
    watchSources();
    if (shouldServe) startServer();
  } else {
    console.log("[build] done → dist/");
  }
} catch (error) {
  console.error(`[build] failed: ${error.message}`);
  process.exit(1);
}
