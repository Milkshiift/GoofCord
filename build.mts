import { BuildOptions, context } from "esbuild";
import fs from "fs-extra";
import path from "path";

const isDev = process.argv.some(arg => arg === "--dev" || arg === "-d");

const NodeCommonOpts: BuildOptions = {
    minify: true,
    bundle: true,
    sourcemap: isDev ? "linked" : undefined,
    logLevel: "info",
    format: "cjs",
    platform: "node",
    external: ["electron"],
    target: ["esnext"],
    // @ts-ignore
    entryPoints: await searchPreloadFiles("src", ["src/main.ts"]),
    outdir: "ts-out"
};


// Every preload file should be marked with "// RENDERER" on the first line so it's included
async function searchPreloadFiles(directory: string, result: string[] = []) {
    const files = await fs.readdir(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
            // Recursively search subdirectories
            await searchPreloadFiles(filePath, result);
        } else {
            const data = await fs.readFile(filePath, "utf8");
            const firstLine = data.split('\n')[0];

            if (firstLine === "// RENDERER") {
                result.push(filePath);
            }
        }
    }

    return result;
}

(async () => {
    const ctx = await context(NodeCommonOpts)
    await ctx.rebuild()
    await ctx.dispose()
})()

// @ts-ignore
await fs.copy('./assets/', './ts-out/assets');