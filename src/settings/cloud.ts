import { createServer } from 'http';
import {cachedConfig, getConfig, setConfigBulk} from '../config';
import {getGoofCordFolderPath, tryWithFix} from "../utils";
import {shell, dialog} from 'electron';
import fs from 'fs/promises';
import path from 'path';
import chalk from "chalk";

const cloudConfigPath = path.join(getGoofCordFolderPath(), "cloud.json");

let cachedToken: string;
async function getCloudToken(): Promise<string> {
    if (cachedToken || serverListening) return cachedToken;

    // tryWithFix is always a bit ugly, but it provides a standardized way of handling errors so it's preferred
    cachedToken = await tryWithFix(
        async () => {
            const token = await fs.readFile(cloudConfigPath, "utf-8");
            if (token.length < 20) throw "Invalid token";
            return token;
        },
        async () => await fs.writeFile(cloudConfigPath, await getTokenFromServer(), "utf-8"),
        "GoofCord was unable to get cloud token: "
    );

    console.log(chalk.cyanBright("[Cloud Settings]"), "Cloud token:", cachedToken);
    return cachedToken;
}

function getCloudHost() {
    return getConfig("cloudHost")+"/";
}

export async function loadCloud() {
    const cloudSettings = (await callEndpoint("load", "GET")).settings;
    if (!cloudSettings || Object.keys(cloudSettings).length < 5) {
        console.log(chalk.cyanBright("[Cloud Settings]"), "Nothing to load");
        dialog.showMessageBoxSync({
            type: "info",
            title: "Cloud Settings",
            message: "Nothing to load",
            buttons: ["OK"]
        });
        return;
    }

    await setConfigBulk(cloudSettings);
    console.log(chalk.cyanBright("[Cloud Settings]"), "Loaded cloud settings:", cloudSettings);
    dialog.showMessageBoxSync({
        type: "info",
        title: "Settings loaded",
        message: "Settings loaded from cloud successfully. Please restart GoofCord to apply the changes.",
        buttons: ["OK"]
    });
}

export async function saveCloud() {
    const response = await callEndpoint("save", "POST", JSON.stringify(cachedConfig));
    if (!response) return;

    console.log(chalk.cyanBright("[Cloud Settings]"), "Saved cloud settings.");
    dialog.showMessageBoxSync({
        type: "info",
        title: "Settings saved",
        message: "Settings saved successfully on cloud.",
        buttons: ["OK"]
    });
}

export async function deleteCloud() {
    const response = await callEndpoint("delete", "GET");
    if (!response) return;
    void fs.unlink(cloudConfigPath);
    cachedToken = "";

    console.log(chalk.cyanBright("[Cloud Settings]"), "Deleted cloud settings.");
    dialog.showMessageBoxSync({
        type: "info",
        title: "Settings deleted",
        message: "Settings deleted from cloud successfully.",
        buttons: ["OK"]
    });
}

async function callEndpoint(endpoint: string, method: string, body?: string) {
    // Try catch is needed for scenarios like an offline server
    try {
        console.log(chalk.cyanBright("[Cloud Settings]"), "Calling endpoint:", endpoint);
        const serverResponse = await fetch(getCloudHost()+endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': await getCloudToken()
            },
            body: body
        });
        const responseJson = await serverResponse.json();
        // Server sends a JSON with "error" property upon internal errors
        if (responseJson.error) throw responseJson.error;
        return responseJson;
    } catch (error: any) {
        const errorMessage = `Error when calling "${endpoint}" endpoint: ${error}`;
        console.warn(chalk.cyanBright("[Cloud Settings]"), errorMessage);
        void dialog.showMessageBox({
            type: "error",
            title: "Cloud error",
            message: errorMessage,
            buttons: ["OK"]
        });
    }
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
