import AbstractInlineButton from './abstract-inline-button.js';
import AbstractControlButton from './abstract-control-button.js';
const dataUpdates = new BroadcastChannel("data_updates");


async function editList(slug, oldName, oldIcon) {
	const name = window.prompt("List Name", oldName || slug);
	if (name === null) return;
	const icon = window.prompt("Icon", oldIcon || "📋");
	if (icon === null) return;
	const resp = await fetch('/api/list/'+encodeURIComponent(slug), {
		method: 'PUT',
		headers: {
			'Content-Type': "application/json",
		},
		body: JSON.stringify({ name, icon }),
	});
	if (!resp.ok) {
		alert("Failed to update List");

	// Normally the Service Worker sends the update message, but if the response isn't served by the SW, that needs doing here
	} else if (resp.status != 202) {
		dataUpdates.postMessage({method: 'PUT', path: '/api/list/'+encodeURIComponent(slug), body:JSON.stringify({ name, icon }), hardDelete: true});
	}
}

async function deleteList(slug) {
	const resp = await fetch('/api/list/'+encodeURIComponent(slug), {
		method: 'DELETE',
		headers: {
			'Content-Type': "application/json",
		},
	});
	if (!resp.ok) {
		alert("Failed to delete List");

	// Normally the Service Worker sends the update message, but if the response isn't served by the SW, that needs doing here
	} else if (resp.status != 202) {
		dataUpdates.postMessage({method: 'DELETE', path: '/api/list/'+encodeURIComponent(slug), body:null, hardDelete: true});
	}
}

class EditListElement extends AbstractInlineButton {
	constructor() {
		super();
		const component = this;
		component.addEventListener('click', async () => {
			component.dataset.loading = true;
			await editList(component.getAttribute('slug'), component.getAttribute('name'), component.getAttribute('icon'));
			delete component.dataset.loading;
		});
	}
}
customElements.define('edit-list-button', EditListElement);

class NewListButton extends AbstractControlButton {
	constructor() {
		super("New List");
		const component = this;
		this.addEventListener("click", async () => {
			const slug = window.prompt("List Slug");
			if (!slug) return console.warn("no slug given, giving up");
			component.dataset.loading = true;
			await editList(slug);
			delete component.dataset.loading;
		});
	}
}
customElements.define('new-list-button', NewListButton);

class DeleteListButton extends AbstractControlButton {
	constructor() {
		super("Delete List");
		const component = this;
		component.addEventListener("click", async () => {
			if (!component.getAttribute('empty') && !window.confirm("This list still contains items.  Are you sure you want to delete it?")) return;
			component.dataset.loading = true;
			await deleteList(component.getAttribute('slug'));
			delete component.dataset.loading;
		});
	}
}
customElements.define('delete-list-button', DeleteListButton);
