import type { React } from "@vencord/types/webpack/common";

let encryptionEnabled = false;
let meEnabled: boolean = false;
let encryptionMark: string = "";
let unpatchDispatch: (() => void) | null = null;

function removePrefix(str: string, prefix: string): string {
	return str.startsWith(prefix) ? str.substring(prefix.length) : str;
}

// @ts-expect-error
const LockIcon = ({ height = 20, width = 20, className, style }) => {
	return Common.React.createElement(
		"svg",
		{
			width: width,
			height: height,
			className: className,
			style: style,
			viewBox: "0 0 448 512",
			xmlns: "http://www.w3.org/2000/svg",
		},
		Common.React.createElement("path", {
			fill: "currentColor",
			d: "M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z",
		}),
	);
};

// @ts-expect-error
const UnlockIcon = ({ height = 20, width = 20, className, style }) => {
	return Common.React.createElement(
		"svg",
		{
			width: width,
			height: height,
			className: className,
			style: style,
			viewBox: "0 0 576 512",
			xmlns: "http://www.w3.org/2000/svg",
		},
		Common.React.createElement("path", {
			fill: "var(--status-danger)",
			d: "M352 192H384C419.3 192 448 220.7 448 256V448C448 483.3 419.3 512 384 512H64C28.65 512 0 483.3 0 448V256C0 220.7 28.65 192 64 192H288V144C288 64.47 352.5 0 432 0C511.5 0 576 64.47 576 144V192C576 209.7 561.7 224 544 224C526.3 224 512 209.7 512 192V144C512 99.82 476.2 64 432 64C387.8 64 352 99.82 352 144V192z",
		}),
	);
};

const EncryptionToggle = () => {
	const [enabled, setEnabled] = Common.React.useState(encryptionEnabled);

	const handleClick = () => {
		const newState = !enabled;
		encryptionEnabled = newState;
		setEnabled(newState);

		GoofCord.titlebar.flashTitlebar(newState ? "#f9c23c" : "#D0D0D0");
	};

	const handleRightClick = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();

		void GoofCord.cycleThroughPasswords();
	};

	return Common.React.createElement(
		VC.Api.ChatButtons.ChatBarButton,
		// @ts-expect-error
		{
			tooltip: enabled ? "Encryption active" : "Encryption not active",
			onClick: handleClick,
			onContextMenu: handleRightClick,
		},
		Common.React.createElement(enabled ? LockIcon : UnlockIcon, null),
	);
};

export function initMessageEncryption() {
	if (unpatchDispatch) return;

	encryptionMark = GoofCord.getConfig("encryptionMark");
	meEnabled = GoofCord.getConfig("messageEncryption");

	if (!meEnabled) return;

	// @ts-expect-error
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

	Common.FluxDispatcher.dispatch = function (payload) {
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

// biome-ignore lint/suspicious/noExplicitAny: Discord territory
function handleFluxDispatch(dispatch: any) {
	// biome-ignore lint/suspicious/noExplicitAny: Discord territory
	const decryptAll = (messages: any[]) => {
		for (const msg of messages) {
			if (msg.content) msg.content = GoofCord.decryptMessage(msg.content);
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
