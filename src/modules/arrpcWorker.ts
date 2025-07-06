import { parentPort, workerData } from "node:worker_threads";
import Server from "arrpc";

const server = await new Server(workerData.detectablePath);
const Bridge = await import("arrpc/src/bridge.js");

server.on("activity", (data: object) => Bridge.send(data));
server.on("invite", (code: string) => {
    parentPort?.postMessage({
        eventType: "showMainWindow",
    })
    Bridge.send({
        cmd: "INVITE_BROWSER",
        args: {
            "code": code
        }
    })
});