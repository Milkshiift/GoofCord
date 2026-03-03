import { dialog } from "electron";
import pc from "picocolors";
import { StegCloak } from "stegcloak";

import { getConfig } from "../stores/config/config.main.ts";
import { getErrorMessage } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let stegcloak: StegCloak | null = null;
let isInitialized = false;
let chosenPassword: string = "";
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

		stegcloak = new StegCloak();

		isInitialized = true;
	} catch (error) {
		console.error("Encryption initialization error:", error);
	}
}

export function encryptMessage<IPCOn>(message: string, salt: string) {
	ensureInitialized();

	if (!stegcloak || !chosenPassword) {
		const err = "Encryption not configured correctly (missing password or lib init).";
		console.error(err);
		dialog.showErrorBox("Encryption Error", "GoofCord was unable to encrypt your message. Did you setup message encryption?");
		return "";
	}

	try {
		return stegcloak.hide(`${message}`, chosenPassword, salt, getConfig("encryptionCover"));
	} catch (e: unknown) {
		console.error("Failed to encrypt message:", e);
		dialog.showErrorBox("Encryption Failed", getErrorMessage(e));
		return "";
	}
}

export function decryptMessage<IPCOn>(message: string, salt: string) {
	if (!message || !StegCloak.isCloaked(message) || !getConfig("messageEncryption")) return message;

	ensureInitialized();
	if (!stegcloak) return message;

	for (const password of getConfig("encryptionPasswords")) {
		try {
			const decryptedMessage = stegcloak.reveal(message, password, salt);
			return getConfig("encryptionMark") + decryptedMessage;
		} catch (err: unknown) {
			if (err instanceof Error) {
				if (err.name === "PayloadNotFoundError") {
					// The message doesn't contain hidden data
					break;
				} else if (err.name === "DecryptionError") {
					// Wrong password.
					continue;
				} else if (err.name === "IntegrityError") {
					// Password was right, but data is corrupted
					console.warn("Decryption successful, but data is corrupted:", err.message);
					break;
				} else {
					console.error("StegCloak fatal error:", err.message);
					return "Decryption failed: " + err.message;
				}
			}
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
		void mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("#f9c23c", "Chosen password: ${displayPass}...")`);
	}
}
