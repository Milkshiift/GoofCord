#!/usr/bin/env node

import {mainWindow} from "../../window.js";

const rgb = (r, g, b, msg) => `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;
const log = (...args) => console.log(`[${rgb(88, 101, 242, 'arRPC')}]`, ...args);

log('arRPC v3.1.0');

import Server from './server.js';

const server = await new Server();

server.on('activity', (data) => mainWindow.webContents.send("rpc", data));