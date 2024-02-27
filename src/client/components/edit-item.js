import EditElement from './edit-element.js';
import ControlButton from './control-button.js';
import { v4 as uuidv4 } from 'uuid';

async function editItem(uuid, list, oldName, oldUrl) {
	const name = window.prompt("Item", oldName);
	if (name === null) return;
	const url = window.prompt("URL", oldUrl);
	if (url === null) return;
	const resp = await fetch('/api/item/'+encodeURIComponent(uuid), {
		method: 'PUT',
		headers: {
			'Content-Type': "application/json",
		},
		body: JSON.stringify({ name, url, list }),
	});
	if (resp.ok) {
		location.reload();
	} else {
		alert("Failed to update Item");
	}
}

class EditItemElement extends EditElement {
	constructor() {
		super();
		const component = this;
		component.addEventListener('click', async () => {
			component.dataset.loading = true;
			await editItem(component.getAttribute('uuid'), component.getAttribute('list'), component.getAttribute('name'), component.getAttribute('url'));
		});
	}
}
customElements.define('edit-item', EditItemElement);


class NewItemButton extends ControlButton {
	constructor() {
		super("Add Item");
		const component = this;
		this.addEventListener("click", async () => {
			component.dataset.loading = true;
			await editItem(uuidv4(), component.getAttribute('list'));
		});
	}
}
customElements.define('new-item-button', NewItemButton);
