import { dialog } from "electron";
import pc from "picocolors";
import StegCloak from "stegcloak";
import { getConfig } from "../stores/config/config.main.ts";
import { getErrorMessage } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let stegcloak: StegCloak | null = null;
let isInitialized = false;
let chosenPassword: string = "";
let encryptionMark: string = "";
let cover: string = "";
let currentIndex = 0;

function ensureInitialized() {
	if (isInitialized) return;

	try {
		const encryptionPasswords = getConfig("encryptionPasswords");
		if (encryptionPasswords.length > 0) {
			chosenPassword = encryptionPasswords[0];
			console.log(pc.magenta("[Message Encryption]"), "Loaded encryption passwords");
		} else {
			console.warn(pc.yellow("[Message Encryption]"), "No encryption passwords found in config.");
		}

		let rawCover = getConfig("encryptionCover") ?? "";
		// Stegcloak requires a two-word cover. Add invisible chars if cover is too short.
		if (rawCover === "" || rawCover.split(" ").length < 2) {
			rawCover = `${rawCover}\u200c \u200c`;
		}
		cover = rawCover;

		encryptionMark = getConfig("encryptionMark") ?? "";
		stegcloak = new StegCloak();

		isInitialized = true;
	} catch (error) {
		console.error("Encryption initialization error:", error);
	}
}

export function encryptMessage<IPCOn>(message: string) {
	ensureInitialized();

	if (!stegcloak || !chosenPassword) {
		const err = "Encryption not configured correctly (missing password or lib init).";
		console.error(err);
		dialog.showErrorBox("Encryption Error", "GoofCord was unable to encrypt your message. Did you setup message encryption?");
		return "";
	}

	try {
		return stegcloak.hide(`${message}\u200b`, chosenPassword, cover);
	} catch (e: unknown) {
		console.error("Failed to encrypt message:", e);
		dialog.showErrorBox("Encryption Failed", getErrorMessage(e));
		return "";
	}
}

export function decryptMessage<IPCOn>(message: string) {
	// Fast fail before initializing if message is not encrypted
	// Character \u200c is present in every stegcloaked message
	if (!message || !message.includes("\u200c")) return message;

	ensureInitialized();

	try {
		if (!stegcloak || !getConfig("messageEncryption")) return message;
	} catch (e) {
		return message;
	}

	for (const password of getConfig("encryptionPasswords")) {
		try {
			const decryptedMessage = stegcloak.reveal(message, password);
			if (decryptedMessage.endsWith("\u200b")) {
				return encryptionMark + decryptedMessage;
			}
		} catch (e) {
			// Continue to next password if revelation fails
		}
	}

	return message;
}

export function cycleThroughPasswords<IPCHandle>() {
	ensureInitialized();

	const encryptionPasswords = getConfig("encryptionPasswords");

	if (encryptionPasswords.length === 0) return;

	currentIndex = (currentIndex + 1) % encryptionPasswords.length;
	chosenPassword = encryptionPasswords[currentIndex];

	const displayPass = chosenPassword.slice(0, 2);

	if (mainWindow && !mainWindow.isDestroyed()) {
		void mainWindow.webContents.executeJavaScript(
			`goofcord.titlebar.flashTitlebarWithText("#f9c23c", "Chosen password: ${displayPass}...")`
		);
	}
}