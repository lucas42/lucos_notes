import AbstractInlineButton from './abstract-inline-button.js';
import AbstractControlButton from './abstract-control-button.js';
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

async function deleteItem(uuid) {
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

class EditItemElement extends AbstractInlineButton {
	constructor() {
		super();
		const component = this;
		component.addEventListener('click', async () => {
			component.dataset.loading = true;
			await editItem(component.getAttribute('uuid'), component.getAttribute('list'), component.getAttribute('name'), component.getAttribute('url'));
		});
	}
}
customElements.define('edit-item-button', EditItemElement);


class NewItemButton extends AbstractControlButton {
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

class DeleteItemButton extends AbstractInlineButton {
	constructor() {
		super("⌦", "#700", "#700");
		const component = this;
		component.addEventListener('click', async () => {
			component.dataset.loading = true;
			await deleteItem(component.getAttribute('uuid'));
		});
	}
}
customElements.define('delete-item-button', DeleteItemButton);
