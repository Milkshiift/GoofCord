/*
  Code originally created by SpacingBat3
  Source: https://github.com/SpacingBat3/WebCord
  Licensed under the MIT License
*/

import {release} from "os";

function getAgentArch(arch: string): string {
    switch (arch as NodeJS.Architecture) {
        case "arm64": return "aarch64";
        case "arm": return "armv7";
        case "ia32": return "x86";
        case "x64": return "x86_64";
        default: return arch;
    }
}

export function getUserAgent(chromeVersion: string):string {
    const userAgentPlatform = process.platform;
    const osVersion:string = process.getSystemVersion();
    let wow64: string;
    let fakeUserAgent:string;
    switch (userAgentPlatform as NodeJS.Platform) {
        case "darwin":
            fakeUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X "+osVersion.replace(".","_")+") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/"+chromeVersion+" Safari/537.36";
            break;
        case "win32":
            wow64 = osVersion.split(".")[0] === "10" ? "Win64; x64" : "WOW64";
            fakeUserAgent = "Mozilla/5.0 (Windows NT 10.0; "+wow64+") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/"+chromeVersion+" Safari/537.36";
            break;
        default:
            fakeUserAgent = "Mozilla/5.0 (X11; "+userAgentPlatform+" "+getAgentArch(process.arch)+") AppleWebKit/537.36 (KHTML, like Gecko) Chrome/"+chromeVersion+" Safari/537.36";
    }
    return fakeUserAgent;
}