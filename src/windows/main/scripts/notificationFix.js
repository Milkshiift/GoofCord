(() => {
    const originalSetter = Object.getOwnPropertyDescriptor(Notification.prototype, "onclick").set;
    Object.defineProperty(Notification.prototype, "onclick", {
        set(onClick) {
            originalSetter.call(this, (...args) => {
                onClick.apply(this, args);
                goofcord.window.show();
            })
        },
        configurable: true
    });
})();
