import StegCloak from "stegcloak";
import {getConfigSync} from "../utils";

const stegcloak = new StegCloak(true, false);

export function encryptMessage(message: string) {
    const password = "TEST";
    let cover = getConfigSync("encryptionCover");
    if (cover === "" || cover.split(" ").length < 2) {
        cover = "\u200c \u200c"; // Stegcloak requires a two-word cover, so we use two invisible characters for the cover
    }
    return stegcloak.hide(message, password, cover);
}

export function decryptMessage(message: string) {
    // A quick way to check if the message was encrypted.
    // Character \u200c is present in every stegcloaked message
    if (!message.includes("\u200c")) return message;
    const password = "TEST";
    return stegcloak.reveal(message, password)+" 🔒";
}