import { FunctionDeclaration, Project } from "ts-morph";
import path from "node:path";

export async function genIpcHandlers() {
	await Bun.write("./src/ipcGen.ts", "// This file is auto-generated by genIpcHandlers, any changes will be lost");

	const project = new Project();
	project.addSourceFilesAtPaths("./src/**/*");
	const sources = project.getSourceFiles();

	const ipcGenFile = project.getSourceFile("ipcGen.ts");
	if (!ipcGenFile) {
		console.error("Could not find ipcGen.ts");
		process.exit(1);
	}
	ipcGenFile.addImportDeclaration({ namedImports: ["ipcMain"], moduleSpecifier: "electron" });

	let handlers: string[] = [];

	// Iterate over all source files to find exported IPC handlers
	for (const source of sources) {
		const filename = path.basename(source.getFilePath(), ".ts");
		const functions = source.getFunctions();

		for (const func of functions) {
			const funcName = func.getName();
			const typeParameters = func.getTypeParameters();
			const typeParametersString = typeParameters.map(tp => tp.getText()).join(", ");

			if (funcName && typeParametersString.includes("IPC") && func.isExported()) {
				const parameters = func.getParameters().map(param => param.getName()).join(", ");
				const channelName = `${filename}:${funcName}`;
				const isAsync = isAsyncFunction(func);

				if (typeParametersString.includes("IPCHandle")) {
					handlers.push(generateHandleHandler(channelName, funcName, parameters, isAsync));
				} else if (typeParametersString.includes("IPCOn")) {
					handlers.push(generateOnHandler(channelName, funcName, parameters, isAsync));
				}

				const importPath = "./" + source.getFilePath().split("src/").pop()?.replace(/\\/g, "/");
				ipcGenFile.addImportDeclaration({ namedImports: [funcName], moduleSpecifier: importPath });
			}
		}
	}

	ipcGenFile.addStatements(handlers.join("\n"));
	await ipcGenFile.save();
}

function isAsyncFunction(func: FunctionDeclaration): boolean {
	return func.isAsync() || func.getReturnType().getText().includes("Promise");
}

function generateHandleHandler(channelName: string, funcName: string, parameters: string, isAsync: boolean): string {
	if (isAsync) {
		return `ipcMain.handle("${channelName}", async (event, ${parameters}) => { return await ${funcName}(${parameters}); });`;
	} else {
		return `ipcMain.handle("${channelName}", (event, ${parameters}) => { return ${funcName}(${parameters}); });`;
	}
}

function generateOnHandler(channelName: string, funcName: string, parameters: string, isAsync: boolean): string {
	if (isAsync) {
		return `ipcMain.on("${channelName}", async (event, ${parameters}) => { event.returnValue = await ${funcName}(${parameters}); });`;
	} else {
		return `ipcMain.on("${channelName}", (event, ${parameters}) => { event.returnValue = ${funcName}(${parameters}); });`;
	}
}