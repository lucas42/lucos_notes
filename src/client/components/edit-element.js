export default class EditElement extends HTMLElement {
	constructor() {
		super();
		const shadow = this.attachShadow({mode: 'closed'});

		const style = document.createElement('style');
		style.textContent = `
			:host {
				cursor: pointer;
				color: #99a;
			}
			:host(:hover) {
				font-weight: bold;
				color: #007;
			}
			:host-context([data-loading]) {
				animation: diagonal_move 4s linear infinite;
				background-clip: text;
				background-image: radial-gradient(#99a, #08a);
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
		shadow.append(document.createTextNode("✎"));
	}
}
