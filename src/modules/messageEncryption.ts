import { dialog, ipcMain } from "electron";
import pc from "picocolors";
import StegCloak from "stegcloak";
import { getConfig } from "../config.ts";
import { decryptSafeStorage, getErrorMessage } from "../utils.ts";
import { mainWindow } from "../windows/main/main.ts";

let stegcloak: StegCloak;
export const encryptionPasswords: string[] = [];
let chosenPassword: string;
let encryptionMark: string;
let cover: string;

ipcMain.on("messageEncryption:getDecryptedPasswords", (event) => {
	event.returnValue = encryptionPasswords;
});

export function initEncryption() {
	try {
		void loadPasswords();
		void loadCover();
		stegcloak = new StegCloak(true, false);
		encryptionMark = getConfig("encryptionMark");
	} catch (error) {
		console.error("Encryption initialization error:", error);
	}
}

// This function loads encrypted encryption passwords from the configuration, decrypts them, and stores them in memory.
// Although storing passwords in memory is not secure due to potential memory inspection, it's considered acceptable
// since the application code (.asar) can be replaced by malicious actors, providing alternate and easier ways for password retrieval.
async function loadPasswords() {
	const encryptedPasswords = getConfig("encryptionPasswords");
	try {
		for (const password of encryptedPasswords) {
			if (!password) continue;
			encryptionPasswords.push(decryptSafeStorage(password));
		}
		chosenPassword = encryptionPasswords[0];
		console.log(pc.magenta("[Message Encryption]"), "Loaded encryption passwords");
	} catch (error) {
		console.error("Failed to load encryption passwords:", error);
	}
}

async function loadCover() {
	cover = getConfig("encryptionCover");
	// Stegcloak requires a two-word cover, so we add two invisible characters to the cover if the user wants to use an empty cover or one word cover
	if (cover === "" || cover.split(" ").length < 2) {
		cover = `${cover}\u200c \u200c`;
	}
}

export function encryptMessage<IPCOn>(message: string) {
	try {
		return stegcloak.hide(`${message}\u200b`, chosenPassword, cover);
	} catch (e: unknown) {
		console.error("Failed to encrypt message:", e);
		dialog.showErrorBox("GoofCord was unable to encrypt your message, did you setup message encryption?", getErrorMessage(e));
		return "";
	}
}

export function decryptMessage<IPCOn>(message: string) {
	// A quick way to check if the message was encrypted.
	// Character \u200c is present in every stegcloaked message
	try {
		if (!message.includes("\u200c") || !getConfig("messageEncryption")) return message;
	} catch (e) {
		return message;
	}

	for (const password in encryptionPasswords) {
		// If the password is correct, return a decrypted message. Otherwise, try the next password.
		try {
			const decryptedMessage = stegcloak.reveal(message, encryptionPasswords[password]);
			if (decryptedMessage.endsWith("\u200b")) {
				return encryptionMark + decryptedMessage;
			}
		} catch (e) {}
	}
	return message;
}

let currentIndex = 0;
export function cycleThroughPasswords<IPCHandle>() {
	currentIndex = (currentIndex + 1) % encryptionPasswords.length;
	chosenPassword = encryptionPasswords[currentIndex];
	void mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("#f9c23c", "Chosen password: ${chosenPassword.slice(0, 2)}...")`);
}
