// Minimal renderer process logger to make things look prettier
function _log(level: "log" | "error" | "warn" | "info" | "debug", args: string) {
	console[level]("%c GoofCord ", "background: #5865f2; color: black; font-weight: bold; border-radius: 5px;", "", args);
}

export function log(args: string) {
	_log("log", args);
}

export function error(args: string) {
	_log("error", args);
}

export function warn(args: string) {
	_log("warn", args);
}
