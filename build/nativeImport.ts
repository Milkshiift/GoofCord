import type { BunPlugin, OnLoadArgs } from "bun";
import path from "path";

interface NativePluginOptions {
	targetPlatform?: string;
	targetArch?: string;
}

export const nativeModulePlugin = (options: NativePluginOptions = {}): BunPlugin => ({
	name: "bun-plugin-native-loader",
	setup(build) {
		const namespace = "native-module-loader";
		const filter = /^native-module:/;

		build.onResolve({ filter }, (args) => {
			if (!args.importer) return null;

			const globPattern = args.path.replace(filter, "");
			const absoluteDir = path.dirname(args.importer);

			return {
				path: `${absoluteDir}\0${globPattern}`,
				namespace,
			};
		});

		build.onLoad({ filter: /.*/, namespace }, async (args: OnLoadArgs) => {
			const [importerDir, globPattern] = args.path.split('\0');

			const targetPlatform = options.targetPlatform || process.platform;
			const targetArch = options.targetArch || process.arch;

			const glob = new Bun.Glob(globPattern);
			const files = await Array.fromAsync(glob.scan(importerDir));

			const matchedFile = files.find(file => {
				const lower = file.toLowerCase();
				return lower.includes(targetPlatform.toLowerCase()) &&
					lower.includes(targetArch.toLowerCase());
			});

			if (!matchedFile) {
				return {
					errors: [{
						text: `Could not find native module for ${targetPlatform}-${targetArch} matching pattern: ${globPattern} in ${importerDir}`,
					}]
				};
			}

			const absolutePath = path.resolve(importerDir, matchedFile);

			const importPath = absolutePath.replace(/\\/g, '/');

			const contents = `
                import path from "${importPath}" with { type: "file" };
                export default path;
            `;

			return {
				contents,
				loader: "js",
			};
		});
	},
});