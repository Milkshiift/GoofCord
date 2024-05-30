// @ts-ignore
import Server from "arrpc";
import {getConfig} from "../config";
import {mainWindow} from "../window";

export async function initArrpc() {
    if (!getConfig("arrpc")) return;

    try {
        const server = await new Server();
        server.on("activity", (data: any) => mainWindow.webContents.send("rpc", JSON.stringify(data)));
        server.on("invite", (code: string) => {
            console.log(code);
        });
    } catch (e) {
        console.error("Failed to start arRPC server", e);
    }
}
