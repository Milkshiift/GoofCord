// postvencordmarker

// src/windows/main/renderer/postVencord/keybinds.ts
function initKeybinds() {
  Common.FluxDispatcher.subscribe("KEYBINDS_SET_KEYBIND", () => {
    window.keybinds.updateKeybinds();
  });
}

// src/windows/main/renderer/postVencord/dynamicIcon.ts
var GuildReadStateStore;
var RelationshipStore;
function initDynamicIcon() {
  RelationshipStore = Common.RelationshipStore;
  GuildReadStateStore = VC.Webpack.findStore("GuildReadStateStore");
  GuildReadStateStore.addChangeListener(setBadge);
  RelationshipStore.addChangeListener(setBadge);
  setBadge();
}
function setBadge() {
  try {
    const mentionCount = GuildReadStateStore.getTotalMentionCount();
    const pendingRequests = RelationshipStore.getPendingCount();
    let totalCount = mentionCount + pendingRequests;
    if (totalCount === 0 && GuildReadStateStore.hasAnyUnread()) {
      totalCount = -1;
    }
    GoofCord.setBadgeCount(totalCount);
  } catch (e) {
    console.error(e);
  }
}

// src/windows/main/renderer/postVencord/invidiousEmbeds.ts
var INSTANCE_UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
window.goofcord.onInvidiousConfigChanged(updateInvidiousInstance);
async function updateInvidiousInstance() {
  if (!GoofCord.getConfig("invidiousEmbeds"))
    return;
  window.invidiousInstance = GoofCord.getConfig("invidiousInstance");
  if (GoofCord.getConfig("autoUpdateInvidiousInstance")) {
    const lastUpdate = GoofCord.getConfig("lastInvidiousUpdate") ?? 0;
    const now = Date.now();
    const needsUpdate = now - lastUpdate > INSTANCE_UPDATE_INTERVAL;
    if (needsUpdate) {
      try {
        console.log("Updating Invidious instance...");
        const newInstance = await findFastestInstance();
        window.invidiousInstance = newInstance;
        GoofCord.setConfig("invidiousInstance", newInstance);
        GoofCord.setConfig("lastInvidiousUpdate", now);
        console.log("Invidious instance updated:", newInstance);
      } catch (error) {
        console.error("Failed to update Invidious instance:", error);
      }
    }
  }
}
async function findFastestInstance() {
  const response = await fetch("https://api.invidious.io/instances.json?pretty=0&sort_by=type,users");
  const json = await response.json();
  const instances = json.map((instance) => instance[1].uri);
  console.log("Testing Invidious instances...");
  let prevBestTime = Infinity;
  let prevBestInstance = null;
  for (const instance of instances) {
    if (!instance.includes("https"))
      continue;
    const start = performance.now();
    try {
      await fetch(instance + "/embed/5IXQ6f6eMxQ?autoplay=1&player_style=youtube&local=true", {
        mode: "no-cors"
      });
    } catch (e) {}
    const end = performance.now();
    const time = end - start;
    console.log(instance, time);
    if (time < prevBestTime) {
      prevBestTime = time;
      prevBestInstance = instance;
    }
  }
  console.log("Fastest instance:", prevBestInstance, prevBestTime);
  return prevBestInstance;
}

// src/windows/main/renderer/postVencord/messageEncryption.ts
var encryptionEnabled = false;
var meEnabled = false;
var encryptionMark = "";
var unpatchDispatch = null;
function removePrefix(str, prefix) {
  return str.startsWith(prefix) ? str.substring(prefix.length) : str;
}
var LockIcon = ({ height = 20, width = 20, className, style }) => {
  return Common.React.createElement("svg", {
    width,
    height,
    className,
    style,
    viewBox: "0 0 448 512",
    xmlns: "http://www.w3.org/2000/svg"
  }, Common.React.createElement("path", {
    fill: "currentColor",
    d: "M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"
  }));
};
var UnlockIcon = ({ height = 20, width = 20, className, style }) => {
  return Common.React.createElement("svg", {
    width,
    height,
    className,
    style,
    viewBox: "0 0 576 512",
    xmlns: "http://www.w3.org/2000/svg"
  }, Common.React.createElement("path", {
    fill: "var(--status-danger)",
    d: "M352 192H384C419.3 192 448 220.7 448 256V448C448 483.3 419.3 512 384 512H64C28.65 512 0 483.3 0 448V256C0 220.7 28.65 192 64 192H288V144C288 64.47 352.5 0 432 0C511.5 0 576 64.47 576 144V192C576 209.7 561.7 224 544 224C526.3 224 512 209.7 512 192V144C512 99.82 476.2 64 432 64C387.8 64 352 99.82 352 144V192z"
  }));
};
var EncryptionToggle = () => {
  const [enabled, setEnabled] = Common.React.useState(encryptionEnabled);
  const handleClick = () => {
    const newState = !enabled;
    encryptionEnabled = newState;
    setEnabled(newState);
    GoofCord.titlebar.flashTitlebar(newState ? "#f9c23c" : "#D0D0D0");
  };
  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    GoofCord.cycleThroughPasswords();
  };
  return Common.React.createElement(VC.Api.ChatButtons.ChatBarButton, {
    tooltip: enabled ? "Encryption active" : "Encryption not active",
    onClick: handleClick,
    onContextMenu: handleRightClick
  }, Common.React.createElement(enabled ? LockIcon : UnlockIcon, null));
};
function initMessageEncryption() {
  if (unpatchDispatch)
    return;
  encryptionMark = GoofCord.getConfig("encryptionMark");
  meEnabled = GoofCord.getConfig("messageEncryption");
  if (!meEnabled)
    return;
  VC.Settings.plugins.ChatInputButtonAPI.enabled = true;
  VC.Settings.plugins.MessageEventsAPI.enabled = true;
  VC.Api.ChatButtons.addChatBarButton("messageEncryption", EncryptionToggle, UnlockIcon);
  VC.Api.MessageEvents.addMessagePreSendListener((_, msg) => {
    if (encryptionEnabled && msg.content) {
      msg.content = GoofCord.encryptMessage(msg.content);
    }
  });
  VC.Api.MessageEvents.addMessagePreEditListener((_, __, msg) => {
    if (encryptionEnabled && msg.content) {
      msg.content = GoofCord.encryptMessage(msg.content);
    }
  });
  const originalDispatch = Common.FluxDispatcher.dispatch;
  Common.FluxDispatcher.dispatch = function(payload) {
    try {
      handleFluxDispatch(payload);
    } catch (err) {
      console.error("[Message Encryption] Error in dispatch handler:", err);
    }
    return originalDispatch.call(this, payload);
  };
  unpatchDispatch = () => {
    Common.FluxDispatcher.dispatch = originalDispatch;
    unpatchDispatch = null;
  };
}
function handleFluxDispatch(dispatch) {
  const decryptAll = (messages) => {
    for (const msg of messages) {
      if (msg.content)
        msg.content = GoofCord.decryptMessage(msg.content);
    }
  };
  switch (dispatch.type) {
    case "MESSAGE_CREATE":
    case "MESSAGE_UPDATE":
      if (dispatch.message?.content) {
        dispatch.message.content = GoofCord.decryptMessage(dispatch.message.content);
      }
      break;
    case "MESSAGE_START_EDIT":
      if (dispatch.content && encryptionMark) {
        dispatch.content = removePrefix(dispatch.content, encryptionMark);
      }
      break;
    case "LOAD_MESSAGES_SUCCESS":
      decryptAll(dispatch.messages);
      break;
    case "SEARCH_FINISH":
    case "MOD_VIEW_SEARCH_FINISH":
      decryptAll(dispatch.messages ? dispatch.messages.flat() : []);
      break;
  }
}

// src/windows/main/renderer/postVencord/quickCssFix.ts
function initQuickCssFix() {
  const channel = new BroadcastChannel("quickcss");
  channel.onmessage = async (event) => {
    if (event.data === "get") {
      channel.postMessage(await window.VencordNative.quickCss.get());
    } else {
      await window.VencordNative.quickCss.set(event.data);
    }
  };
  window.VencordNative.quickCss.openEditor = () => void window.goofcord.openQuickCssWindow();
}

// src/windows/main/renderer/postVencord/richPresence.ts
function initRichPresence() {
  const plugins = VC.Plugins.plugins;
  const matchingKey = Object.keys(plugins).find((key) => key.includes("WebRichPresence"));
  const arRPC = matchingKey ? plugins[matchingKey] : undefined;
  if (!arRPC) {
    console.error("WebRichPresence plugin not found");
  }
  GoofCord.arrpc.onActivity(async (dataJson) => {
    await VC.Webpack.onceReady;
    await arRPC.handleEvent(new MessageEvent("message", { data: dataJson }));
  });
  GoofCord.arrpc.onInvite(async (code) => {
    if (!code)
      return;
    const { invite } = await Common.InviteActions.resolveInvite(code, "Desktop Modal");
    if (!invite)
      return;
    await Common.FluxDispatcher.dispatch({
      type: "INVITE_MODAL_OPEN",
      context: "APP",
      code,
      invite
    });
  });
}

// src/windows/main/renderer/postVencord/screensharePatch.ts
function patchScreenshare() {
  const original = navigator.mediaDevices.getDisplayMedia;
  async function getVirtmic() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevice = devices.find(({ label }) => label === "vencord-screen-share");
      return audioDevice?.deviceId;
    } catch (error) {
      return null;
    }
  }
  navigator.mediaDevices.getDisplayMedia = async function(opts) {
    const stream = await original.call(this, opts);
    console.log("Setting stream's content hint and audio device");
    const settings = window.screenshareSettings;
    settings.width = Math.round(settings.resolution * (screen.width / screen.height));
    const videoTrack = stream.getVideoTracks()[0];
    videoTrack.contentHint = settings.contentHint || "motion";
    const constraints = {
      ...videoTrack.getConstraints(),
      frameRate: { min: settings.framerate, ideal: settings.framerate },
      width: { min: 640, ideal: settings.width, max: settings.width },
      height: { min: 480, ideal: settings.resolution, max: settings.resolution },
      advanced: [{ width: settings.width, height: settings.resolution }],
      resizeMode: "none"
    };
    videoTrack.applyConstraints(constraints).then(() => {
      console.log("Applied constraints successfully. New constraints: ", videoTrack.getConstraints());
    }).catch((e) => console.error("Failed to apply constraints.", e));
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack)
      audioTrack.contentHint = "music";
    const id = await getVirtmic();
    if (id) {
      const audio = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: {
            exact: id
          },
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16
        }
      });
      for (const t of stream.getAudioTracks())
        stream.removeTrack(t);
      stream.addTrack(audio.getAudioTracks()[0]);
    }
    return stream;
  };
  Common.FluxDispatcher.subscribe("STREAM_CLOSE", ({ streamKey }) => {
    const owner = streamKey.split(":").at(-1);
    if (owner !== Common.UserStore.getCurrentUser().id) {
      return;
    }
    GoofCord.stopVenmic();
  });
}

// src/windows/main/renderer/postVencord/settings.ts
function initSettingsButton() {
  const Plugin = VC.Plugins.plugins.Settings;
  if (!Plugin)
    return;
  let LayoutTypes = {
    SECTION: 1,
    SIDEBAR_ITEM: 2,
    PANEL: 3,
    PANE: 4
  };
  VC.Webpack.waitFor(["SECTION", "SIDEBAR_ITEM", "PANEL"], (v) => {
    LayoutTypes = v;
  });
  const _originalBuildLayout = Plugin.buildLayout;
  Plugin.buildLayout = (builder) => {
    const layout = _originalBuildLayout.call(Plugin, builder);
    if (builder.key === "$Root") {
      layout.unshift({
        key: "goofcord_section",
        type: LayoutTypes.SECTION,
        useTitle: () => "✨GoofCord✨",
        buildLayout: () => [
          {
            type: LayoutTypes.SIDEBAR_ITEM,
            key: "goofcord_settings",
            useTitle: () => "Settings",
            getLegacySearchKey: () => "GOOFCORD",
            legacySearchKey: "GOOFCORD",
            icon: VC.Components.MainSettingsIcon,
            onClick: () => {
              GoofCord.openSettingsWindow();
            },
            layout: []
          }
        ]
      });
    }
    return layout;
  };
  window.VencordNative.native.getVersions = GoofCord.getVersions;
  const _originalGetInfoRows = Plugin.getInfoRows.bind(Plugin);
  Plugin.getInfoRows = () => [`GoofCord ${GoofCord.version}`, ..._originalGetInfoRows()];
}

// src/windows/main/renderer/postVencord/postVencord.ts
Object.defineProperties(window, {
  GoofCord: { get: () => window.goofcord },
  VC: { get: () => window.Vencord },
  Common: { get: () => window.Vencord?.Webpack?.Common }
});
function runSafe(tasks) {
  for (const fn of tasks) {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  }
}
async function init() {
  runSafe([updateInvidiousInstance, initRichPresence]);
  await VC.Webpack.onceReady;
  runSafe([initDynamicIcon, patchScreenshare, initSettingsButton, initMessageEncryption, initQuickCssFix, initKeybinds]);
}
init();
