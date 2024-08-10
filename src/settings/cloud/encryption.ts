import util from "node:util";
import zlib from "node:zlib";
import crypto from "crypto";
import {showDialogAndLog} from "./cloud";

const brotliCompress = util.promisify(zlib.brotliCompress);
const brotliDecompress = util.promisify(zlib.brotliDecompress);

export async function encryptString(string: string, password: string) {
    try {
        // Derive a 32-byte key for AES-256
        const key = crypto.createHash('sha256').update(password).digest();
        const iv = crypto.randomBytes(16);

        const compressedSettings = await brotliCompress(Buffer.from(string, 'utf8'));

        const cipher = crypto.createCipheriv("aes-256-ctr", key, iv);
        let encrypted = cipher.update(compressedSettings);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        const resultBuffer = Buffer.concat([iv, encrypted]);
        return resultBuffer.toString('base64');
    } catch (e) {
        await showDialogAndLog("error", "Encryption error", `Failed to encrypt settings: ${e}`);
        return undefined;
    }
}

export async function decryptString(encryptedStr: string, password: string) {
    try {
        // Derive a 32-byte key for AES-256
        const key = crypto.createHash('sha256').update(password).digest();
        const encryptedBuffer = Buffer.from(encryptedStr, 'base64');
        const iv = encryptedBuffer.subarray(0, 16);
        const encryptedData = encryptedBuffer.subarray(16);

        const decipher = crypto.createDecipheriv("aes-256-ctr", key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const decompressedSettings = await brotliDecompress(decrypted);
        return decompressedSettings.toString('utf8');
    } catch (e) {
        await showDialogAndLog("error", "Decryption error", `Failed to decrypt settings. Is the password correct?\n\n${e}`);
        return undefined;
    }
}
