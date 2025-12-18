import { parentPort, workerData } from "node:worker_threads";
import Server from "arrpc";
import * as Bridge from "arrpc/src/bridge.ts";
import type { BridgeMessage } from "arrpc/src/types";

Bridge.init();

const server = new Server(workerData.detectablePath);

server.on("activity", (data: BridgeMessage) => Bridge.send(data));
server.on("invite", (code: string) => {
	parentPort?.postMessage({
		eventType: "showMainWindow",
	});
	// @ts-expect-error
	Bridge.send({
		cmd: "INVITE_BROWSER",
		args: {
			code: code,
		}
	});
});

await server.start();