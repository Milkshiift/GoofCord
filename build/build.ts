import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import pc from "picocolors";

import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import { globImporterPlugin } from "./globbyGlob.ts";

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, "ts-out");
const SRC_DIR = path.join(ROOT_DIR, "src");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		dev: { type: "boolean", short: "d" },
		onlyGenerators: { type: "boolean" },
		skipGenerators: { type: "boolean" },
		skipTypecheck: { type: "boolean" },
	},
	strict: false,
	allowPositionals: true,
});

const IS_DEV = !!values.dev;

console.log(pc.cyan(`\n🚀 Starting Build ${IS_DEV ? "(Dev)" : "(Prod)"}\n`));

// 1. Generators
if (!values.skipGenerators) {
	console.log(pc.blue("⚙️  Running generators..."));
	console.time("Generators");
	try {
		await Promise.all([genSettingsLangFile(), genIpcHandlers()]);
	} catch (e) {
		console.error(pc.red("❌ Generators failed"), e);
		process.exit(1);
	}
	console.timeEnd("Generators");

	if (values.onlyGenerators) {
		console.log(pc.green("✅ Generators finished. Exiting as requested."));
		process.exit(0);
	}
}

// 2. Type Checking
if (!values.skipTypecheck) {
	console.log(pc.blue("🔎 Running type check..."));
	const proc = Bun.spawn(["bun", "run", "check"], {
		stdio: ["ignore", "inherit", "inherit"],
		cwd: ROOT_DIR,
	});
	const success = (await proc.exited) === 0;
	if (!success) {
		console.error(pc.red("❌ Type check failed. Build aborted."));
		process.exit(1);
	}
} else {
	console.log(pc.gray("⏩ Skipping type check"));
}

// 3. Clean & Prepare
console.log(pc.blue("🧹 Preparing directories..."));
await fs.promises.rm(OUT_DIR, { recursive: true, force: true });
await fs.promises.mkdir(OUT_DIR, { recursive: true });

// 4. Native Modules & Main Build
console.log(pc.blue("📦 Building sources..."));
console.time("Build");

const results = await Promise.all([buildMain(), ...buildRendererScripts(), ...(await buildPreloads())]);

console.timeEnd("Build");

if (results.every(Boolean)) {
	console.log(pc.green("\n✅ Build completed successfully! 🎉\n"));
} else {
	console.error(pc.red("\n❌ Build completed with errors.\n"));
	process.exit(1);
}

// --- Helper Functions ---

function buildMain() {
	return runBuild({
		label: "Main Process",
		entrypoints: [path.join(SRC_DIR, "main.ts"), path.join(SRC_DIR, "modules", "arrpc", "arrpcWorker.ts")],
		outdir: OUT_DIR,
		target: "node",
		external: ["electron"],
		plugins: [globImporterPlugin],
		splitting: true,
	});
}

function buildRendererScripts() {
	const rendererPath = path.join(SRC_DIR, "windows", "main", "renderer");

	return ["preVencord", "postVencord"].map((name) =>
		runBuild({
			label: `Renderer (${name})`,
			entrypoints: [path.join(rendererPath, name, `${name}.ts`)],
			outdir: ASSETS_DIR,
			target: "browser",
			plugins: [globImporterPlugin],
			minify: false,
			sourcemap: false,
			banner: `// ${name.toLowerCase()}marker`,
		}),
	);
}

async function buildPreloads() {
	const glob = new Bun.Glob("**/preload.{mts,tsx}");
	const builds: Promise<boolean>[] = [];

	for await (const file of glob.scan({ cwd: SRC_DIR, absolute: true })) {
		const relativePath = path.relative(SRC_DIR, file);
		builds.push(
			runBuild({
				label: `Preload (${path.basename(file)})`,
				entrypoints: [file],
				outdir: path.join(OUT_DIR, path.dirname(relativePath)),
				target: "node",
				format: "cjs",
				external: ["electron"],
				plugins: [globImporterPlugin],
			}),
		);
	}
	return builds;
}

type ExtendedBuildConfig = import("bun").BuildConfig & { label?: string };

async function runBuild(config: ExtendedBuildConfig): Promise<boolean> {
	const result = await Bun.build({
		minify: config.minify ?? true,
		sourcemap: config.sourcemap ?? (IS_DEV ? "linked" : undefined),
		format: config.format ?? "esm",
		packages: "bundle",
		...config,
	});

	if (result.logs.length) {
		console.log(pc.yellow(`Logs for ${config.label || config.entrypoints}:`));
		for (const log of result.logs) {
			console.log(log);
		}
	}

	if (!result.success) {
		console.error(pc.red(`Build failed for ${config.label || config.entrypoints}`));
	}

	return result.success;
}
