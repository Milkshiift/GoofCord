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
            mainWindow.webContents.executeJavaScript(`
                // Doing findByProps every time is not very efficient but this is not going to get called frequently. So it's fine
                Vencord.Webpack.findByProps("acceptInviteAndTransitionToInviteChannel").acceptInviteAndTransitionToInviteChannel({inviteKey: "${code}"})
                goofcord.window.show();
            `);
        });
    } catch (e) {
        console.error("Failed to start arRPC server", e);
    }
}
