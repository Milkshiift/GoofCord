// @ts-nocheck Bun won't install the wasapi-loopback addon on macOS/linux, so typescript can't compile with checks (mirror venbind.ts:1)

// ─────────────────────────────────────────────────────────────────────────────
// Windows WASAPI EXCLUDE-tree echo fix (the #46 fix) — main-process capture wrapper.
//
// The clean-room addon (native/wasapi-loopback) captures the full endpoint mix EXCEPT
// GoofCord's own process tree (the Audio Service child is covered via EXCLUDE_TARGET_PROCESS_TREE),
// so the viewer hears shared desktop audio but NOT the Discord call echoed back. The captured PCM
// is forwarded over the canonical Electron MessageChannelMain transport (MessageChannelMain →
// webContents.postMessage → preload-injected MSTG feeder → viewer).
//
// Load model: the addon ships at ts-out/native/wasapi-loopback-<plat>-<arch>.node (placed there by
// build.ts via a HOST-AGNOSTIC fs copy — NOT Bun's `native-module:` file-loader, which silently
// fails to emit the .node when the BUILD HOST is Windows). createRequire + a --no-wasapi guard load
// it; the addon's `start(excludeRootPid, onChunk)` returns false (never throws) when the API is
// unavailable on this build → we fall through to Electron "loopback" (ECHO-03).
//
// On non-win32 / --no-wasapi / addon-not-loaded, tryStartWasapiLoopback returns false
// immediately so the normal "loopback" path stays byte-identical to upstream.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { app, MessageChannelMain, type MessagePortMain } from "electron";
import pc from "picocolors";

import { mainWindow } from "../../windows/main/main.ts";

const require = createRequire(import.meta.url);

const LOG_PREFIX = pc.cyan("[Screenshare]");

// The addon's contract (see native/wasapi-loopback/src/lib.rs):
//   start(excludeRootPid: number, onChunk: (err, chunk) => void): boolean  // false = unsupported, never throws
//   stop(): void                                                           // idempotent, bounded join
interface WasapiAddon {
	// onChunk is a napi CalleeHandled ThreadsafeFunction → JS is invoked as (err, chunk):
	// the error slot is the FIRST arg (null on Ok), the audio Buffer is the SECOND.
	start(excludeRootPid: number, onChunk: (err: unknown, chunk: Buffer) => void): boolean;
	stop(): void;
}

// ── Addon load (mirror obtainVenbind: load-once flag + --no-wasapi guard + null-on-failure) ──
let addon: WasapiAddon | undefined;
let addonLoadAttempted = false;

// The addon is loaded from ts-out/native/ (placed there by build.ts's host-agnostic copy) via a
// runtime path anchored at the app root: app.getAppPath() is the project root in dev and the
// app.asar path when packaged (Electron's require() redirects the unpacked .node automatically).
// Computing the path here — instead of relying on Bun's `native-module:` file-loader — is what makes
// a Windows BUILD HOST work; the prior file-loader import emitted ZERO .node on windows-latest.
const wasapiPath = path.join(app.getAppPath(), "ts-out", "native", `wasapi-loopback-${process.platform}-${process.arch}.node`);
const wasapiPathExists = existsSync(wasapiPath);

function obtainWasapiLoopback(): WasapiAddon | undefined {
	if (addon !== undefined || addonLoadAttempted || process.argv.includes("--no-wasapi") || !wasapiPathExists) return addon;
	addonLoadAttempted = true;
	try {
		addon = require(wasapiPath) as WasapiAddon;
		if (!addon || typeof addon.start !== "function" || typeof addon.stop !== "function") {
			throw new Error("wasapi-loopback addon missing start/stop exports");
		}
		console.log(pc.green("[WASAPI]"), "Loaded wasapi-loopback addon");
	} catch (e: unknown) {
		addon = undefined;
		console.error("Failed to import wasapi-loopback", e);
	}
	return addon;
}

// Whether preload.mts should inject the MSTG feeder + getDisplayMedia swap seam into the Discord
// page main world. The feeder must be present whenever the addon can run (win32, not --no-wasapi)
// so the addon's chunks have somewhere to land; otherwise capture silently falls through to the
// echoing "loopback" path. Read from main via sendSync (the sandboxed preload has no process.argv /
// authoritative platform). Off-Windows or --no-wasapi ⇒ false ⇒ no injection ⇒ byte-identical to upstream.
export function shouldInjectWasapiTransport<IPCOn>() {
	return process.platform === "win32" && !process.argv.includes("--no-wasapi");
}

// ── State (nulled by stopWasapiLoopback; safe to call stop twice) ────────────────────────
let port1: MessagePortMain | undefined;

// The addon's onChunk delivers a napi Buffer (480-frame / stereo / f32 = 3840 bytes); forward its
// bytes down the kept MessagePort. COPY into a fresh ArrayBuffer (the Buffer may share/reuse V8
// backing memory) so the structured clone over the port is stable.
function toArrayBuffer(chunk: Buffer): ArrayBuffer {
	const out = new ArrayBuffer(chunk.byteLength);
	new Uint8Array(out).set(chunk);
	return out;
}

/**
 * Start the REAL WASAPI EXCLUDE-tree capture behind the proven MessageChannelMain transport.
 *
 * Returns false (never throws) on: non-win32, --no-wasapi, addon-not-loaded, addon activation
 * unsupported on this build, or any exception → the caller falls through to Electron "loopback"
 * (ECHO-03). On success, the addon's ThreadsafeFunction pushes 480-frame/3840-byte f32 buffers
 * which we forward down `port1` to the renderer feeder.
 */
export async function tryStartWasapiLoopback(): Promise<boolean> {
	if (process.platform !== "win32" || process.argv.includes("--no-wasapi")) return false;

	const wasapi = obtainWasapiLoopback();
	if (!wasapi) return false;

	try {
		// PID discipline (ECHO-02): the EXCLUDE-tree root is the Electron main PID. The addon excludes
		// the whole tree rooted there via EXCLUDE_TARGET_PROCESS_TREE (covering the Audio Service utility
		// child) so GoofCord's own call playback never re-enters the captured mix.
		const rootPid = process.pid;

		// Make start idempotent across re-clicks: tear down any prior session/port first.
		await stopWasapiLoopback();

		// Hop-1: create the channel, keep port1, transfer port2 to the renderer's preload
		// (isolated world). MessageChannelMain is the canonical Electron zero-copy audio path —
		// NEVER per-frame ipcRenderer.send of raw PCM (locked anti-pattern T2).
		const channel = new MessageChannelMain();
		port1 = channel.port1;
		mainWindow.webContents.postMessage("wasapi:pcm-port", null, [channel.port2]);
		port1.start();

		// Start the REAL addon. start() returns the activation verdict synchronously on the JS side
		// (false on non-S_OK / missing entrypoint — never throws). The ThreadsafeFunction onChunk runs
		// per ~10ms with a 3840-byte f32 Buffer, delivered CalleeHandled as (err, chunk): the chunk is
		// the SECOND arg (the first is the error slot, null on Ok). Guard on err/chunk so a stray error
		// frame can't crash the callback.
		const ok = await wasapi.start(rootPid, (err: unknown, chunk: Buffer) => {
			const port = port1;
			if (!port || err || !chunk) return;
			try {
				// Electron's MAIN-process MessagePortMain.postMessage transfer list accepts ONLY
				// MessagePortMain instances — NOT ArrayBuffers (unlike the renderer/DOM MessagePort).
				// Send the buffer as the MESSAGE (structured-cloned, ~384 KB/s — negligible).
				port.postMessage(toArrayBuffer(chunk));
			} catch {
				// A throw inside the threadsafe callback would be an uncaught main-process exception.
				// Never let the capture crash the app (ECHO-03 discipline): stop cleanly.
				void stopWasapiLoopback();
			}
		});

		if (!ok) {
			// Activation != S_OK (API unavailable on this build): close the port and fall through
			// to "loopback" — no crash (ECHO-03). The addon already cleaned up its own thread.
			await stopWasapiLoopback();
			return false;
		}

		console.log(LOG_PREFIX, "WASAPI EXCLUDE-tree capture streaming over MessageChannelMain");
		return true;
	} catch {
		await stopWasapiLoopback();
		return false; // → "loopback" fallback, never crash (ECHO-03)
	}
}

/**
 * Idempotent teardown: stop the native capture, close the kept port, null state.
 * Safe to call twice (mirrors stopPatchcord; composes with the single-owner finishRequest).
 */
export async function stopWasapiLoopback<IPCHandle>() {
	// Stop the native capture FIRST so no more chunks arrive after we drop the port. The addon's
	// stop() is idempotent with a bounded internal join; obtain (cached) without re-loading.
	const wasapi = addon;
	if (wasapi) {
		try {
			wasapi.stop();
		} catch {
			// best-effort; stop() is idempotent and a throw here is non-fatal
		}
	}

	const port = port1;
	port1 = undefined;
	if (port) {
		try {
			port.close();
		} catch {
			// already closed
		}
		console.log(LOG_PREFIX, "WASAPI EXCLUDE-tree capture stopped");
	}
}

// A hung native stop must not wedge quit (mirror patchcord.ts:168-184 Promise.race([dispose, timeout])).
app.on("before-quit", (event) => {
	if (!port1 && !addon) return;

	event.preventDefault();
	Promise.race([stopWasapiLoopback(), new Promise((resolve) => setTimeout(resolve, 1500))])
		.catch((err) => console.error(LOG_PREFIX, "WASAPI stop failed:", err))
		.finally(() => app.quit());
});
