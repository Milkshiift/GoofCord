import crypto from "node:crypto";
import util from "node:util";
import zlib from "node:zlib";

const brotliCompress = util.promisify(zlib.brotliCompress);
const brotliDecompress = util.promisify(zlib.brotliDecompress);

const SALT_LENGTH = 32;
const IV_LENGTH = 12; // 96 bits as per NIST recommendations (SP 800-38D): https://csrc.nist.gov/pubs/sp/800/38/d/final
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// As per OWASP recommendations: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
const ARGON2_ALGORITHM = "argon2id";
const ARGON2_PASSES = 2;
const ARGON2_PARALLELISM = 1;
const ARGON2_MEMORY_COST = 19 * 1024; // 19 MiB in KiB (19 * 1024)

export async function encryptString(text: string, password: string): Promise<string | undefined> {
	try {
		const compressed = await brotliCompress(Buffer.from(text, "utf8"));

		// Passwordless is allowed because sensitive information is removed beforehand (see cloud.ts saveCloud())
		if (!password) {
			return compressed.toString("base64");
		}

		const salt = crypto.randomBytes(SALT_LENGTH);
		const key = crypto.argon2Sync(ARGON2_ALGORITHM, {
			message: Buffer.from(password),
			nonce: salt,
			parallelism: ARGON2_PARALLELISM,
			tagLength: KEY_LENGTH,
			memory: ARGON2_MEMORY_COST,
			passes: ARGON2_PASSES,
		});

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

		const key = crypto.argon2Sync(ARGON2_ALGORITHM, {
			message: Buffer.from(password),
			nonce: salt,
			parallelism: ARGON2_PARALLELISM,
			tagLength: KEY_LENGTH,
			memory: ARGON2_MEMORY_COST,
			passes: ARGON2_PASSES,
		});

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