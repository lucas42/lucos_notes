import AbstractInlineButton from './abstract-inline-button.js';
import AbstractControlButton from './abstract-control-button.js';
import AbstractPrompt from './abstract-prompt.js';
import { v4 as uuidv4 } from 'uuid';
const dataUpdates = new BroadcastChannel("data_updates");

async function deleteItem(uuid) {
	const resp = await fetch('/api/item/'+encodeURIComponent(uuid), {
		method: 'DELETE',
		headers: {
			'Content-Type': "application/json",
		},
	});
	if (!resp.ok) {
		alert("Failed to delete Item");

	// Normally the Service Worker sends the update message, but if the response isn't served by the SW, that needs doing here
	} else if (resp.status != 202) {
		dataUpdates.postMessage({method: 'DELETE', path: '/api/item/'+encodeURIComponent(uuid), body:null, hardDelete: true});
	}
}

class EditItemElement extends AbstractInlineButton {
	constructor() {
		super();
		const component = this;
		component.addEventListener('click', async () => {
			component.dataset.loading = true;
			const prompt = new ItemPrompt(component.getAttribute('uuid'), component.getAttribute('list'), component.getAttribute('name'), component.getAttribute('url'));
			document.body.append(prompt);
			delete component.dataset.loading;
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
			const prompt = new ItemPrompt(uuidv4(), component.getAttribute('list'));
			document.body.append(prompt);
			delete component.dataset.loading;
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
			delete component.dataset.loading;
		});
	}
}
customElements.define('delete-item-button', DeleteItemButton);

class ItemPrompt extends AbstractPrompt {
	constructor(uuid, list, name, url) {
		const heading = name ? "Edit Item" : "Add Item";
		const fields = [
			{name: 'uuid', value: uuid, type: 'hidden'},
			{name: 'list', value: list, type: 'hidden'},
			{name: 'name', value: name},
			{name: 'url', value: url},
		];
		super(heading, fields);
		const component = this;
	}
	async save(data) {
		if (!data.get('uuid')) return;
		if (!data.get('list')) return;
		if (!data.get('name')) return;
		const path = `/api/item/${encodeURIComponent(data.get('uuid'))}`;
		const body = JSON.stringify({
			name: data.get('name'),
			url: data.get('url'),
			list: data.get('list'),
		});
		const resp = await fetch(path, {
			method: 'PUT',
			headers: {
				'Content-Type': "application/json",
			},
			body,
		});
		if (!resp.ok) {
			alert("Failed to update Item");

		// Normally the Service Worker sends the update message, but if the response isn't served by the SW, that needs doing here
		} else if (resp.status != 202) {
			dataUpdates.postMessage({method: 'PUT', path, body, hardDelete: true});
		}
	}

}
customElements.define('item-prompt', ItemPrompt);
