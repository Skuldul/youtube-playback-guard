import { build } from "esbuild";
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";

const target = process.argv[2];
if (!["chrome", "firefox"].includes(target)) {
  console.error("Usage: node build.js <browser>");
  process.exit(1);
}

await buildTarget(target);
console.log(`Built: dist/${target}`);

async function buildTarget(target) {
  const outdir = path.join("dist", target);
  
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });

  // Copy the existing modules to dist.
  await build({
    entryPoints: ["src/background.js", "src/pages/options/options.js"],
    outdir,
    outbase: ".",
    bundle: true,
    sourcemap: true,
    target: "es2020",
    format: "esm",
    splitting: false,
    platform: "browser",
    minify: true,
  });

  // Convert the content.js file from a module and copy to dist.
  await build({
    entryPoints: ["src/content.js"],
    outdir,
    outbase: ".",
    bundle: true,
    sourcemap: true,
    target: "es2020",
    format: "iife",
    platform: "browser",
    minify: true,
  });

  // Merge manifests and copy to dist.
  const base = await loadJson("manifests/manifest.base.json");
  const override = await loadJson(`manifests/manifest.${target}.json`);
  const manifest = deepMerge(base, override);

  await writeFile(
    path.join(outdir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  // Copy assets to dist.
  await safeCopyDir("assets", path.join(outdir, "assets"));

  // Copy options static files (HTML/CSS) to dist.
  await safeCopyFile(
    "src/pages/options/options.html",
    path.join(outdir, "src/pages/options/options.html")
  );
  await safeCopyFile(
    "src/pages/options/options.css",
    path.join(outdir, "src/pages/options/options.css")
  );
}

function deepMerge(base, override) {
  // objects merge, arrays replace
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (base && typeof base === "object" && override && typeof override === "object") {
    const out = { ...base };
    for (const [k, v] of Object.entries(override)) out[k] = deepMerge(base?.[k], v);
    return out;
  }
  return override ?? base;
}

async function loadJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

async function safeCopyDir(from, to) {
  try {
    await cp(from, to, { recursive: true });
  } catch (e) {
    if (e?.code === "ENOENT") return;
    throw e;
  }
}

async function safeCopyFile(from, to) {
  try {
    await mkdir(path.dirname(to), { recursive: true });
    await cp(from, to);
  } catch (e) {
    if (e?.code === "ENOENT") return;
    throw e;
  }
}

