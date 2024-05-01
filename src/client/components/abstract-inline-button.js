export default class AbstractInlineButton extends HTMLElement {
	constructor(icon = "✎", hoverColour = "#007", loadingColour = "#08a") {
		super();
		if (this.constructor == AbstractInlineButton) throw new Error("Abstract class shouldn't be instantiated");
		const shadow = this.attachShadow({mode: 'closed'});

		const style = document.createElement('style');
		style.textContent = `
			:host {
				cursor: pointer;
				color: #99a;
			}
			:host(:hover) {
				color: ${hoverColour};
			}
			:host-context([data-loading]) {
				animation: diagonal_move 4s linear infinite;
				background-clip: text;
				background-image: radial-gradient(#99a, ${loadingColour});
				background-position: 0;
				color: transparent;
			}
			@keyframes diagonal_move {
				100% {
					background-position: 100px;
				}
			}
		`;

		shadow.append(style);
		shadow.append(document.createTextNode(icon));
	}
}
