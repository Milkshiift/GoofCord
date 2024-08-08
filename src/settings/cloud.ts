import { createServer } from 'http';
import { getConfig, getConfigLocation, setConfigBulk } from '../config';
import { getGoofCordFolderPath } from "../utils";
import { shell, dialog } from 'electron';

import fs from 'fs';
import path from 'path';

function getCloudConfigLocation(): string {
    const check = path.join(getGoofCordFolderPath(), "cloud.json");
    if (!fs.existsSync(check)) {
        fs.writeFileSync(check, "");
    }
    return path.join(getGoofCordFolderPath(), "cloud.json");
}

function getCloudToken(): string {
    const path = getCloudConfigLocation();
    const token = fs.readFileSync(path, "utf-8");
    console.log("Cloud token:", token);
    return token;
}

function saveCloudToken(token: string) {
    const path = getCloudConfigLocation();
    fs.unlinkSync(path);
    fs.writeFileSync(path, token);
}

const cloudHost = getConfig("cloudHost");
const cloudToken = getCloudToken();

let isServerRunning = false;

async function preCheck() {
    if (!cloudHost) {
        console.error("Cloud host not defined");
        return;
    }

    if (!cloudToken) {
        startCloudServer();
        console.error("Cloud token not defined");
        const loginUrl = `${cloudHost}/login`;
        await shell.openExternal((loginUrl));

        while (!cloudToken) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return;
    }
}

export async function deleteCloud() {
    console.log("Deleting cloud settings.");

    await preCheck();

    const deletefetch = await fetch(`${cloudHost}/delete`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${cloudToken}`
        }
    });

    const deletejson = await deletefetch.json();

    if (deletejson.error) {
        console.warn("Error deleting cloud settings:", deletejson.error);
        dialog.showMessageBoxSync({
            type: "error",
            title: "Error deleting cloud settings",
            message: deletejson.error,
            buttons: ["OK"]
        });

        return;
    }

    const path = getCloudConfigLocation();
    fs.unlinkSync(path);

    console.log("Deleted cloud settings.");

    dialog.showMessageBoxSync({
        type: "info",
        title: "Settings deleted",
        message: "Settings deleted successfully.",
        buttons: ["OK"]
    });

    return;
}

export async function loadCloud() {
    console.log("Loading cloud settings.");

    await preCheck();

    const loadfetch = await fetch(`${cloudHost}/load`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${cloudToken}`
        }
    });

    const loadjsonraw = await loadfetch.json();

    if (loadjsonraw.error) {
        console.warn("Error loading cloud settings:", loadjsonraw.error);
        console.log("Starting local server.");
        startCloudServer();
        return;
    }

    const loadjson = JSON.stringify(loadjsonraw);
    const loadjsonobj = JSON.parse(loadjson);

    console.log("Loaded cloud settings:", loadjson);

    setConfigBulk(loadjsonobj);

    console.log("Settings applied.");

    dialog.showMessageBoxSync({
        type: "info",
        title: "Settings loaded",
        message: "Settings loaded successfully.",
        buttons: ["OK"]
    });
}

export async function saveCloud() {
    console.log("Saving cloud settings.");

    await preCheck();

    const location = getConfigLocation();

    type CloudSettingData = {
        key: string;
        value: any;
    };

    const data: CloudSettingData[] = [];

    const rawData = fs.readFileSync(location, "utf-8");
    const cachedConfig = JSON.parse(rawData);

    for (const key in cachedConfig) {
        data.push({ key, value: cachedConfig[key] });
    }

    const savefetch = await fetch(`${cloudHost}/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `${cloudToken}`
        },
        body: JSON.stringify(data)
    });

    const savejson = await savefetch.json();

    if (savejson.error) {
        console.warn("Error saving cloud settings:", savejson.error);
        dialog.showMessageBoxSync({
            type: "error",
            title: "Error saving cloud settings",
            message: savejson.error,
            buttons: ["OK"]
        });
        return;
    }

    console.log("Saved cloud settings.");
    dialog.showMessageBoxSync({
        type: "info",
        title: "Settings saved",
        message: "Settings saved successfully.",
        buttons: ["OK"]
    });

    return;

}

async function startCloudServer() {
    if (isServerRunning) return;

    const server = createServer((req, res) => {
        const token = req.url?.split("/")[1];
        if (token) {
            saveCloudToken(token);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Token received, you can close this tab now.');
            server.close();
            return;
        }
    });

    server.listen(9999, '127.0.0.1', () => {
        console.log('Listening on 127.0.0.1:9999');
        isServerRunning = true;
    });

}