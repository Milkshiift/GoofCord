import crypto from "node:crypto";
import util from "node:util";
import zlib from "node:zlib";

const brotliCompress = util.promisify(zlib.brotliCompress);
const brotliDecompress = util.promisify(zlib.brotliDecompress);
const scrypt = util.promisify(crypto.scrypt);

const SALT_LENGTH = 32;
const IV_LENGTH = 12; // 96 bits as per NIST recommendations (SP 800-38D): https://csrc.nist.gov/pubs/sp/800/38/d/final
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// As per OWASP recommendations: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
// N=2^15 (32 MiB), r=8 (1024 bytes), p=3
const SCRYPT_COST = 32768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 3;
const SCRYPT_MAX_MEM = 128 * SCRYPT_COST * SCRYPT_BLOCK_SIZE * 2;

export async function encryptString(text: string, password: string): Promise<string | undefined> {
	try {
		const compressed = await brotliCompress(Buffer.from(text, "utf8"));

		// Passwordless is allowed because sensitive information is removed beforehand (see cloud.ts saveCloud())
		if (!password) {
			return compressed.toString("base64");
		}

		const salt = crypto.randomBytes(SALT_LENGTH);
		// @ts-expect-error
		const key = (await scrypt(password, salt, KEY_LENGTH, {
			N: SCRYPT_COST,
			r: SCRYPT_BLOCK_SIZE,
			p: SCRYPT_PARALLELIZATION,
			maxmem: SCRYPT_MAX_MEM,
		})) as Buffer;

		const iv = crypto.randomBytes(IV_LENGTH);
		const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

		const encrypted = Buffer.concat([
			cipher.update(compressed),
			cipher.final()
		]);

		const authTag = cipher.getAuthTag();

		const combined = Buffer.concat([salt, iv, authTag, encrypted]);
		return combined.toString("base64");
	} catch (error) {
		console.error("[Cloud] Encryption failed:", error);
		return undefined;
	}
}

export async function decryptString(encryptedText: string, password: string): Promise<object | undefined> {
	try {
		const buffer = Buffer.from(encryptedText, "base64");

		if (!password) {
			const decompressed = await brotliDecompress(buffer);
			return JSON.parse(decompressed.toString("utf8"));
		}

		const salt = buffer.subarray(0, SALT_LENGTH);
		const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
		const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
		const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

		// @ts-expect-error
		const key = (await scrypt(password, salt, KEY_LENGTH, {
			N: SCRYPT_COST,
			r: SCRYPT_BLOCK_SIZE,
			p: SCRYPT_PARALLELIZATION,
			maxmem: SCRYPT_MAX_MEM,
		})) as Buffer;

		const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
		decipher.setAuthTag(authTag);

		const decrypted = Buffer.concat([
			decipher.update(encrypted),
			decipher.final()
		]);

		const decompressed = await brotliDecompress(decrypted);
		return JSON.parse(decompressed.toString("utf8"));
	} catch (error) {
		console.error("[Cloud] Decryption failed:", error);
		return undefined;
	}
}