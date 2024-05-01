import AbstractInlineButton from './abstract-inline-button.js';
import { v4 as uuidv4 } from 'uuid';

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
