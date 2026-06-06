// ─────────────────────────────────────────────────────────────────────────────
// Windows WASAPI EXCLUDE-tree echo fix (the #46 fix) — renderer-side PCM feeder + swap seam.
//
// The main process (wasapiLoopback.ts) captures the EXCLUDE-tree PCM and forwards it over a
// MessagePort. This file is the renderer half: a MessagePort-fed MediaStreamTrackGenerator feeder
// that reconstructs a live audio track and swaps it into Discord's getDisplayMedia stream at the
// proven seam, so the viewer hears shared desktop audio but NOT the Discord call echoed back.
//
// CI-PACKAGING NOTE: this file lives in the main preload bundle (ts-out/**, which electron-builder
// packages). preload.mts injects installWasapiTransport into the Discord page MAIN WORLD via
// webFrame.executeJavaScript (serialized to a string via `.toString()`) ONLY when the wasapi gate is
// on — NOT placed in the runtime-downloaded postVencord.js. The injected function closes over the
// page's own globals (MediaStreamTrackGenerator, AudioData, window) which only exist in the main world.
//
// HOP-2 (preload isolated world → page main world): preload.mts receives the MessagePort (hop-1) and
// forwards it via window.postMessage(..., [port]) AFTER this main-world script posts
// "goofcord:wasapi-ready" (the load-bearing readiness handshake: a port forwarded before the listener
// exists silently loses the port + first chunks → viewer hears silence).
//
// PER-SHARE FEEDER (the #46 second-share regression fix): the swap seam, port listener, and handshake
// are installed ONCE per page, but the feeder itself (the MediaStreamTrackGenerator track, its writer,
// and the drain timer) is rebuilt FRESH for every screenshare. Those three primitives are one-shot:
// Discord ends the track when the share stops, an ended generator can't be revived, and teardown
// releases the writer + clears the timer. A page-lifetime singleton feeder therefore works for the
// first share and is permanently dead for every share after — so each forwarded port mints a new
// Session (see createSession below).
// ─────────────────────────────────────────────────────────────────────────────

// The entire main-world feeder. Authored as ONE function so it can be serialized with `.toString()`
// and executed in the page main world (where MediaStreamTrackGenerator, AudioData, and the
// getDisplayMedia stream live). It reaches the preload bridge via `window.goofcord`
// (stopWasapiLoopback, to tear the main-process capture down when the share ends).
export function installWasapiTransport(): void {
	interface TransportBridge {
		stopWasapiLoopback: () => unknown;
	}
	const bridge = (globalThis as { goofcord?: TransportBridge }).goofcord;

	// Idempotence guard on the page window — injection runs once per page. NOTE: only the swap seam,
	// the port listener, and the handshake are installed here; the per-share feeder is built in
	// createSession() on every forwarded port (see the header note on the second-share regression).
	const flag = "__goofcordWasapiTransportInstalled";
	if ((globalThis as Record<string, unknown>)[flag]) return;
	(globalThis as Record<string, unknown>)[flag] = true;
	if (!bridge) return; // no bridge ⇒ no teardown signal channel; bail (page stays byte-identical)

	const SAMPLE_RATE = 48000;
	const CHANNELS = 2;
	const FRAMES = 480; // 10ms @ 48k → ~100 chunks/sec
	// T4: bounded ring, latency-first. 4-chunk (~40ms) depth absorbs jitter between the main-
	// process post cadence and the MSTG writer.write() consumption without latency creep.
	const RING_DEPTH = 4;

	// ── Insertable Streams gate ──────────────────────────────────────────────────────────
	const MSTG = (globalThis as { MediaStreamTrackGenerator?: unknown }).MediaStreamTrackGenerator;
	const AD = (globalThis as { AudioData?: unknown }).AudioData;
	if (typeof MSTG === "undefined" || typeof AD === "undefined") {
		return; // Insertable Streams unavailable on this build — cannot feed; leave the page untouched.
	}
	const GenCtor = MSTG as new (init: { kind: string }) => MediaStreamTrack & { writable: WritableStream };
	const AudioDataCtor = AD as new (init: Record<string, unknown>) => unknown;

	const intervalMs = (FRAMES / SAMPLE_RATE) * 1000; // ≈10ms drain cadence

	// One screenshare's worth of feeder state. Rebuilt per share (see header note): the track, its
	// writer, and the drain timer are one-shot, so they cannot be reused across shares.
	interface Session {
		track: MediaStreamTrack;
		teardown: (signalMain: boolean) => void;
	}

	// The session for the in-flight share. Set when the main process forwards a PCM port (which it
	// does only when tryStartWasapiLoopback() succeeded) and cleared when that share ends. The swap
	// seam reads this to decide whether to swap: null ⇒ unsupported build / --no-wasapi / activation
	// returned false ⇒ leave the original Chromium "loopback" track in place (viewer still hears audio).
	let current: Session | undefined;

	function createSession(port: MessagePort): Session {
		const gen = new GenCtor({ kind: "audio" });
		const writer = gen.writable.getWriter() as WritableStreamDefaultWriter<unknown>;
		let tsUs = 0; // timestamp MUST be microseconds, monotonic (else frames silently garble)

		// Bounded ring of transferred ArrayBuffers (each = 480*2 interleaved f32 = 3840 bytes).
		const ring: ArrayBuffer[] = [];

		function writeAudioData(data: Float32Array): void {
			const ad = new AudioDataCtor({
				format: "f32",
				sampleRate: SAMPLE_RATE,
				numberOfFrames: FRAMES,
				numberOfChannels: CHANNELS,
				timestamp: tsUs,
				data,
			});
			tsUs += Math.round((FRAMES / SAMPLE_RATE) * 1e6); // advance ~10000us, monotonic
			void writer.write(ad);
		}

		// Drain loop: consume one chunk per ~10ms from the ring; on underrun write a zero-filled
		// AudioData of the same shape to keep the MSTG timeline monotonic.
		const drainTimer = setInterval(() => {
			const ab = ring.shift();
			if (ab) {
				writeAudioData(new Float32Array(ab));
			} else {
				writeAudioData(new Float32Array(CHANNELS * FRAMES)); // silence fill on underrun
			}
		}, intervalMs);

		// Chunks land here: the kept MessagePort delivers transferred ArrayBuffers (3840 bytes) from
		// the main-process capture. Drop-oldest on overflow (T4).
		port.onmessage = (msg: MessageEvent) => {
			if (!(msg.data instanceof ArrayBuffer)) return;
			if (ring.length >= RING_DEPTH) ring.shift();
			ring.push(msg.data);
		};
		port.start();

		// Exactly-once teardown: both the swapped track AND the video track register an `ended`
		// handler, and a superseding port can race a late `ended`, so guard against re-entry.
		let torn = false;
		function teardown(signalMain: boolean): void {
			if (torn) return;
			torn = true;
			clearInterval(drainTimer);
			ring.length = 0;
			try {
				port.close();
			} catch {
				// already closed
			}
			try {
				writer.releaseLock();
			} catch {
				// already released
			}
			// Tell the main process to stop its native capture ONLY when this share actually ended
			// (track/video `ended`). On supersede — a new port arrived for a NEW share — the main
			// process is already driving the replacement capture, so signaling stop here would kill it.
			if (signalMain) {
				try {
					void bridge?.stopWasapiLoopback();
				} catch {
					// best-effort
				}
			}
		}

		return { track: gen as MediaStreamTrack, teardown };
	}

	// ── HOP-2 receiver: a forwarded port = a new capture session ──────────────────────────
	// The preload forwards the MessagePort via window.postMessage(..., [port]) AFTER it sees our
	// "goofcord:wasapi-ready" handshake below. A new port means the main process started a fresh
	// capture, so supersede any still-live session — tear it down LOCALLY (signalMain=false; the
	// main process is already driving the replacement) and mint a fresh feeder for this share.
	window.addEventListener("message", (e: MessageEvent) => {
		if (e.data !== "goofcord:wasapi-pcm-port") return;
		const port = e.ports[0];
		if (!port) return;
		current?.teardown(false);
		current = createSession(port);
	});

	// ── SWAP SEAM: wrap getDisplayMedia HERE, in this preload-injected main-world script —
	// NOT in screensharePatch.ts. postVencord.js is fetched at runtime from upstream `main`
	// (settingsSchema PostVencord URL), so fork edits to screensharePatch.ts would silently not
	// ship; only this ts-out-packaged preload reliably reaches the artifact. Injection only happens
	// when the wasapi gate is on, so with the gate OFF this script is never injected ⇒ the page is
	// byte-identical to upstream.
	const md = navigator.mediaDevices;
	const originalGDM = md.getDisplayMedia.bind(md);
	md.getDisplayMedia = async function (this: MediaDevices, opts?: DisplayMediaStreamOptions): Promise<MediaStream> {
		const stream = await originalGDM(opts);

		// ECHO-03 (D-11): only swap when capture is actually active. `current` is set only after
		// tryStartWasapiLoopback() succeeded and the main process forwarded the port. If it's unset
		// (unsupported build / --no-wasapi / activation returned false), leave the original Chromium
		// "loopback" track in place so the viewer hears audio instead of a silence-filled gen track.
		const session = current;
		if (!session) return stream;

		try {
			// On Windows the upstream path leaves the captured "loopback" audio track in the stream
			// (no virtmic), which is what echoes the call back to viewers. Swap it for the
			// reconstructed transport track (fed from the main-process MessagePort).
			for (const t of stream.getAudioTracks()) {
				t.stop();
				stream.removeTrack(t);
			}
			stream.addTrack(session.track);

			// Teardown trigger: FluxDispatcher STREAM_CLOSE is unavailable in preload-injected
			// main-world code, so the swapped track or the video track ending tears the feeder + the
			// main-process native capture down (signalMain=true), and clears `current` so the next
			// share mints a fresh feeder.
			const videoTrack = stream.getVideoTracks()[0];
			const onEnd = () => {
				session.teardown(true);
				if (current === session) current = undefined;
			};
			session.track.addEventListener("ended", onEnd);
			if (videoTrack) videoTrack.addEventListener("ended", onEnd);
		} catch {
			// Swap failed; leave the original stream as captured (never break the share).
		}
		return stream;
	};

	// READINESS HANDSHAKE (load-bearing): now that the message listener, the per-share feeder
	// factory, AND the getDisplayMedia swap seam are registered, signal the preload that the main
	// world is ready to receive the port. The preload buffers the port until it sees this.
	window.postMessage("goofcord:wasapi-ready", "*");
}

// Self-contained main-world script string: serialize the feeder and self-invoke it. preload.mts
// passes this to webFrame.executeJavaScript ONLY when the wasapi gate is on, so it ships from
// ts-out/** (packaged) yet runs in the page main world.
export const wasapiTransportMainWorldSource = `(${installWasapiTransport.toString()})();`;
