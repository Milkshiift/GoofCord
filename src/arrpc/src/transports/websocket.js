const rgb = (r, g, b, msg) => `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;
<<<<<<< Updated upstream
const log = (...args) => console.log(`[${rgb(88, 101, 242, "arRPC")} > ${rgb(235, 69, 158, "websocket")}]`, ...args);
=======
const log = (...args) => console.log(`[${rgb(88, 101, 242, 'arRPC')} > ${rgb(235, 69, 158, 'websocket')}]`, ...args);
>>>>>>> Stashed changes

const {WebSocketServer} = require("ws");
const {createServer} = require("http");
const {parse} = require("querystring");

const portRange = [6463, 6472]; // ports available/possible: 6463-6472

class WSServer {
    constructor(handlers) {
        return (async () => {
            this.handlers = handlers;

            this.onConnection = this.onConnection.bind(this);
            this.onMessage = this.onMessage.bind(this);

            let port = portRange[0];

            let http, wss;
            while (port <= portRange[1]) {
<<<<<<< Updated upstream
                log("trying port", port);

                if (
                    await new Promise((res) => {
                        http = createServer();
                        http.on("error", (e) => {
                            // log('http error', e);

                            if (e.code === "EADDRINUSE") {
                                log(port, "in use!");
                                res(false);
                            }
                        });

                        wss = new WebSocketServer({server: http});
                        wss.on("error", (e) => {
                            // log('wss error', e);
                        });

                        wss.on("connection", this.onConnection);

                        http.listen(port, "127.0.0.1", () => {
                            log("listening on", port);

                            this.http = http;
                            this.wss = wss;

                            res(true);
                        });
                    })
                )
                    break;
=======
                if (process.env.ARRPC_DEBUG) log('trying port', port);

                if (await new Promise(res => {
                    http = createServer();
                    http.on('error', e => {
                        // log('http error', e);

                        if (e.code === 'EADDRINUSE') {
                            log(port, 'in use!');
                            res(false);
                        }
                    });

                    wss = new WebSocketServer({server: http});
                    wss.on('error', e => {
                        // log('wss error', e);
                    });

                    wss.on('connection', this.onConnection);

                    http.listen(port, '127.0.0.1', () => {
                        log('listening on', port);

                        this.http = http;
                        this.wss = wss;

                        res(true);
                    });
                })) break;
>>>>>>> Stashed changes
                port++;
            }

            return this;
        })();
    }

    onConnection(socket, req) {
<<<<<<< Updated upstream
        const params = parse(req.url.split("?")[1]);
        const ver = parseInt(params.v ?? 1);
        const encoding = params.encoding ?? "json"; // json | etf (erlpack)
        const clientId = params.client_id ?? "";

        const origin = req.headers.origin ?? "";

        log(`new connection! origin:`, origin, JSON.parse(JSON.stringify(params)));

        if (
            origin !== "" &&
            ![
                "https://discord.com",
                "https://ptb.discord.com",
                "https://canary.discord.com",
                "https://replugged.dev"
            ].includes(origin)
        ) {
            log("disallowed origin", origin);
=======
        const params = parse(req.url.split('?')[1]);
        const ver = parseInt(params.v ?? 1);
        const encoding = params.encoding ?? 'json'; // json | etf (erlpack)
        const clientId = params.client_id ?? '';

        const origin = req.headers.origin ?? '';

        if (process.env.ARRPC_DEBUG) log(`new connection! origin:`, origin, JSON.parse(JSON.stringify(params)));

        if (origin !== '' && !['https://discord.com', 'https://ptb.discord.com', 'https://canary.discord.com'].includes(origin)) {
            log('disallowed origin', origin);
>>>>>>> Stashed changes

            socket.close();
            return;
        }

<<<<<<< Updated upstream
        if (encoding !== "json") {
            log("unsupported encoding requested", encoding);
=======
        if (encoding !== 'json') {
            log('unsupported encoding requested', encoding);
>>>>>>> Stashed changes

            socket.close();
            return;
        }

        if (ver !== 1) {
<<<<<<< Updated upstream
            log("unsupported version requested", ver);
=======
            log('unsupported version requested', ver);
>>>>>>> Stashed changes

            socket.close();
            return;
        }

        /* if (clientId === '') {
<<<<<<< Updated upstream
      log('client id required');

      socket.close();
      return;
    } */
=======
          log('client id required');

          socket.close();
          return;
        } */
>>>>>>> Stashed changes

        socket.clientId = clientId;
        socket.encoding = encoding;

<<<<<<< Updated upstream
        socket.on("error", (e) => {
            log("socket error", e);
        });

        socket.on("close", (e, r) => {
            log("socket closed", e, r);
            this.handlers.close(socket);
        });

        socket.on("message", this.onMessage.bind(this, socket));

        socket._send = socket.send;
        socket.send = (msg) => {
            log("sending", msg);
=======
        socket.on('error', e => {
            log('socket error', e);
        });

        socket.on('close', (e, r) => {
            log('socket closed', e, r);
            this.handlers.close(socket);
        });

        socket.on('message', this.onMessage.bind(this, socket));

        socket._send = socket.send;
        socket.send = msg => {
            if (process.env.ARRPC_DEBUG) log('sending', msg);
>>>>>>> Stashed changes
            socket._send(JSON.stringify(msg));
        };

        this.handlers.connection(socket);
    }

    onMessage(socket, msg) {
<<<<<<< Updated upstream
        log("message", JSON.parse(msg));
        this.handlers.message(socket, JSON.parse(msg));
    }
}
module.exports = WSServer;
=======
        if (process.env.ARRPC_DEBUG) log('message', JSON.parse(msg));
        this.handlers.message(socket, JSON.parse(msg));
    }
}

module.exports = WSServer;
>>>>>>> Stashed changes
