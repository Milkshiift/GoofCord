import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import pc from "picocolors";

import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import { globImporterPlugin } from "./globbyGlob.ts";
import { nativeModulePlugin } from "./nativeImport";

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, "ts-out");
const SRC_DIR = path.join(ROOT_DIR, "src");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");

const { values } = parseArgs({
	args: Bun.argv,
	options: {
		dev: { type: "boolean", short: "d" },
		platform: { type: "string" },
		arch: { type: "string" },
		onlyGenerators: { type: "boolean" },
		skipGenerators: { type: "boolean" },
		skipTypecheck: { type: "boolean" },
	},
	strict: false,
	allowPositionals: true,
});

const IS_DEV = !!values.dev;
const TARGET_PLATFORM = typeof values.platform === "string" ? values.platform : process.platform;
const TARGET_ARCH = typeof values.arch === "string" ? values.arch : process.arch;

console.log(pc.cyan(`\n🚀 Starting Build for target: ${TARGET_PLATFORM}-${TARGET_ARCH} ${IS_DEV ? "(Dev)" : "(Prod)"}\n`));

// 1. Generators
if (!values.skipGenerators) {
	console.log(pc.blue("⚙️  Running generators..."));
	console.time("Generators");
	try {
		await Promise.all([copyNativeModules(), genSettingsLangFile(), genIpcHandlers()]);
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
	await copyNativeAddonsToOutDir();
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
		plugins: [globImporterPlugin, nativeModulePlugin({ targetPlatform: TARGET_PLATFORM, targetArch: TARGET_ARCH })],
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

async function copyNativeModules() {
	const nativeDir = path.join(ASSETS_DIR, "native");
	await fs.promises.mkdir(nativeDir, { recursive: true });

	const platform = TARGET_PLATFORM === "win32" ? "win32" : "linux";

	const modules = [
		{
			name: "patchcord",
			envPath: process.env.GOOFCORD_PATCHCORD_PATH,
			prebuilds: [
				{ src: ["patchcord", "dist", "patchcord-linux-x64"], platform: "linux", arch: "x64" },
				{ src: ["patchcord", "dist", "patchcord-linux-arm64"], platform: "linux", arch: "arm64" },
			],
		},
		{
			name: "venbind",
			envPath: process.env.GOOFCORD_VENBIND_PATH,
			prebuilds: [
				{ src: ["venbind", "prebuilds", "windows-x86_64", "venbind-windows-x86_64.node"], platform: "win32", arch: "x64" },
				{ src: ["venbind", "prebuilds", "windows-aarch64", "venbind-windows-aarch64.node"], platform: "win32", arch: "arm64" },
				{ src: ["venbind", "prebuilds", "linux-x86_64", "venbind-linux-x86_64.node"], platform: "linux", arch: "x64" },
				{ src: ["venbind", "prebuilds", "linux-aarch64", "venbind-linux-aarch64.node"], platform: "linux", arch: "arm64" },
			],
		},
		// Phase 5 — Windows WASAPI EXCLUDE-tree echo-fix addon, consumed as a published
		// optionalDependency (github:thomas-quant/wasapi-loopback), mirroring patchcord/venbind.
		// Phase 5: env override removed; prebuild-only (host-agnostic copy stays — Bun's file-loader
		// emits zero .node on a Windows build host). bun clones the github ref and the committed
		// prebuild lands at node_modules/wasapi-loopback/prebuilds/windows-x86_64/wasapi-loopback-win32-x64.node.
		// CRITICAL (Pitfall 3): with name "wasapi-loopback" the prebuild dest is
		// `wasapi-loopback-win32-x64.node` on a win32/x64 build — containing BOTH "win32" AND "x64",
		// exactly what nativeImport.ts's glob substring match needs. A name lacking either substring
		// would silently emit `export default null` → silent "loopback" fallback (looks like the fix
		// doesn't work, with no error). The prebuild copy is best-effort (.catch in the prebuild
		// branch), so a missing prebuild off-Windows (bun skips the win32-only optionalDependency)
		// never fails the local build.
		{
			name: "wasapi-loopback",
			prebuilds: [{ src: ["wasapi-loopback", "prebuilds", "windows-x86_64", "wasapi-loopback-win32-x64.node"], platform: "win32", arch: "x64" }],
		},
	];

	const copyFile = async (src: string, dest: string) => {
		await fs.promises.access(src);
		await Bun.write(dest, Bun.file(src));

		if (process.platform !== "win32") {
			await fs.promises.chmod(dest, 0o755);
		}
	};

	const tasks = modules.flatMap((mod) => {
		if (mod.envPath) {
			const ext = path.extname(mod.envPath);
			const dest = path.join(nativeDir, `${mod.name}-${platform}-${TARGET_ARCH}${ext}`);

			console.log(pc.cyan(`Using env override for ${mod.name}:`));
			console.log(pc.gray(`  Input:  ${mod.envPath}`));
			console.log(pc.gray(`  Output: ${path.basename(dest)}`));

			return [
				copyFile(mod.envPath, dest).catch((e) => {
					console.error(pc.red(`❌ Provided ENV path for ${mod.name} is invalid or unreadable.`));
					throw e;
				}),
			];
		}

		return mod.prebuilds.map((prebuild) => {
			const src = path.join(ROOT_DIR, "node_modules", ...prebuild.src);
			const ext = path.extname(src);
			const dest = path.join(nativeDir, `${mod.name}-${prebuild.platform}-${prebuild.arch}${ext}`);

			return copyFile(src, dest).catch(() => {});
		});
	});

	await Promise.all(tasks);
	return true;
}

// Phase 4 — HOST-AGNOSTIC native-addon emission into ts-out/native/.
//
// The `native-module:` Bun file-loader (build/nativeImport.ts, `with { type: "file" }`) silently
// fails to copy the .node into OUT_DIR when the BUILD HOST is Windows (CI windows-latest on bun
// `latest`): ts-out ends up with ZERO .node files, so every addon resolves to `export default null`
// → silent "loopback" fallback (Pitfall 3 — looks like the echo fix doesn't work, with no error).
// A plain fs copy is deterministic across Linux/macOS/Windows build hosts. wasapiLoopback.ts loads
// the addon from this ts-out/native/ path at runtime (NOT via the file-loader). electron-builder's
// per-platform `files` filters already key off `ts-out/native/*-<plat>-*.node`, so packaging needs
// no change. Scoped to wasapi-loopback only; venbind keeps the `native-module:` loader for now.
// Phase 5: the env override is gone, but this host-agnostic copy STAYS — it is the permanent fix
// for Bun's Windows-host file-loader bug (zero .node emitted), NOT env-override scaffolding.
async function copyNativeAddonsToOutDir() {
	const srcDir = path.join(ASSETS_DIR, "native");
	const destDir = path.join(OUT_DIR, "native");

	let entries: string[];
	try {
		entries = await fs.promises.readdir(srcDir);
	} catch {
		return; // nothing staged for this platform → nothing to copy
	}

	const addons = entries.filter((name) => /^wasapi-loopback-.*\.node$/.test(name));
	if (addons.length === 0) return;

	await fs.promises.mkdir(destDir, { recursive: true });
	await Promise.all(
		addons.map(async (name) => {
			await Bun.write(path.join(destDir, name), Bun.file(path.join(srcDir, name)));
			console.log(pc.cyan("Copied native addon into ts-out/native:"), name);
		}),
	);
}
