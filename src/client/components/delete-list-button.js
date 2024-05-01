import AbstractControlButton from './abstract-control-button.js';

async function deleteList(slug) {
	const resp = await fetch('/api/list/'+encodeURIComponent(slug), {
		method: 'DELETE',
		headers: {
			'Content-Type': "application/json",
		},
	});
	if (resp.ok) {
		location.href = '/';
	} else {
		alert("Failed to delete List");
	}
}


class DeleteListButton extends AbstractControlButton {
	constructor() {
		super("Delete List");
		const component = this;

		component.addEventListener("click", async () => {
			if (!component.getAttribute('empty') && !window.confirm("This list still contains items.  Are you sure you want to delete it?")) return;
			component.dataset.loading = true;
			await deleteList(component.getAttribute('slug'));
		});
	}
}

customElements.define('delete-list-button', DeleteListButton);
