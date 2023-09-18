const rgb = (r, g, b, msg) => `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;
<<<<<<< Updated upstream
const log = (...args) => console.log(`[${rgb(88, 101, 242, "arRPC")} > ${rgb(254, 231, 92, "ipc")}]`, ...args);
=======
const log = (...args) => console.log(`[${rgb(88, 101, 242, 'arRPC')} > ${rgb(254, 231, 92, 'ipc')}]`, ...args);
>>>>>>> Stashed changes

const {join} = require("path");
const {platform, env} = require("process");
const {unlinkSync} = require("fs");

const {createServer, createConnection} = require("net");

<<<<<<< Updated upstream
const SOCKET_PATH =
    platform === "win32"
        ? "\\\\?\\pipe\\discord-ipc"
        : join(env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || "/tmp", "discord-ipc");

// enums for various constants
const Types = {
    // types of packets
=======
const SOCKET_PATH = platform === 'win32' ? '\\\\?\\pipe\\discord-ipc'
    : join(env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || '/tmp', 'discord-ipc');

// enums for various constants
const Types = { // types of packets
>>>>>>> Stashed changes
    HANDSHAKE: 0,
    FRAME: 1,
    CLOSE: 2,
    PING: 3,
    PONG: 4
};

<<<<<<< Updated upstream
const CloseCodes = {
    // codes for closures
=======
const CloseCodes = { // codes for closures
>>>>>>> Stashed changes
    CLOSE_NORMAL: 1000,
    CLOSE_UNSUPPORTED: 1003,
    CLOSE_ABNORMAL: 1006
};

<<<<<<< Updated upstream
const ErrorCodes = {
    // codes for errors
=======
const ErrorCodes = { // codes for errors
>>>>>>> Stashed changes
    INVALID_CLIENTID: 4000,
    INVALID_ORIGIN: 4001,
    RATELIMITED: 4002,
    TOKEN_REVOKED: 4003,
    INVALID_VERSION: 4004,
    INVALID_ENCODING: 4005
};

let uniqueId = 0;

const encode = (type, data) => {
    data = JSON.stringify(data);
    const dataSize = Buffer.byteLength(data);

    const buf = Buffer.alloc(dataSize + 8);
    buf.writeInt32LE(type, 0); // type
    buf.writeInt32LE(dataSize, 4); // data size
    buf.write(data, 8, dataSize); // data

    return buf;
};

<<<<<<< Updated upstream
const read = (socket) => {
=======
const read = socket => {
>>>>>>> Stashed changes
    let resp = socket.read(8);
    if (!resp) return;

    resp = Buffer.from(resp);
    const type = resp.readInt32LE(0);
    const dataSize = resp.readInt32LE(4);

<<<<<<< Updated upstream
    if (type < 0 || type >= Object.keys(Types).length) throw new Error("invalid type");

    let data = socket.read(dataSize);
    if (!data) throw new Error("failed reading data");
=======
    if (type < 0 || type >= Object.keys(Types).length) throw new Error('invalid type');

    let data = socket.read(dataSize);
    if (!data) throw new Error('failed reading data');
>>>>>>> Stashed changes

    data = JSON.parse(Buffer.from(data).toString());

    switch (type) {
        case Types.PING:
<<<<<<< Updated upstream
            socket.emit("ping", data);
=======
            socket.emit('ping', data);
>>>>>>> Stashed changes
            socket.write(encode(Types.PONG, data));
            break;

        case Types.PONG:
<<<<<<< Updated upstream
            socket.emit("pong", data);
            break;

        case Types.HANDSHAKE:
            if (socket._handshook) throw new Error("already handshook");

            socket._handshook = true;
            socket.emit("handshake", data);
            break;

        case Types.FRAME:
            if (!socket._handshook) throw new Error("need to handshake first");

            socket.emit("request", data);
=======
            socket.emit('pong', data);
            break;

        case Types.HANDSHAKE:
            if (socket._handshook) throw new Error('already handshook');

            socket._handshook = true;
            socket.emit('handshake', data);
            break;

        case Types.FRAME:
            if (!socket._handshook) throw new Error('need to handshake first');

            socket.emit('request', data);
>>>>>>> Stashed changes
            break;

        case Types.CLOSE:
            socket.end();
            socket.destroy();
            break;
    }

    read(socket);
};

<<<<<<< Updated upstream
const socketIsAvailable = async (socket) => {
    socket.pause();
    socket.on("readable", () => {
        try {
            read(socket);
        } catch (e) {
            log("error whilst reading", e);

            socket.end(
                encode(Types.CLOSE, {
                    code: CloseCodes.CLOSE_UNSUPPORTED,
                    message: e.message
                })
            );
=======
const socketIsAvailable = async socket => {
    socket.pause();
    socket.on('readable', () => {
        try {
            read(socket);
        } catch (e) {
            log('error whilst reading', e);

            socket.end(encode(Types.CLOSE, {
                code: CloseCodes.CLOSE_UNSUPPORTED,
                message: e.message
            }));
>>>>>>> Stashed changes
            socket.destroy();
        }
    });

    const stop = () => {
        try {
            socket.end();
            socket.destroy();
<<<<<<< Updated upstream
        } catch {}
    };

    const possibleOutcomes = Promise.race([
        new Promise((res) => socket.on("error", res)), // errored
        new Promise((res, rej) => socket.on("pong", () => rej("socket ponged"))), // ponged
        new Promise((res, rej) => setTimeout(() => rej("timed out"), 1000)) // timed out
    ]).then(
        () => true,
        (e) => e
    );
=======
        } catch {
        }
    };

    const possibleOutcomes = Promise.race([
        new Promise(res => socket.on('error', res)), // errored
        new Promise((res, rej) => socket.on('pong', () => rej('socket ponged'))), // ponged
        new Promise((res, rej) => setTimeout(() => rej('timed out'), 1000)) // timed out
    ]).then(() => true, e => e);
>>>>>>> Stashed changes

    socket.write(encode(Types.PING, ++uniqueId));

    const outcome = await possibleOutcomes;
    stop();
<<<<<<< Updated upstream
    log("checked if socket is available:", outcome === true, outcome === true ? "" : `- reason: ${outcome}`);
=======
    if (process.env.ARRPC_DEBUG) log('checked if socket is available:', outcome === true, outcome === true ? '' : `- reason: ${outcome}`);
>>>>>>> Stashed changes

    return outcome === true;
};

const getAvailableSocket = async (tries = 0) => {
    if (tries > 9) {
<<<<<<< Updated upstream
        throw new Error("ran out of tries to find socket", tries);
    }

    const path = SOCKET_PATH + "-" + tries;
    const socket = createConnection(path);

    log("checking", path);

    if (await socketIsAvailable(socket)) {
        if (platform !== "win32")
            try {
                unlinkSync(path);
            } catch {}
=======
        throw new Error('ran out of tries to find socket', tries);
    }

    const path = SOCKET_PATH + '-' + tries;
    const socket = createConnection(path);

    if (process.env.ARRPC_DEBUG) log('checking', path);

    if (await socketIsAvailable(socket)) {
        if (platform !== 'win32') try {
            unlinkSync(path);
        } catch {
        }
>>>>>>> Stashed changes

        return path;
    }

    log(`not available, trying again (attempt ${tries + 1})`);
    return getAvailableSocket(tries + 1);
};

class IPCServer {
    constructor(handers) {
<<<<<<< Updated upstream
        return new Promise(async (res) => {
=======
        return new Promise(async res => {
>>>>>>> Stashed changes
            this.handlers = handers;

            this.onConnection = this.onConnection.bind(this);
            this.onMessage = this.onMessage.bind(this);

            const server = createServer(this.onConnection);
<<<<<<< Updated upstream
            server.on("error", (e) => {
                log("server error", e);
=======
            server.on('error', e => {
                log('server error', e);
>>>>>>> Stashed changes
            });

            const socketPath = await getAvailableSocket();
            server.listen(socketPath, () => {
<<<<<<< Updated upstream
                log("listening at", socketPath);
=======
                log('listening at', socketPath);
>>>>>>> Stashed changes
                this.server = server;

                res(this);
            });
        });
    }

    onConnection(socket) {
<<<<<<< Updated upstream
        log("new connection!");

        socket.pause();
        socket.on("readable", () => {
            try {
                read(socket);
            } catch (e) {
                log("error whilst reading", e);

                socket.end(
                    encode(Types.CLOSE, {
                        code: CloseCodes.CLOSE_UNSUPPORTED,
                        message: e.message
                    })
                );
=======
        log('new connection!');

        socket.pause();
        socket.on('readable', () => {
            try {
                read(socket);
            } catch (e) {
                log('error whilst reading', e);

                socket.end(encode(Types.CLOSE, {
                    code: CloseCodes.CLOSE_UNSUPPORTED,
                    message: e.message
                }));
>>>>>>> Stashed changes
                socket.destroy();
            }
        });

<<<<<<< Updated upstream
        socket.once("handshake", (params) => {
            log("handshake:", params);

            const ver = parseInt(params.v ?? 1);
            const clientId = params.client_id ?? "";
            // encoding is always json for ipc

            socket.close = (code = CloseCodes.CLOSE_NORMAL, message = "") => {
                socket.end(
                    encode(Types.CLOSE, {
                        code,
                        message
                    })
                );
=======
        socket.once('handshake', params => {
            if (process.env.ARRPC_DEBUG) log('handshake:', params);

            const ver = parseInt(params.v ?? 1);
            const clientId = params.client_id ?? '';
            // encoding is always json for ipc

            socket.close = (code = CloseCodes.CLOSE_NORMAL, message = '') => {
                socket.end(encode(Types.CLOSE, {
                    code,
                    message
                }));
>>>>>>> Stashed changes
                socket.destroy();
            };

            if (ver !== 1) {
<<<<<<< Updated upstream
                log("unsupported version requested", ver);
=======
                log('unsupported version requested', ver);
>>>>>>> Stashed changes

                socket.close(ErrorCodes.INVALID_VERSION);
                return;
            }

<<<<<<< Updated upstream
            if (clientId === "") {
                log("client id required");
=======
            if (clientId === '') {
                log('client id required');
>>>>>>> Stashed changes

                socket.close(ErrorCodes.INVALID_CLIENTID);
                return;
            }

<<<<<<< Updated upstream
            socket.on("error", (e) => {
                log("socket error", e);
            });

            socket.on("close", (e) => {
                log("socket closed", e);
                this.handlers.close(socket);
            });

            socket.on("request", this.onMessage.bind(this, socket));

            socket._send = socket.send;
            socket.send = (msg) => {
                log("sending", msg);
=======
            socket.on('error', e => {
                log('socket error', e);
            });

            socket.on('close', e => {
                log('socket closed', e);
                this.handlers.close(socket);
            });

            socket.on('request', this.onMessage.bind(this, socket));

            socket._send = socket.send;
            socket.send = msg => {
                if (process.env.ARRPC_DEBUG) log('sending', msg);
>>>>>>> Stashed changes
                socket.write(encode(Types.FRAME, msg));
            };

            socket.clientId = clientId;

            this.handlers.connection(socket);
<<<<<<< Updated upstream
        });
    }

    onMessage(socket, msg) {
        log("message", msg);
        this.handlers.message(socket, msg);
    }
}
module.exports = IPCServer;
=======
        })
    }

    onMessage(socket, msg) {
        if (process.env.ARRPC_DEBUG) log('message', msg);
        this.handlers.message(socket, msg);
    }
}

module.exports = IPCServer;
>>>>>>> Stashed changes
