import { createHydrator } from "../hydrator";

const locState = createHydrator<Record<string, string>>("localization");

export function i(key: string): string {
	const map = locState.get();
	return map[key] || key;
}
