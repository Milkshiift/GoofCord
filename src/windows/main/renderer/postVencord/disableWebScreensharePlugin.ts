// The plugin is redundant in GoofCord
export function disableWebScreensharePlugin() {
    console.log("Disabling WebScreenShare Vencord plugin...");

    if (VC?.Plugins?.plugins) {
        VC.Plugins.plugins.WebScreenShare ??= {};
        VC.Plugins.plugins.WebScreenShare.enabledByDefault = false;
    }

    const prev = window.VencordNative?.settings?.get() || {};
    prev.plugins ??= {};
    prev.plugins.WebScreenShare ??= {};
    prev.plugins.WebScreenShare.enabled = false;

    window.VencordNative?.settings?.set(prev);
}
