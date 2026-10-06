// Bundles src/ into dist/ with esbuild. `--serve` runs a local dev server.
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const serve = process.argv.includes("--serve");
const outdir = "dist";

// Public config. The Supabase publishable key is safe in the browser:
// row-level security limits it to reading active catalogue rows.
const env = {
  SUPABASE_URL: process.env.SUPABASE_URL || "https://bkxgdaytwhguupajgodj.supabase.co",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "sb_publishable_WWd-33bTDGcJAqcGRzjrFA_ovb0WqsI",
};

mkdirSync(outdir, { recursive: true });
cpSync("public", outdir, { recursive: true });

const options = {
  entryPoints: ["src/main.tsx"],
  bundle: true,
  outdir,
  entryNames: serve ? "app" : "app-[hash]",
  minify: !serve,
  sourcemap: true,
  target: ["es2020", "chrome90", "safari15", "firefox90"],
  jsx: "automatic",
  loader: { ".css": "css" },
  metafile: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify(serve ? "development" : "production"),
    __SUPABASE_URL__: JSON.stringify(env.SUPABASE_URL),
    __SUPABASE_KEY__: JSON.stringify(env.SUPABASE_KEY),
  },
  // Lets the build use a shared node_modules when one isn't installed locally.
  nodePaths: process.env.ML_NODE_PATH ? [process.env.ML_NODE_PATH] : [],
};

function writeIndex(metafile) {
  const outputs = Object.keys(metafile.outputs);
  const js = outputs.find((f) => f.endsWith(".js"))?.replace(`${outdir}/`, "");
  const css = outputs.find((f) => f.endsWith(".css"))?.replace(`${outdir}/`, "");
  const html = readFileSync("src/index.html", "utf8")
    .replace("<!-- CSS -->", css ? `<link rel="stylesheet" href="/${css}">` : "")
    .replace("<!-- JS -->", `<script type="module" src="/${js}"></script>`);
  writeFileSync(`${outdir}/index.html`, html);
}

if (serve) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{ name: "index", setup(b) { b.onEnd((r) => r.metafile && writeIndex(r.metafile)); } }],
  });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: Number(process.env.PORT) || 5173, fallback: `${outdir}/index.html` });
  console.log(`Monitor Lab running at http://localhost:${port}`);
} else {
  const result = await esbuild.build(options);
  writeIndex(result.metafile);
  const size = Object.values(result.metafile.outputs).reduce((t, o) => t + o.bytes, 0);
  console.log(`Built to ${outdir}/ (${Math.round(size / 1024)} KB incl. sourcemaps)`);
}
