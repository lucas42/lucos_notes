export default class AbstractControlButton extends HTMLElement {
	constructor(label) {
		super();
		if (this.constructor == AbstractControlButton) throw new Error("Abstract class shouldn't be instantiated");
		const shadow = this.attachShadow({mode: 'open'});

		const style = document.createElement('style');
		style.textContent = `
			:host {
				background-color: black;
				background-image: linear-gradient(rgba(255, 255, 255, 0.4) 10%, transparent 85%, transparent 100%);
				color: #fff;
				border-radius: 1em;
				padding: 0 1em;
				margin: 2px 5px;
				font-family: 'Reenie Beanie', Textile, cursive;
				font-size: 25px;
				font-weight: bold;
				border: none;
				cursor: pointer;
				white-space: nowrap;
			}
			:host(:active) {
				background-image: linear-gradient(transparent 0, transparent 15%, rgba(255, 255, 255, 0.4) 90%);
			}
			:host-context([data-loading]) {
				animation: diagonal_move 2s linear infinite;
				background-image: linear-gradient(-45deg, #444, #444, #000, #444, #444);
				background-position: bottom right;
				background-size: 400% 400%;
			}
			@keyframes diagonal_move {
				100% {
					background-position: top left;
				}
			}
		`;

		shadow.append(style);
		shadow.append(document.createTextNode(label));
	}
}