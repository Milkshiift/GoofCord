import StegCloak from "stegcloak";
import {dialog, safeStorage} from "electron";
import {mainWindow} from "../window";
import {getConfig} from "../config/config";

const stegcloak = new StegCloak(true, false);
const encryptionPasswords: string[] = [];
let chosenPassword: string;

const encryptionMark = getConfig("encryptionMark");

async function loadPasswords() {
    const encryptedPasswords = getConfig("encryptionPasswords");
    for (const password in encryptedPasswords) {
        encryptionPasswords.push(safeStorage.decryptString(Buffer.from(encryptedPasswords[password], "base64")));
    }
    chosenPassword = encryptionPasswords[0];
}
loadPasswords();

export function encryptMessage(message: string) {
    try {
        let cover = getConfig("encryptionCover");
        if (cover === "" || cover.split(" ").length < 2) {
            cover = "\u200c \u200c"; // Stegcloak requires a two-word cover, so we use two invisible characters for the cover
        }
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
        if (!message.includes("\u200c")) return message;
        for (const password in encryptionPasswords) {
            // If the password is correct, return a decrypted message. Otherwise, try the next password.
            try {
                const decryptedMessage = stegcloak.reveal(message, encryptionPasswords[password]);
                if (decryptedMessage.endsWith("\u200b")) {
                    return encryptionMark+decryptedMessage;
                }
            }
            catch (e) {
                continue;
            }
        }
        return message;
    }   catch (e) {
        return message;
    }
}

let currentIndex = 0;
export function cycleThroughPasswords() {
    currentIndex = (currentIndex + 1) % encryptionPasswords.length;
    chosenPassword = encryptionPasswords[currentIndex];
    mainWindow.webContents.executeJavaScript(`goofcord.titlebar.flashTitlebarWithText("#f9c23c", "${"Chosen password: "+truncateString(chosenPassword)}")`);
}

// Show only N percent of the password for security
function truncateString(str: string) {
    // Calculate the length of the truncated string (30% of the input string length)
    const PERCENTAGE = 0.3;
    const truncatedLength = Math.ceil(str.length * PERCENTAGE);

    // Extract the first 30% of the string and append "..."
    return str.slice(0, truncatedLength) + "...";
}