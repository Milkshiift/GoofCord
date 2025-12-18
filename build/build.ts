// Every script in the "build" directory is meant to be run with Bun

import fs from "node:fs";
import path from "node:path";
import { genIpcHandlers } from "./genIpcHandlers.ts";
import { genSettingsLangFile } from "./genSettingsLangFile.ts";
import { generateDTSFile } from "./genSettingsTypes.ts";
import pc from "picocolors";
import { globImporterPlugin } from "./globbyGlob.ts";

const isDev = process.argv.some((arg) => arg === "--dev" || arg === "-d");

await fs.promises.rm("ts-out", { recursive: true, force: true });

console.log("Preprocessing...");
console.time("dtc");
await generateDTSFile();
console.timeEnd("dtc");
console.time("lang");
await genSettingsLangFile();
console.timeEnd("lang");
console.time("Ipc");
await genIpcHandlers();
console.timeEnd("Ipc");

console.log("Building...");
await fs.promises.mkdir("ts-out");

const preloadFiles = await searchPreloadFiles("src", []);
const mainEntrypoints = [path.join("src", "main.ts"), path.join("src", "modules", "arrpcWorker.ts")];

// ESM with splitting
const mainBundleResult = await Bun.build({
  minify: true,
  sourcemap: isDev ? "linked" : undefined,
  format: "esm",
  external: ["electron"],
  target: "node",
  splitting: true,
  entrypoints: mainEntrypoints,
  outdir: "ts-out",
  packages: "bundle",
  plugins: [globImporterPlugin],
});
if (mainBundleResult.logs.length) console.log(mainBundleResult.logs);

// CommonJS, no splitting
for (const preloadFile of preloadFiles) {
  const relativePath = path.relative("src", preloadFile);
  const outDir = path.join("ts-out", path.dirname(relativePath));

  await fs.promises.mkdir(outDir, { recursive: true });

  const preloadBundleResult = await Bun.build({
    minify: true,
    sourcemap: isDev ? "linked" : undefined,
    format: "cjs",
    external: ["electron"],
    target: "node",
    splitting: false,
    entrypoints: [preloadFile],
    outdir: outDir,
    packages: "bundle",
    plugins: [globImporterPlugin],
  });

  if (preloadBundleResult.logs.length) console.log(preloadBundleResult.logs);
}

await copyVenmic();
await copyVenbind();

await fs.promises.cp("./assets/", "./ts-out/assets", { recursive: true });
// Lang files are prebaked
await fs.promises.rm("./ts-out/assets/lang", { recursive: true, force: true });

async function searchPreloadFiles(directory: string, result: string[] = []) {
  await traverseDirectory(directory, async (filePath: string) => {
    if (filePath.endsWith("preload.mts")) {
      result.push(filePath);
    }
  });
  return result;
}

async function traverseDirectory(
  directory: string,
  fileHandler: (filePath: string) => void,
) {
  const files = await fs.promises.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = await fs.promises.stat(filePath);

    if (stats.isDirectory()) {
      // Recursively search subdirectories
      await traverseDirectory(filePath, fileHandler);
    } else {
      fileHandler(filePath);
    }
  }
}

function copyVenmic() {
  if (process.platform !== "linux") return;

  return Promise.all([
    copyFile(
      "./node_modules/@vencord/venmic/prebuilds/venmic-addon-linux-x64/node-napi-v7.node",
      "./assets/venmic-x64.node",
    ),
    copyFile(
      "./node_modules/@vencord/venmic/prebuilds/venmic-addon-linux-arm64/node-napi-v7.node",
      "./assets/venmic-arm64.node",
    ),
  ]).catch(() =>
    console.warn("Failed to copy venmic. Building without venmic support"),
  );
}

function copyVenbind() {
  if (process.platform === "win32") {
    return Promise.all([
      copyFile(
        "./node_modules/venbind/prebuilds/windows-x86_64/venbind-windows-x86_64.node",
        "./assets/venbind-win32-x64.node",
      ),
      copyFile(
        "./node_modules/venbind/prebuilds/windows-aarch64/venbind-windows-aarch64.node",
        "./assets/venbind-win32-arm64.node",
      ),
    ]).catch(() =>
      console.warn("Failed to copy venbind. Building without venbind support"),
    );
  }

  if (process.platform === "linux") {
    return Promise.all([
      copyFile(
        "./node_modules/venbind/prebuilds/linux-x86_64/venbind-linux-x86_64.node",
        "./assets/venbind-linux-x64.node",
      ),
      copyFile(
        "./node_modules/venbind/prebuilds/linux-aarch64/venbind-linux-aarch64.node",
        "./assets/venbind-linux-arm64.node",
      ),
    ]).catch(() =>
      console.warn("Failed to copy venbind. Building without venbind support"),
    );
  }
}

async function copyFile(src: string, dest: string) {
  await Bun.write(dest, Bun.file(src));
}

console.log(pc.green("✅ Build completed! 🎉"));
