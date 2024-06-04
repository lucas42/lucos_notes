export default class AbstractPrompt extends HTMLElement {
	constructor(header, fields = []) {
		super();
		if (this.constructor == AbstractPrompt) throw new Error("Abstract class shouldn't be instantiated");
		const component = this;
		const shadow = component.attachShadow({mode: 'open'});

		const style = document.createElement('style');
		style.textContent = `
			.background {
				position: absolute;
				top: 0;
				bottom: 0;
				left: 0;
				right: 0;
				background-color: rgba(0,0,0,0.2);
				cursor: not-allowed;
			}
			.overlay {
				position: absolute;
				top: 3em;
				left: 3em;
				right: 3em;
				background: rgb(100, 55, 25, 0.8);
				border-radius: 5px;
				max-width: 500px;
				margin: auto;
			}
			h3 {
				background-color: #211;
				background-image: linear-gradient(rgba(255, 255, 255, 0.4) 10%, transparent 85%, transparent 100%);
				margin: 0;
				padding: 2px 15px;
				border-radius: 5px 5px 0 0;
			}
			form {
				padding: 10px;
				border: solid #211 1px;
				border-radius: 0 0 5px 5px;
			}
			form label {
				display: block;
				text-transform: capitalize;
			}
			form label > input {
				margin: 5px 10px;
			}
			form input[type=submit] {
				background-color: #211;
				background-image: linear-gradient(rgba(255, 255, 255, 0.4) 10%, transparent 85%, transparent 100%);
				color: #fff;
				border-radius: 1em;
				padding: 0 1em;
				font-family: 'Reenie Beanie', Textile, cursive;
				font-size: 25px;
				font-weight: bold;
				border: none;
				white-space: nowrap;
				display: block;
				margin: 0 10px 0 auto;
			}
			form input[type=submit]:active {
				background-image: linear-gradient(transparent 0, transparent 15%, rgba(255, 255, 255, 0.4) 90%);
			}
		`;

		shadow.append(style);
		const background = document.createElement("div");
		background.classList.add("background");
		background.addEventListener("click", () => {
			component.remove();
		})
		shadow.append(background);
		const overlay = document.createElement("div");
		overlay.classList.add("overlay");
		const headerNode = document.createElement("h3");
		headerNode.append(document.createTextNode(header));
		overlay.append(headerNode);
		const form = document.createElement("form");
		for (const field of fields) {
			const input = document.createElement("input");
			input.name = field.name;
			if (field.value) input.value = field.value;
			input.type = field.type || "text";
			if (input.type == "hidden") {
				form.append(input);
			} else {
				const label = document.createElement("label");
				label.append(document.createTextNode(field.label || field.name));
				label.append(input);
				form.append(label);
			}
		}
		const saveNode = document.createElement("input");
		saveNode.type = 'submit';
		saveNode.value = 'Save';
		form.append(saveNode);
		overlay.append(form);
		shadow.append(overlay);

		form.addEventListener("submit", event => {
			const data = new FormData(event.target);
			event.preventDefault();
			component.save(data);
			component.remove();
		});

		// Close the component when escape button is pressed
		document.addEventListener('keyup', e => {
			if (e.key === "Escape") component.remove();
		}, false);
	}
	connectedCallback() {
		this.shadowRoot.querySelector("label > input").focus();
	}
	save() {
		throw new Error("save() function not defined");
	}
}