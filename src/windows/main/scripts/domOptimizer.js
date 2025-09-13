function optimize(orig) {
    const delayedClasses = ["activity", "gif", "avatar", "imagePlaceholder", "hoverBar"];

    return function (...args) {
        const element = args[0];
        //console.log(element);

        if (typeof element?.className === "string") {
            if (delayedClasses.some(partial => element.className.includes(partial))) {
                //console.log("DELAYED", element.className);
                setTimeout(() => orig.apply(this, args), 100 - Math.random() * 50);
                return;
            }
        }
        return orig.apply(this, args);
    };
}
Element.prototype.removeChild = optimize(Element.prototype.removeChild);