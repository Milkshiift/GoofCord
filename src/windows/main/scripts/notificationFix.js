(() => {
    const originalSetter = Object.getOwnPropertyDescriptor(Notification.prototype, "onclick").set;
    Object.defineProperty(Notification.prototype, "onclick", {
        set(onClick) {
            originalSetter.call(this, function() {
                onClick.apply(this, arguments);
                goofcord.window.show();
            })
        },
        configurable: true
    });
})();