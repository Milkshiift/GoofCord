import path from "node:path";
import type { BunPlugin, OnLoadArgs } from "bun";

interface GlobPluginData {
	command: "import" | "filenames";
	globPattern: string;
	importer: string;
}

export const globImporterPlugin: BunPlugin = {
	name: "bun-plugin-glob",
	async setup(build) {
		const namespace = "glob-plugin";
		const filter = /^glob-(import|filenames):/;

		const encodeId = (data: GlobPluginData) => Buffer.from(JSON.stringify(data)).toString("base64url");
		const decodeId = <T>(id: string): T => JSON.parse(Buffer.from(id, "base64url").toString());

		// @ts-expect-error
		build.onResolve({ filter }, (args) => {
			if (!args.importer) {
				return {
					errors: [{ text: "glob-plugin cannot be used directly in an entrypoint." }],
				};
			}

			const match = args.path.match(filter);
			const command = match?.[1] as GlobPluginData["command"];
			// Remove the prefix to get the raw glob pattern
			const globPattern = args.path.slice(match?.[0].length);

			// Encode into a safe Base64 string
			const encodedData = encodeId({
				command,
				globPattern,
				importer: args.importer,
			});

			return {
				path: encodedData,
				namespace,
			};
		});

		// @ts-expect-error
		build.onLoad({ filter: /.*/, namespace }, async (args: OnLoadArgs) => {
			// Decode the data back from the path
			let data: GlobPluginData;
			try {
				data = decodeId<GlobPluginData>(args.path);
			} catch (e) {
				return { errors: [{ text: "Internal glob-plugin error: Failed to decode virtual path." }] };
			}

			const { command, globPattern, importer } = data;

			if (!command || !globPattern || !importer) {
				return { errors: [{ text: "Internal glob-plugin error: Invalid virtual path data." }] };
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

					return {
						contents,
						loader: "js",
					};
				}

				default:
					return { errors: [{ text: `Internal glob-plugin error: Unknown command '${command}'.` }] };
			}
		});
	},
};
