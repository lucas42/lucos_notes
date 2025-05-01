import AbstractInlineButton from './abstract-inline-button.js';
import AbstractControlButton from './abstract-control-button.js';
import AbstractPrompt from './abstract-prompt.js';
import { deleteItem } from './item-components.js';
import { v4 as uuidv4 } from 'uuid';
const dataUpdates = new BroadcastChannel("data_updates");

class EditPhraseElement extends AbstractInlineButton {
	constructor() {
		super();
		const component = this;
		component.addEventListener('click', async () => {
			component.dataset.loading = true;
			const prompt = new PhrasePrompt(component.getAttribute('uuid'), component.getAttribute('list'), component.getAttribute('name'), component.getAttribute('translation'));
			document.body.append(prompt);
			delete component.dataset.loading;
		});
	}
}
customElements.define('edit-phrase-button', EditPhraseElement);


class NewPhraseButton extends AbstractControlButton {
	constructor() {
		super("Add Phrase");
		const component = this;
		this.addEventListener("click", async () => {
			component.dataset.loading = true;
			const prompt = new PhrasePrompt(uuidv4(), component.getAttribute('list'));
			document.body.append(prompt);
			delete component.dataset.loading;
		});
	}
}
customElements.define('new-phrase-button', NewPhraseButton);

class DeletePhraseButton extends AbstractInlineButton {
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
customElements.define('delete-phrase-button', DeletePhraseButton);

class PhrasePrompt extends AbstractPrompt {
	constructor(uuid, list, name, translation) {
		const heading = name ? "Edit Phrase" : "Add Phrase";
		const fields = [
			{name: 'uuid', value: uuid, type: 'hidden'},
			{name: 'list', value: list, type: 'hidden'},
			{name: 'name', value: name},
			{name: 'translation', value: translation},
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
			translation: data.get('translation'),
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
customElements.define('phrase-prompt', PhrasePrompt);
