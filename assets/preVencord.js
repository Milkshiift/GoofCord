var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/windows/main/renderer/preVencord/domOptimizer.ts
function startDomOptimizer() {
  if (!window.goofcord.getConfig("domOptimizer"))
    return;
  function optimize(orig) {
    const delayedClasses = ["activity", "gif", "avatar", "imagePlaceholder", "hoverBar"];
    return function(...args) {
      const element = args[0];
      if (typeof element?.className === "string") {
        if (delayedClasses.some((partial) => element.className.includes(partial))) {
          setTimeout(() => orig.apply(this, args), 100 - Math.random() * 50);
          return;
        }
      }
      return orig.apply(this, args);
    };
  }
  Element.prototype.removeChild = optimize(Element.prototype.removeChild);
}

// src/windows/main/renderer/preVencord/notificationFix.ts
function fixNotifications() {
  const originalSetter = Object.getOwnPropertyDescriptor(Notification.prototype, "onclick")?.set;
  Object.defineProperty(Notification.prototype, "onclick", {
    set(onClick) {
      originalSetter?.call(this, (...args) => {
        onClick.apply(this, args);
        window.goofcord.window.show();
      });
    },
    configurable: true
  });
}

// src/windows/main/renderer/preVencord/patches/devtoolsFix.ts
var exports_devtoolsFix = {};
__export(exports_devtoolsFix, {
  default: () => devtoolsFix_default
});

// src/windows/main/renderer/preVencord/patchManager.ts
var IDENTIFIER_PATTERN = "(?:[A-Za-z_$][\\w$]*)";
var PATCHES = "__GOOFCORD_PATCHES__";
var GLOBALS = "GoofCordPatchGlobals";
var GLOBAL_REF = `window.${GLOBALS}`;
window[PATCHES] = window[PATCHES] || [];
window[GLOBALS] = window[GLOBALS] || {};
var definePatch = (config) => config;
function loadPatches(definitions) {
  for (const def of definitions) {
    const { patches, condition, ...helpers } = def;
    if (condition && !condition())
      continue;
    Object.assign(window[GLOBALS], helpers);
    const readyPatches = patches.map(processPatch);
    window[PATCHES].push(...readyPatches);
  }
}
function processPatch(patch) {
  const replacements = Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement];
  return {
    ...patch,
    plugin: "GoofCord",
    find: expandRegex(patch.find),
    replacement: replacements.map((rep) => ({
      match: expandRegex(rep.match),
      replace: linkHelpers(rep.replace.toString())
    }))
  };
}
function expandRegex(input) {
  if (input instanceof RegExp) {
    const source = input.source.replaceAll("\\i", IDENTIFIER_PATTERN);
    return new RegExp(source, input.flags);
  }
  return input.replaceAll("\\i", IDENTIFIER_PATTERN);
}
function linkHelpers(input) {
  return input.replaceAll("$self", GLOBAL_REF);
}

// src/windows/main/renderer/preVencord/patches/devtoolsFix.ts
var devtoolsFix_default = definePatch({
  patches: [
    {
      find: '"mod+alt+i"',
      replacement: {
        match: /"discord\.com"===location\.host/,
        replace: "false"
      }
    },
    {
      find: "setDevtoolsCallbacks",
      replacement: {
        match: /if\(null!=\i&&"0.0.0"===\i\.remoteApp\.getVersion\(\)\)/,
        replace: "if(true)"
      }
    }
  ]
});

// src/windows/main/renderer/preVencord/patches/invidiousEmbeds.ts
var exports_invidiousEmbeds = {};
__export(exports_invidiousEmbeds, {
  default: () => invidiousEmbeds_default
});
var invidiousEmbeds_default = definePatch({
  patches: [
    {
      find: ',"%"),maxWidth',
      replacement: {
        match: /(:[^,]+,src:[^\.]+.url)/,
        replace: "$1?.replace('https://www.youtube.com/embed/', (window.invidiousInstance ?? 'https://www.youtube.com')+'/embed/')+'?autoplay=1&player_style=youtube&local=true'"
      }
    }
  ]
});

// src/windows/main/renderer/preVencord/patches/keybinds.ts
var exports_keybinds = {};
__export(exports_keybinds, {
  default: () => keybinds_default
});
var keybinds_default = definePatch({
  patches: [
    {
      find: "keybindActionTypes",
      replacement: [
        { match: /\i\.isPlatformEmbedded/g, replace: "true" },
        { match: /\(0,\i\.isDesktop\)\(\)/g, replace: "true" }
      ]
    }
  ]
});

// src/windows/main/renderer/preVencord/patches/screenshare.ts
var exports_screenshare = {};
__export(exports_screenshare, {
  default: () => screenshare_default
});
var screenshare_default = definePatch({
  patches: [
    {
      find: "this.getDefaultGoliveQuality()",
      replacement: {
        match: /this\.getDefaultGoliveQuality\(\)/,
        replace: "$self.patchStreamQuality($&)"
      }
    },
    {
      find: "canUseCustomStickersEverywhere:",
      replacement: {
        match: /(?<=canStreamQuality:)\i/,
        replace: "() => true"
      }
    }
  ],
  patchStreamQuality(opts) {
    const screenshareQuality = window.screenshareSettings;
    if (!screenshareQuality)
      return opts;
    const framerate = Number(screenshareQuality.framerate);
    const height = Number(screenshareQuality.resolution);
    const width = Math.round(height * (screen.width / screen.height));
    Object.assign(opts, {
      bitrateMin: 500000,
      bitrateMax: 8000000,
      bitrateTarget: 600000
    });
    const videoParams = {
      framerate,
      width,
      height,
      pixelCount: height * width
    };
    if (opts?.encode)
      Object.assign(opts.encode, videoParams);
    Object.assign(opts.capture, videoParams);
    return opts;
  }
});

// src/windows/main/renderer/preVencord/patches/titlebar.ts
var exports_titlebar = {};
__export(exports_titlebar, {
  default: () => titlebar_default
});
var titlebar_default = definePatch({
  condition: () => window.goofcord.getConfig("customTitlebar"),
  patches: [
    {
      find: ".systemBar,",
      replacement: [
        { match: /\i===\i\.PlatformTypes\.WINDOWS/g, replace: "true" },
        { match: /\i===\i\.PlatformTypes\.WEB/g, replace: "false" }
      ]
    },
    {
      find: ",setSystemTrayApplications",
      replacement: [
        {
          match: /\i\.window\.(close|minimize|maximize)/g,
          replace: "goofcord.window.$1"
        }
      ]
    }
  ]
});

// glob-import-plugin:glob:456e6cba5a6d432.ts
var glob_456e6cba5a6d432_default = [exports_devtoolsFix, exports_invidiousEmbeds, exports_keybinds, exports_screenshare, exports_titlebar];

// src/windows/main/renderer/preVencord/preVencord.ts
if (window.goofcord.isVencordPresent()) {
  const patches = Object.values(glob_456e6cba5a6d432_default).map((mod) => mod.default);
  loadPatches(patches);
}
fixNotifications();
startDomOptimizer();
