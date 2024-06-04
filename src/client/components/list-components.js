import AbstractInlineButton from './abstract-inline-button.js';
import AbstractControlButton from './abstract-control-button.js';
import AbstractPrompt from './abstract-prompt.js';
const dataUpdates = new BroadcastChannel("data_updates");

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
			const prompt = new ListPrompt(component.getAttribute('slug'), component.getAttribute('name'), component.getAttribute('icon'));
			document.body.append(prompt);
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
			component.dataset.loading = true;
			const prompt = new ListPrompt();
			document.body.append(prompt);
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

class ListPrompt extends AbstractPrompt {
	constructor(slug, name, icon) {
		const heading = name ? "Edit List" : "Add List";
		const fields = [
			{name: 'slug', value: slug, type: slug ? "hidden":"text"},
			{name: 'name', value: name},
			{name: 'icon', value: icon},
		];
		super(heading, fields);
		const component = this;
	}
	async save(data) {
		if (!data.get('slug')) return;
		if (!data.get('name')) data.set('name', data.get('slug'));
		const path = `/api/list/${encodeURIComponent(data.get('slug'))}`;
		const body = JSON.stringify({
			name: data.get('name'),
			icon: data.get('icon'),
		});
		const resp = await fetch(path, {
			method: 'PUT',
			headers: {
				'Content-Type': "application/json",
			},
			body,
		});
		if (!resp.ok) {
			alert("Failed to update List");

		// Normally the Service Worker sends the update message, but if the response isn't served by the SW, that needs doing here
		} else if (resp.status != 202) {
			dataUpdates.postMessage({method: 'PUT', path, body, hardDelete: true});
		}
	}

}
customElements.define('list-prompt', ListPrompt);