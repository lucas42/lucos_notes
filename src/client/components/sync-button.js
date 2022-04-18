import ControlButton from './control-button.js';

async function syncData() {
	// TODO: some sort of visual feedback of what's happening

	// Call an API function which doesn't do anything, as that'll trigger the service worker to try resyncing
	const resp = await fetch('/api/sync', {
		method: 'PUT',
	});
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
