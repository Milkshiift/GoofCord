export function startDomOptimizer() {
	if (!goofcord.getConfig("domOptimizer")) return;

	function optimize(orig: typeof Element.prototype.removeChild) {
		const delayedClasses = ["activity", "gif", "avatar", "imagePlaceholder", "hoverBar"];

		return function (this: Element, ...args: Parameters<typeof Element.prototype.removeChild>) {
			const element = args[0] as unknown as Element;
			//console.log(element);

			if (typeof element?.className === "string") {
				if (delayedClasses.some((partial) => element.className.includes(partial))) {
					//console.log("DELAYED", element.className);
					setTimeout(() => orig.apply(this, args), 100 - Math.random() * 50);
					return;
				}
			}
			return orig.apply(this, args);
		} as typeof Element.prototype.removeChild;
	}
	Element.prototype.removeChild = optimize(Element.prototype.removeChild);
}
