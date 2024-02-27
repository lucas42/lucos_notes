import ControlButton from './control-button.js';


async function deleteList(slug) {
	// TODO: show loading spinner/hold screen
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


class DeleteListButton extends ControlButton {
	constructor() {
		super("Delete List");
		const component = this;

		component.addEventListener("click", async () => {
			if (!component.getAttribute('empty') && !window.confirm("This list still contains items.  Are you sure you want to delete it?")) return;
			shadow.dataset.loading = true;
			await deleteList(component.getAttribute('slug'));
		});
	}
}

customElements.define('delete-list-button', DeleteListButton);
