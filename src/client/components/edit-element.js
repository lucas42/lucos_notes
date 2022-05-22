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
		`;

		shadow.append(style);
		shadow.append(document.createTextNode("✎"));
	}
}
