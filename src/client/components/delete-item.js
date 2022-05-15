import EditElement from './edit-element.js';
import ControlButton from './control-button.js';
import { v4 as uuidv4 } from 'uuid';

async function deleteItem(uuid) {
	// TODO: show loading spinner/hold screen
	const resp = await fetch('/api/item/'+encodeURIComponent(uuid), {
		method: 'DELETE',
		headers: {
			'Content-Type': "application/json",
		},
	});
	if (resp.ok) {
		location.reload();
	} else {
		alert("Failed to delete Item");
	}
}

class DeleteItemElement extends HTMLElement {
	constructor() {
		super();
		const component = this;
		const shadow = component.attachShadow({mode: 'closed'});

		const style = document.createElement('style');
		style.textContent = `
			:host {
				cursor: pointer;
				color: #99a;
			}
			:host(:hover) {
				color: #700;
			}
		`;

		shadow.append(style);
		shadow.append(document.createTextNode("⌦"));
		component.addEventListener('click', async () => {
			await deleteItem(component.getAttribute('uuid'));
		});
	}
}
customElements.define('delete-item', DeleteItemElement);
