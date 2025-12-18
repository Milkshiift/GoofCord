import type { BunPlugin, OnLoadArgs } from "bun";
import path from "path";

export const globImporterPlugin: BunPlugin = {
	name: "bun-plugin-glob",
	async setup(build) {
		const namespace = "glob-plugin";
		const filter = /^glob-(import|filenames):/;

		// @ts-ignore
		build.onResolve({ filter }, (args) => {
			if (!args.importer) {
				return {
					errors: [{ text: "glob-plugin cannot be used directly in an entrypoint." }],
				};
			}

			const match = args.path.match(filter);
			const command = match![1];
			const globPattern = args.path.slice(match![0].length);

			return {
				path: `${command}\0${globPattern}\0${args.importer}`,
				namespace,
			};
		});

		// @ts-ignore
		build.onLoad({ filter: /.*/, namespace }, async (args: OnLoadArgs) => {
			const [command, globPattern, importer] = args.path.split("\0");

			if (!command || !globPattern || !importer) {
				return { errors: [{ text: "Internal glob-plugin error: Invalid virtual path." }] };
			}

			const importerDir = path.dirname(importer);
			const glob = new Bun.Glob(globPattern);

			const relativeFiles = await Array.fromAsync(glob.scan(importerDir));

			switch (command) {
				case "import": {
					const imports: string[] = [];
					const objectEntries: string[] = [];
					let counter = 0;

					for (const relativeFile of relativeFiles) {
						const absolutePath = path.resolve(importerDir, relativeFile);

						const keyName = path.basename(absolutePath, ".json");

						const varName = `__glob_${counter++}`;

						// Fix for Windows: Convert backslashes to forward slashes for import paths
						const importPath = absolutePath.replace(/\\/g, "/");

						imports.push(`import ${varName} from "${importPath}";`);

						objectEntries.push(`"${keyName}": ${varName}`);
					}

					const contents = `
                      ${imports.join("\n")}
                      export default { ${objectEntries.join(",\n")} };
                    `;

					return {
						contents,
						loader: "js",
					};
				}

				case "filenames": {
					const filenames = relativeFiles.map((file) => path.basename(file, path.extname(file)));

					const contents = `export default ${JSON.stringify(filenames)};`;
					return { contents, loader: "js" };
				}

				default:
					return { errors: [{ text: `Internal glob-plugin error: Unknown command '${command}'.` }] };
			}
		});
	},
};
