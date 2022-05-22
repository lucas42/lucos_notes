export default class ControlButton extends HTMLElement {
	constructor(label) {
		super();
		const shadow = this.attachShadow({mode: 'open'});

		const style = document.createElement('style');
		style.textContent = `
			:host {
				background-color: black;
				background-image: -webkit-gradient(linear, 0 100%, 0 0, color-stop(0, transparent), color-stop(0.15, transparent), color-stop(0.9, rgba(255, 255, 255, 0.4)));
				color: #fff;
				border-radius: 1em;
				padding: 0 1em;
				margin: 0 1em;
				font-family: 'Reenie Beanie', Textile, cursive;
				font-size: 25px;
				font-weight: bold;
				border: none;
				cursor: pointer;
			}
			:host(:active) {
				background-image: -webkit-gradient(linear, 0 0, 0 100%, color-stop(0, transparent), color-stop(0.15, transparent), color-stop(0.9, rgba(255, 255, 255, 0.4)));
			}
		`;

		shadow.append(style);
		shadow.append(document.createTextNode(label));
	}
}