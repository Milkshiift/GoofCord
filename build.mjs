import { context } from "esbuild";
import fs from "fs";
import path from "path";
import * as readline from "readline";

const isDev = process.argv.some(arg => arg === "--dev" || arg === "-d");

await fs.promises.rm("ts-out", { recursive: true, force: true });

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
    outdir: "ts-out"
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
    const files = await fs.promises.readdir(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.isDirectory()) {
            // Recursively search subdirectories
            searchPreloadFiles(filePath, result);
        } else {
            if (await getFirstLine(filePath) === "// RENDERER") {
                result.push(filePath);
            }
        }
    }

    return result;
}

async function deleteSourceMaps(directoryPath) {
    const files = await fs.promises.readdir(directoryPath);

    for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.isDirectory()) {
            deleteSourceMaps(filePath); // Recursively delete files in subdirectory
        } else if (file.endsWith('.map')) {
            fs.promises.unlink(filePath);
        }
    }
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