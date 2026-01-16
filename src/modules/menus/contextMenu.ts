import { app, BrowserWindow, clipboard, type ContextMenuParams, Menu, type MenuItemConstructorOptions, shell, type WebContents } from "electron";

const attachedWebContents = new WeakSet<WebContents>();

function buildMenu(wc: WebContents, params: ContextMenuParams): MenuItemConstructorOptions[] {
	const hasText = params.selectionText.trim().length > 0;
	const isLink = params.linkURL.length > 0 && params.mediaType === "none";
	const isImage = params.mediaType === "image";

	const spellCheckGroup: MenuItemConstructorOptions[] = [];
	if (params.misspelledWord && params.dictionarySuggestions.length > 0) {
		for (const suggestion of params.dictionarySuggestions) {
			spellCheckGroup.push({
				label: suggestion,
				click: () => wc.replaceMisspelling(suggestion),
			});
		}
	}
	if (params.misspelledWord) {
		spellCheckGroup.push({
			label: "Add to Dictionary",
			click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord),
		});
	}

	const searchGroup: MenuItemConstructorOptions[] = [];
	if (hasText) {
		searchGroup.push({
			label: `Search Google for "${params.selectionText.length > 15 ? params.selectionText.slice(0, 15) + "..." : params.selectionText}"`,
			click: () => {
				const url = new URL("https://www.google.com/search");
				url.searchParams.set("q", params.selectionText);
				void shell.openExternal(url.toString());
			},
		});
	}

	const editGroup: MenuItemConstructorOptions[] = [];
	if (params.editFlags.canCut) editGroup.push({ role: "cut" });
	if (params.editFlags.canCopy || hasText) editGroup.push({ role: "copy" });
	if (params.editFlags.canPaste) editGroup.push({ role: "paste" });
	if (params.editFlags.canSelectAll) editGroup.push({ role: "selectAll" });

	const resourceGroup: MenuItemConstructorOptions[] = [];
	if (isLink) {
		resourceGroup.push(
			{
				label: "Open Link in Browser",
				click: () => shell.openExternal(params.linkURL),
			},
			{
				label: "Copy Link Address",
				click: () => clipboard.writeText(params.linkURL),
			},
			{
				label: "Save Link As...",
				click: () => wc.downloadURL(params.linkURL),
			},
		);
	}

	if (isImage) {
		resourceGroup.push(
			{
				label: "Save Image As...",
				click: () => wc.downloadURL(params.srcURL),
			},
			{
				label: "Copy Image",
				click: () => wc.copyImageAt(params.x, params.y),
			},
			{
				label: "Copy Image Address",
				click: () => clipboard.writeText(params.srcURL),
			},
		);
	}

	const devGroup: MenuItemConstructorOptions[] = [];
	devGroup.push({
		label: "Inspect Element",
		click: () => {
			wc.inspectElement(params.x, params.y);
			if (wc.isDevToolsOpened()) {
				wc.devToolsWebContents?.focus();
			}
		},
	});

	const groups = [spellCheckGroup, searchGroup, editGroup, resourceGroup, devGroup];

	return groups
		.filter((group) => group.length > 0)
		.flatMap((group, index, array) => {
			return index < array.length - 1 ? [...group, { type: "separator" }] : group;
		}) as MenuItemConstructorOptions[];
}

function attach(wc: WebContents) {
	if (attachedWebContents.has(wc)) return;
	attachedWebContents.add(wc);

	wc.on("context-menu", (_event, params) => {
		const template = buildMenu(wc, params);
		if (template.length > 0) {
			Menu.buildFromTemplate(template).popup({
				window: BrowserWindow.fromWebContents(wc) || undefined,
			});
		}
	});
}

export function setContextMenu() {
	for (const win of BrowserWindow.getAllWindows()) {
		attach(win.webContents);
	}

	app.on("web-contents-created", (_, wc) => attach(wc));
}
