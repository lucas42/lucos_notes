import ControlButton from './control-button.js';

async function syncData() {
	// TODO: some sort of visual feedback of what's happening

	// Call an API function which only exists on the service worker
	// Hopefully this button only appears when there's a service worker loaded, as otherwise it's not much use anyway
	const resp = await fetch('/sync', {
		method: 'POST',
	});
	if (!resp.ok) {
		alert(`Sync failed: ${resp.statusText}`);
	}
}



class SyncButton extends ControlButton {
	constructor() {
		super("Sync Data");
		const component = this;
		this.addEventListener("click", async () => {
			await syncData();
		});
	}
}
customElements.define('sync-button', SyncButton);
