// Utilities specific to preload scripts

export async function addStyle(styleString: string) {
	const style = document.createElement("style");
	style.textContent = styleString;
	while (document.documentElement === null) await new Promise((resolve) => setTimeout(resolve, 1));
	document.documentElement.appendChild(style);
}

export async function addScript(scriptString: string) {
	const script = document.createElement("script");
	script.textContent = scriptString;
	while (document.documentElement === null) await new Promise((resolve) => setTimeout(resolve, 1));
	document.documentElement.appendChild(script);
}

export function findKeyAtDepth(obj: object, targetKey: string, depth: number) {
	if (depth === 1) {
		return obj[targetKey] || undefined;
	}

	for (const key in obj) {
		if (typeof obj[key] === "object" && obj[key] !== null) {
			const result = findKeyAtDepth(obj[key], targetKey, depth - 1);
			if (result !== undefined) {
				return result;
			}
		}
	}

	return undefined;
}
