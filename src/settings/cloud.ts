import { createServer } from 'http';
import { getConfig, getConfigLocation, setConfigBulk } from '../config';
import { getGoofCordFolderPath } from "../utils";
import { shell, dialog } from 'electron';
import crypto from 'crypto';

import fs from 'fs';
import path from 'path';

async function cloudConfigCheck() {
    const filePath = getCloudConfigLocation();
    try {
        await fs.promises.access(filePath); 
    } catch (error) {
        fs.writeFileSync(filePath, "{}", "utf-8");
    }
}

function getCloudConfigLocation(): string {
    const check = path.join(getGoofCordFolderPath(), "cloud.json");
    if (!fs.existsSync(check)) {
        fs.writeFileSync(check, "");
    }
    return path.join(getGoofCordFolderPath(), "cloud.json");
}

async function getCloudToken(): Promise<string | undefined> {
    const path = getCloudConfigLocation();
    try {
        const token = fs.readFileSync(path, "utf-8");
        console.log("Cloud token:", token);
        return token;
    } catch (error) {
        await cloudConfigCheck();
        return undefined; 
    }
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

    const path = getCloudConfigLocation();
    fs.unlinkSync(path);

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
            message: deletejson.error + "\n\nPlease try by restarting GoofCord and try again.",
            buttons: ["OK"]
        });

        return;
    }

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
        dialog.showMessageBoxSync({
            type: "error",
            title: "Click Delete Cloud Data in the settings and try again.",
            message: loadjsonraw.error,
            buttons: ["OK"]
        });
        return;
    }

    const loadjson = JSON.stringify(loadjsonraw);
    const loadjsonobj = JSON.parse(loadjson);

    console.log("Loaded cloud settings:", loadjson);

    const key = getConfig("cloudEncryptionKey");

    if (!key) {
        console.warn("Cloud Encryption Key not set.");
        dialog.showMessageBoxSync({
            type: "error",
            title: "Cloud Encryption Key not set",
            message: "Please set the Cloud Encryption Key in the settings and try again.",
            buttons: ["OK"]
        });
        return;
    }

    const iv = crypto.randomBytes(16);

    setConfigBulk(loadjsonobj);

    console.log("Settings applied.");

    dialog.showMessageBoxSync({
        type: "info",
        title: "Settings loaded",
        message: "Settings loaded successfully. Please restart GoofCord to apply the changes.",
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

    const key = getConfig("cloudEncryptionKey");
    if (!key) {
        console.warn("Cloud Encryption Key not set.");
        dialog.showMessageBoxSync({
            type: "error",
            title: "Cloud Encryption Key not set",
            message: "Please set the Cloud Encryption Key in the settings and try again.",
            buttons: ["OK"]
        });
        return;
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    delete cachedConfig["cloudEncryption"];
    const encryptedData = cipher.update(cachedConfig, 'utf8', 'base64') + cipher.final('base64');

    const parsedEncryptedData = JSON.parse(atob(encryptedData));

    for (const key in parsedEncryptedData) {
        data.push({ key, value: parsedEncryptedData[key] });
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
            title: "Click Delete Cloud Data in the settings and try again.",
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