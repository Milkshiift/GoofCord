import Server from "arrpc";
import * as Bridge from 'arrpc/src/bridge.js';
import {getConfig} from "../config";

export async function initArrpc() {
    if (!getConfig("arrpc")) return;
    try {
        const server = await new Server();
        server.on("activity", (data: any) => Bridge.send(data));
    } catch (e) {
        console.error("Failed to start arRPC server", e);
    }
}
