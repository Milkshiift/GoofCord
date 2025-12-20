import path from "node:path";
import ts from "typescript";

const SCHEMA_PATH = path.join(import.meta.dir, "..", "src", "settingsSchema.ts");
const LANG_PATH = path.join(import.meta.dir, "..", "assets", "lang", "en-US.json");

export async function genSettingsLangFile() {
	const fileContent = await Bun.file(SCHEMA_PATH).text();

	const sourceFile = ts.createSourceFile("settingsSchema.ts", fileContent, ts.ScriptTarget.Latest, true);

	const extractedKeys: Record<string, string> = {};
	let foundSchema = false;

	const visit = (node: ts.Node) => {
		if (foundSchema) return;

		// Look for 'export const settingsSchema = ...'
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "settingsSchema" && node.initializer) {
			const objectLiteral = unwrapExpression(node.initializer);

			if (objectLiteral && ts.isObjectLiteralExpression(objectLiteral)) {
				processSchemaObject(objectLiteral, extractedKeys);
				foundSchema = true;
			}
		} else {
			ts.forEachChild(node, visit);
		}
	};

	visit(sourceFile);

	if (Object.keys(extractedKeys).length === 0) {
		console.warn("⚠️  Warning: Found 0 keys. Check if 'settingsSchema' is defined correctly.");
	}

	const langFile = Bun.file(LANG_PATH);
	const langData = (await langFile.exists()) ? await langFile.json() : {};

	// Clean up old keys
	for (const key of Object.keys(langData)) {
		if ((key.startsWith("opt-") || key.startsWith("category-")) && !extractedKeys[key]) {
			delete langData[key];
		}
	}

	Object.assign(langData, extractedKeys);

	await Bun.write(LANG_PATH, JSON.stringify(langData, null, 2) + "\n");
	console.log(`🌐 Updated i18n file with ${Object.keys(extractedKeys).length} extracted keys.`);
}

function unwrapExpression(node: ts.Expression): ts.Expression {
	let current = node;
	while (ts.isSatisfiesExpression(current) || ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
		current = current.expression;
	}
	return current;
}

function getPropertyName(node: ts.PropertyName): string | null {
	if (ts.isIdentifier(node)) return node.text;
	if (ts.isStringLiteral(node)) return node.text;
	return null;
}

function getLiteralText(node: ts.Node): string | null {
	if (ts.isStringLiteral(node)) return node.text;
	if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
	return null;
}

function processSchemaObject(objLiteral: ts.ObjectLiteralExpression, results: Record<string, string>) {
	for (const prop of objLiteral.properties) {
		if (!ts.isPropertyAssignment(prop)) continue;

		const categoryName = getPropertyName(prop.name);
		if (!categoryName) continue;

		const catKey = `category-${categoryName.toLowerCase().split(" ")[0]}`;
		results[catKey] = categoryName;

		const innerObj = unwrapExpression(prop.initializer);
		if (ts.isObjectLiteralExpression(innerObj)) {
			processSettings(innerObj, categoryName, results);
		}
	}
}

function processSettings(objLiteral: ts.ObjectLiteralExpression, _parentCategory: string, results: Record<string, string>) {
	for (const prop of objLiteral.properties) {
		if (!ts.isPropertyAssignment(prop)) continue;

		const settingKey = getPropertyName(prop.name);
		if (!settingKey) continue;

		const settingEntry = unwrapExpression(prop.initializer);

		if (ts.isObjectLiteralExpression(settingEntry)) {
			extractSettingStrings(settingEntry, settingKey, results);
		}
	}
}

function extractSettingStrings(objLiteral: ts.ObjectLiteralExpression, settingKey: string, results: Record<string, string>) {
	for (const prop of objLiteral.properties) {
		if (!ts.isPropertyAssignment(prop)) continue;

		const propName = getPropertyName(prop.name);
		if (!propName) continue;

		if (propName === "name") {
			const text = getLiteralText(prop.initializer);
			if (text) results[`opt-${settingKey}`] = text;
		} else if (propName === "description") {
			const text = getLiteralText(prop.initializer);
			if (text) results[`opt-${settingKey}-desc`] = text;
		}
	}
}

if (import.meta.main) {
	await genSettingsLangFile();
}
