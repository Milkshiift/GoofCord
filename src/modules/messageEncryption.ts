import StegCloak from "stegcloak";
import {getConfig, getConfigSync} from "../utils";
import {safeStorage} from "electron";
import {mainWindow} from "../window";

const stegcloak = new StegCloak(true, false);

const encryptionPasswords: string[] = [];
let chosenPassword: string;

(async function loadPasswords() {
    const encryptedPasswords = await getConfig("encryptionPasswords");
    for (const password in encryptedPasswords) {
        encryptionPasswords.push(safeStorage.decryptString(Buffer.from(encryptedPasswords[password], "latin1")));
    }
    chosenPassword = encryptionPasswords[0];
})();

export function encryptMessage(message: string) {
    let cover = getConfigSync("encryptionCover");
    if (cover === "" || cover.split(" ").length < 2) {
        cover = "\u200c \u200c"; // Stegcloak requires a two-word cover, so we use two invisible characters for the cover
    }
    return stegcloak.hide(message + "\u200b", chosenPassword, cover);
}

export function decryptMessage(message: string) {
    // A quick way to check if the message was encrypted.
    // Character \u200c is present in every stegcloaked message
    if (!message.includes("\u200c")) return message;
    for (const password in encryptionPasswords) {
        // If the password is correct, return a decrypted message. Otherwise, try the next password.
        try {
            const decryptedMessage = stegcloak.reveal(message, encryptionPasswords[password]);
            if (decryptedMessage.endsWith("\u200b")) {
                return decryptedMessage;
            }
        }
        catch (e) {
            continue;
        }
    }
}

let currentIndex = 0;
export async function cycleThroughPasswords() {
    currentIndex = (currentIndex + 1) % encryptionPasswords.length;
    chosenPassword = encryptionPasswords[currentIndex];
    await mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("#f9c23c", "${"Chosen password: "+truncateString(chosenPassword)}")`);
}

// Show only N percent of the password for security
function truncateString(str: string) {
    // Calculate the length of the truncated string (30% of the input string length)
    const PERCENTAGE = 0.3;
    const truncatedLength = Math.ceil(str.length * PERCENTAGE);

    // Extract the first 30% of the string and append "..."
    return str.slice(0, truncatedLength) + "...";
}