import StegCloak from "stegcloak";
import {dialog, ipcMain, safeStorage} from "electron";
import {mainWindow} from "../window";
import {getConfig} from "../config";

let stegcloak: StegCloak;
export const encryptionPasswords: string[] = [];
let chosenPassword: string;
let encryptionMark: string;
let cover: string;

ipcMain.on("messageEncryption:getDecryptedPasswords", async (_event) => {
    _event.returnValue = encryptionPasswords;
});

export async function initEncryption() {
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
            encryptionPasswords.push(await decryptString(password));
        }
    } catch (error) {
        console.error("Failed to load encryption passwords:", error);
    }
    chosenPassword = encryptionPasswords[0];
    console.log("Loaded encryption passwords");
}

async function decryptString(encryptedString: string): Promise<string> {
    return safeStorage.decryptString(Buffer.from(encryptedString, "base64"));
}

async function loadCover() {
    cover = getConfig("encryptionCover");
    // Stegcloak requires a two-word cover, so we add two invisible characters to the cover if the user wants to use an empty cover or one word cover
    if (cover === "" || cover.split(" ").length < 2) {
        cover = cover + "\u200c \u200c";
    }
}

export function encryptMessage(message: string) {
    try {
        return stegcloak.hide(message + "\u200b", chosenPassword, cover);
    } catch (e: any) {
        console.error(e);
        dialog.showErrorBox(
            "GoofCord was unable to encrypt your message",
            e.toString()
        );
        return "";
    }
}

export function decryptMessage(message: string) {
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
                return encryptionMark+decryptedMessage;
            }
        } catch (e) {
            continue;
        }
    }
    return message;
}

let currentIndex = 0;
export function cycleThroughPasswords() {
    currentIndex = (currentIndex + 1) % encryptionPasswords.length;
    chosenPassword = encryptionPasswords[currentIndex];
    void mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("#f9c23c", "${"Chosen password: "+chosenPassword.slice(0, 2)+"..."}")`);
}
