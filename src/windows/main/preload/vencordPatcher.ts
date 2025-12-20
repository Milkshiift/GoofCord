import { error, log } from "../../../modules/logger.ts";

export function patchVencord(bundle: string) {
	// We use an anchor to run regex only on a small snippet. Saves 4ms.
	const anchor = 'Symbol("WebpackPatcher.isProxiedFactory")';
	const anchorIndex = bundle.indexOf(anchor);

	if (anchorIndex !== -1) {
		const startIndex = Math.max(0, anchorIndex - 150);
		const endIndex = anchorIndex + anchor.length + 50;

		const snippet = bundle.slice(startIndex, endIndex);

		// This finds:
		// export const patches = []
		// From patchWebpack.ts in the original code
		const patcherHookRegex = /([a-zA-Z_$][\w$]*)\s*=\s*\[\s*\](\s*[,;]\s*(?:(?:var|const|let)\s+)?[a-zA-Z_$][\w$]*\s*=\s*Symbol\("WebpackPatcher\.isProxiedFactory"\))/;
		const patcherHookReplacement = "$1=window.__GOOFCORD_PATCHES__=window.__GOOFCORD_PATCHES__||[]$2";

		if (patcherHookRegex.test(snippet)) {
			const patchedSnippet = snippet.replace(patcherHookRegex, patcherHookReplacement);

			const final = bundle.slice(0, startIndex) + patchedSnippet + bundle.slice(endIndex);

			log("Successfully hooked Vencord Patcher!");

			return final;
		}
		error("Anchor found, but Regex failed to match within the window.");
	} else {
		error("Could not find Vencord Patcher anchor string.");
	}
	return "";
}
