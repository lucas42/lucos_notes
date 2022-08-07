import EditElement from './edit-element.js';
import ControlButton from './control-button.js';

async function editList(slug, oldName, oldIcon) {
	const name = window.prompt("List Name", oldName || slug);
	if (name === null) return;
	const icon = window.prompt("Icon", oldIcon || "📋");
	if (icon === null) return;

	// TODO: show loading spinner/hold screen
	const resp = await fetch('/api/list/'+encodeURIComponent(slug), {
		method: 'PUT',
		headers: {
			'Content-Type': "application/json",
		},
		body: JSON.stringify({ name, icon }),
	});
	if (resp.ok) {
		location.reload();
	} else {
		alert("Failed to update List");
	}
}

class EditListElement extends EditElement {
	constructor() {
		super();
		const component = this;

		component.addEventListener('click', async () => {
			await editList(component.getAttribute('slug'), component.getAttribute('name'));
		});
	}
}

customElements.define('edit-list', EditListElement);


class NewListButton extends ControlButton {
	constructor() {
		super("New List");

		this.addEventListener("click", async () => {
			const slug = window.prompt("List Slug");
			if (!slug) return console.warn("no slug given, giving up");
			await editList(slug);
		});
	}
}

customElements.define('new-list-button', NewListButton);
