import {context} from "esbuild";
import fs from "fs";
import path from "path";
import * as readline from "readline";
import {generateDTSFile} from "./genSettingsTypes.mjs";
import {genSettingsLangFile} from "./genSettingsLangFile.mjs";

const isDev = process.argv.some(arg => arg === "--dev" || arg === "-d");

await fs.promises.rm("ts-out", { recursive: true, force: true });

generateDTSFile();
await genSettingsLangFile();
await fixArrpc();

const NodeCommonOpts = {
    minify: true,
    bundle: true,
    sourcemap: isDev ? "linked" : "external",
    logLevel: "info",
    format: "cjs",
    platform: "node",
    external: ["electron"],
    target: ["esnext"],
    entryPoints: await searchPreloadFiles("src", ["src/main.ts"]),
    outdir: "ts-out",
    packages: "bundle"
};

const ctx = await context(NodeCommonOpts)
await ctx.rebuild()
await ctx.dispose()

if (!isDev) {
    deleteSourceMaps("./ts-out");
}

await fs.promises.cp('./assets/', './ts-out/assets', {recursive: true});

// Every preload file should be marked with "// RENDERER" on the first line so it's included
async function searchPreloadFiles(directory, result = []) {
    await traverseDirectory(directory, async (filePath) => {
        if (await getFirstLine(filePath) === "// RENDERER") {
            result.push(filePath);
        }
    });
    return result;
}

async function fixArrpc() {
    const file = await fs.promises.readFile("./node_modules/arrpc/src/process/index.js", { encoding: 'utf8' });
    const modifiedFile = file.replaceAll(`import fs from 'node:fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DetectableDB = JSON.parse(fs.readFileSync(join(__dirname, 'detectable.json'), 'utf8'));`, `import DetectableDB from "./detectable.json" assert { type: "json" };`);
    await fs.promises.writeFile("./node_modules/arrpc/src/process/index.js", modifiedFile, { encoding: 'utf8' });
}

async function deleteSourceMaps(directoryPath) {
    await traverseDirectory(directoryPath, async (filePath) => {
        if (filePath.endsWith('.map')) {
            void fs.promises.unlink(filePath);
        }
    });
}

async function getFirstLine(pathToFile) {
    const readable = fs.createReadStream(pathToFile);
    const reader = readline.createInterface({ input: readable });
    const line = await new Promise((resolve) => {
        reader.on('line', (line) => {
            reader.close();
            resolve(line);
        });
    });
    readable.close();
    return line;
}

async function traverseDirectory(directory, fileHandler) {
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
