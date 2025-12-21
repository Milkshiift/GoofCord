// biome-ignore lint/suspicious/noExplicitAny: It's Discord's code
let GuildReadStateStore: any;
// biome-ignore lint/suspicious/noExplicitAny: It's Discord's code
let RelationshipStore: any;

export function initDynamicIcon() {
	RelationshipStore = window.Vencord.Webpack.Common.RelationshipStore;
	GuildReadStateStore = window.Vencord.Webpack.findStore("GuildReadStateStore");
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
			// Unread
			totalCount = -1;
		}

		void window.goofcord.setBadgeCount(totalCount);
	} catch (e) {
		console.error(e);
	}
}
