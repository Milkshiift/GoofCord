import path from "path";
import { getGoofCordFolderPath, tryWithFix } from "../../utils";
import fs from "fs/promises";
import chalk from "chalk";
import { shell } from "electron";
import { createServer } from "http";
import { getConfig } from "../../config";

const cloudConfigPath = path.join(getGoofCordFolderPath(), "cloud.json");

let cachedToken: string;
export async function getCloudToken(): Promise<string> {
    if (cachedToken || serverListening) return cachedToken;

    // tryWithFix is always a bit ugly, but it provides a standardized way of handling errors so it's preferred
    cachedToken = await tryWithFix(
        async () => {
            const token = await fs.readFile(cloudConfigPath, "utf-8");
            if (token.length < 32) throw "Invalid token";
            return token;
        },
        async () => await fs.writeFile(cloudConfigPath, await getTokenFromServer(), "utf-8"),
        "GoofCord was unable to get cloud token: "
    );

    console.log(chalk.cyanBright("[Cloud Settings]"), "Cloud token:", cachedToken);
    return cachedToken;
}

export async function deleteToken() {
    void fs.unlink(cloudConfigPath);
    cachedToken = "";
}

let serverListening = false;
async function getTokenFromServer(): Promise<string> {
    serverListening = true;
    await shell.openExternal(getCloudHost() + "login");
    return new Promise<string>((resolve) => {
        const server = createServer((req, res) => {
            const token = req.url?.split("/")[1];
            if (token) {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Token received, you can close this tab now.');
                server.close();
                serverListening = false;
                resolve(token);
            }
        });

        server.listen(9998, '127.0.0.1', () => {
            console.log('Listening on', server.address());
        });
    });
}

export function getCloudHost() {
    return getConfig("cloudHost")+"/";
}
