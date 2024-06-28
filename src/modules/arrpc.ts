import {getConfig} from "../config";

export async function initArrpc() {
    if (!getConfig("arrpc")) return;
    try {
        const { default: Server } = await import("arrpc");
        const Bridge = await import('arrpc/src/bridge.js');
        const server = await new Server();
        server.on("activity", (data: any) => Bridge.send(data));
    } catch (e) {
        console.error("Failed to start arRPC server", e);
    }
}
