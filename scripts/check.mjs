/*
 * Verifies the production build in dist/:
 *   - all eight pages and the compiled stylesheet exist
 *   - no unresolved @include markers or {{tokens}} remain
 *   - every local href/src (and #fragment) resolves
 *   - each page has the required structure (lang, dir, title, one <h1>, <main id="main">)
 *   - shared header controls and the current-page marker are present
 *     (the student portal, an app page, is checked for its own sidebar and top-bar controls)
 *   - the footer has exactly four social links, opened safely in a new tab
 *   - no unwanted placeholder wording is visible
 *
 *   npm run build && npm run check
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const PAGES = [
  "index.html",
  "home-2.html",
  "classes.html",
  "shows.html",
  "about.html",
  "contact.html",
  "dashboard.html",
  "login.html",
];
const FORBIDDEN_TEXT = /\b(demo|sample|mock|lorem ipsum|placeholder|dummy|coming soon)\b/i;
const REQUIRED_CSS = [
  ".btn-primary",
  ".form-control",
  ".container-site",
  ".mobile-menu",
  ".dir-switch",
  ":root[data-theme=dark]", // minified form of the dark theme selector
  "--color-orange",
];
const HEADER_HOOKS = [
  "data-theme-toggle",
  'data-dir-option="ltr"',
  'data-dir-option="rtl"',
  "data-menu-toggle",
  "data-disclosure-trigger",
];
// App pages (the student portal) use their own sidebar and top bar instead of the
// public header and footer, so they are checked for the portal controls instead.
const APP_PAGES = new Set(["dashboard.html"]);
const APP_HOOKS = [
  "data-theme-toggle",
  'data-dir-option="ltr"',
  'data-dir-option="rtl"',
  "data-sidebar-toggle",
  "data-sidebar-close",
  'href="login.html"', // logout
  'class="skip-link"',
];

const errors = [];
const fail = (message) => errors.push(message);

function idsIn(html) {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
}

if (!existsSync(distDir)) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

const cssPath = path.join(distDir, "css", "main.css");
if (!existsSync(cssPath) || statSync(cssPath).size === 0) {
  fail("css/main.css is missing or empty");
} else {
  const css = readFileSync(cssPath, "utf8");
  for (const needle of REQUIRED_CSS) {
    if (!css.includes(needle)) fail(`css/main.css does not contain "${needle}"`);
  }
  for (const [, url] of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (/^(data:|https?:|#)/.test(url)) continue;
    if (!existsSync(path.resolve(path.dirname(cssPath), url))) fail(`css/main.css: broken url(${url})`);
  }
}

let linkCount = 0;
for (const page of PAGES) {
  const pagePath = path.join(distDir, page);
  if (!existsSync(pagePath)) {
    fail(`${page}: missing`);
    continue;
  }
  const html = readFileSync(pagePath, "utf8");
  const ids = idsIn(html);

  // Structure
  if (/@include|@page/.test(html)) fail(`${page}: unresolved build directive`);
  if (/\{\{.*?\}\}/.test(html)) fail(`${page}: unresolved {{token}}`);
  if (!/<html[^>]*\slang="[^"]+"/.test(html)) fail(`${page}: <html> is missing lang`);
  if (!/<html[^>]*\sdir="ltr"/.test(html)) fail(`${page}: <html> is missing dir="ltr"`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${page}: missing <title>`);
  if (!/<main[^>]*\sid="main"/.test(html)) fail(`${page}: missing <main id="main">`);
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) fail(`${page}: expected exactly one <h1>, found ${h1Count}`);

  if (APP_PAGES.has(page)) {
    // Portal shell
    for (const hook of APP_HOOKS) {
      if (!html.includes(hook)) fail(`${page}: portal control [${hook}] missing`);
    }
    if (!/<aside[^>]*data-sidebar/.test(html)) fail(`${page}: missing portal sidebar`);
  } else {
    // Shared header
    for (const hook of HEADER_HOOKS) {
      if (!html.includes(hook)) fail(`${page}: header control [${hook}] missing`);
    }
    const currentCount = (html.match(/aria-current="page"/g) ?? []).length;
    if (currentCount !== 2) fail(`${page}: expected current page marked in desktop and mobile nav, found ${currentCount}`);

    // Shared footer
    const socialLinks = html.match(/<a class="social-link"[^>]*>/g) ?? [];
    if (socialLinks.length !== 4) fail(`${page}: expected 4 social links, found ${socialLinks.length}`);
    for (const tag of socialLinks) {
      if (!/aria-label="[^"]+"/.test(tag)) fail(`${page}: social link without aria-label`);
    }
  }
  for (const [tag] of html.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener[^"]*"/.test(tag)) fail(`${page}: target="_blank" link without rel="noopener"`);
  }

  // Wording
  const forbidden = visibleText(html).match(FORBIDDEN_TEXT);
  if (forbidden) fail(`${page}: contains unwanted wording "${forbidden[0]}"`);

  // Local links and assets
  for (const [, attr, value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(value)) continue;
    linkCount++;
    const [target, fragment] = value.split("#");
    const targetPath = target ? path.join(distDir, target.split("?")[0]) : pagePath;
    if (!existsSync(targetPath)) {
      fail(`${page}: broken ${attr}="${value}"`);
      continue;
    }
    if (fragment) {
      const targetIds = target ? idsIn(readFileSync(targetPath, "utf8")) : ids;
      if (!targetIds.has(fragment)) fail(`${page}: ${attr}="${value}" points to a missing id`);
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) found:\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✓ ${PAGES.length} pages OK, ${linkCount} local links/assets resolved, stylesheet verified.`);
