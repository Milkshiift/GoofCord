export function fixNotifications() {
	const originalSetter = Object.getOwnPropertyDescriptor(Notification.prototype, "onclick")?.set;
	Object.defineProperty(Notification.prototype, "onclick", {
		set(onClick) {
			originalSetter?.call(this, (...args: unknown[]) => {
				onClick.apply(this, args);
				window.goofcord.window.show();
			});
		},
		configurable: true,
	});
}
