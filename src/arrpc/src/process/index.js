const rgb = (r, g, b, msg) => `\x1b[38;2;${r};${g};${b}m${msg}\x1b[0m`;
<<<<<<< Updated upstream
const log = (...args) => console.log(`[${rgb(88, 101, 242, "arRPC")} > ${rgb(237, 66, 69, "process")}]`, ...args);

const DetectableDB = require("./detectable.json");
=======
const log = (...args) => console.log(`[${rgb(88, 101, 242, 'arRPC')} > ${rgb(237, 66, 69, 'process')}]`, ...args);

const DetectableDB = require('./detectable.json');
>>>>>>> Stashed changes

const Natives = require("./native/index.js");
const Native = Natives[process.platform];

<<<<<<< Updated upstream
const timestamps = {},
    names = {},
    pids = {};
class ProcessServer {
    constructor(handlers) {
        if (!Native) return; // log('unsupported platform:', process.platform);
=======

const timestamps = {}, names = {}, pids = {};

class ProcessServer {
    constructor(handlers) {
        if (!Native) return; //log('unsupported platform:', process.platform);
>>>>>>> Stashed changes

        this.handlers = handlers;

        this.scan = this.scan.bind(this);

        this.scan();
<<<<<<< Updated upstream
        setInterval(this.scan, 5000);

        log("started");
=======
        setInterval(this.scan, 10000);

        log('started');
>>>>>>> Stashed changes
    }

    async scan() {
        const startTime = performance.now();
        const processes = await Native.getProcesses();
        const ids = [];

        // log(`got processed in ${(performance.now() - startTime).toFixed(2)}ms`);

        for (const [pid, _path] of processes) {
<<<<<<< Updated upstream
            const path = _path.toLowerCase().replaceAll("\\", "/");
            const toCompare = [path.split("/").pop(), path.split("/").slice(-2).join("/")];

            for (const p of toCompare.slice()) {
                // add more possible tweaked paths for less false negatives
                toCompare.push(p.replace("64", "")); // remove 64bit identifiers-ish
                toCompare.push(p.replace(".x64", ""));
                toCompare.push(p.replace("x64", ""));
            }

            for (const {executables, id, name} of DetectableDB) {
                if (executables?.some((x) => !x.isLauncher && toCompare.some((y) => x.name === y))) {
=======
            const path = _path.toLowerCase().replaceAll('\\', '/');
            const toCompare = [path.split('/').pop(), path.split('/').slice(-2).join('/')];

            for (const p of toCompare.slice()) { // add more possible tweaked paths for less false negatives
                toCompare.push(p.replace('64', '')); // remove 64bit identifiers-ish
                toCompare.push(p.replace('.x64', ''));
                toCompare.push(p.replace('x64', ''));
            }

            for (const {executables, id, name} of DetectableDB) {
                if (executables?.some(x => !x.isLauncher && toCompare.some(y => x.name === y))) {
>>>>>>> Stashed changes
                    names[id] = name;
                    pids[id] = pid;

                    ids.push(id);
                    if (!timestamps[id]) {
<<<<<<< Updated upstream
                        log("detected game!", name);
                        timestamps[id] = Date.now();

                        this.handlers.message(
                            {
                                socketId: id
                            },
                            {
                                cmd: "SET_ACTIVITY",
                                args: {
                                    activity: {
                                        application_id: id,
                                        name,
                                        timestamps: {
                                            start: timestamps[id]
                                        }
                                    },
                                    pid
                                }
                            }
                        );
=======
                        log('detected game!', name);
                        timestamps[id] = Date.now();

                        this.handlers.message({
                            socketId: id
                        }, {
                            cmd: 'SET_ACTIVITY',
                            args: {
                                activity: {
                                    application_id: id,
                                    name,
                                    timestamps: {
                                        start: timestamps[id]
                                    }
                                },
                                pid
                            }
                        });
>>>>>>> Stashed changes
                    }
                }
            }
        }

        for (const id in timestamps) {
            if (!ids.includes(id)) {
<<<<<<< Updated upstream
                log("lost game!", names[id]);
                delete timestamps[id];

                this.handlers.message(
                    {
                        socketId: id
                    },
                    {
                        cmd: "SET_ACTIVITY",
                        args: {
                            activity: null,
                            pid: pids[id]
                        }
                    }
                );
            }
        }

        // log(`finished scan in ${(performance.now() - startTime).toFixed(2)}ms`);
        // process.stdout.write(`\r${' '.repeat(100)}\r[${rgb(88, 101, 242, 'arRPC')} > ${rgb(237, 66, 69, 'process')}] scanned (took ${(performance.now() - startTime).toFixed(2)}ms)`);
    }
}
module.exports = ProcessServer;
=======
                log('lost game!', names[id]);
                delete timestamps[id];

                this.handlers.message({
                    socketId: id
                }, {
                    cmd: 'SET_ACTIVITY',
                    args: {
                        activity: null,
                        pid: pids[id]
                    }
                });
            }
        }

        //log(`finished scan in ${(performance.now() - startTime).toFixed(2)}ms`);
        //process.stdout.write(`\r${' '.repeat(100)}\r[${rgb(88, 101, 242, 'arRPC')} > ${rgb(237, 66, 69, 'process')}] scanned (took ${(performance.now() - startTime).toFixed(2)}ms)`);
    }
}

module.exports = ProcessServer;
>>>>>>> Stashed changes
