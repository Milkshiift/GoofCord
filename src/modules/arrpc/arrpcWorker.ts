import { parentPort, workerData } from "node:worker_threads";
import Server from "@root/node_modules/arrpc/src/server.ts";
import type { BridgeMessage } from "arrpc/src/types";

const server = new Server(workerData.detectablePath);

server.on("activity", (data: BridgeMessage) =>
	parentPort?.postMessage({
		eventType: "activity",
		data: JSON.stringify(data),
	}),
);
server.on("invite", (code: string) =>
	parentPort?.postMessage({
		eventType: "invite",
		data: code,
	}),
);

await server.start();
