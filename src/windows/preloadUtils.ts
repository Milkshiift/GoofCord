// Utilities specific to preload scripts

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
