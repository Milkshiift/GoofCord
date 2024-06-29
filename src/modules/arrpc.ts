import {getConfig} from "../config";
import * as Bridge from "arrpc/src/bridge.js";

export async function initArrpc() {
    if (!getConfig("arrpc")) return;
    try {
        const { default: Server } = await import("arrpc");
        const server = await new Server();
        server.on("activity", (data: any) => Bridge.send(data));
    } catch (e) {
        console.error("Failed to start arRPC server", e);
    }
}
