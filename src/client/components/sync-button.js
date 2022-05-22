import ControlButton from './control-button.js';



class SyncButton extends ControlButton {
	constructor() {

		// If there's no service worker, then this button is pointless, so bail early
		if (!navigator.serviceWorker.controller) return;
		super("Sync Data");
		const component = this;

		const style = document.createElement('style');
		style.textContent = `
			@keyframes spin {
				from { transform:rotate(0deg); }
				to { transform:rotate(360deg); }
			}
			.spinner {
				display: inline-block;
				margin-left: 0.5em;   /* Don't get too close to button text */
				padding-bottom: 4px;  /* Needed to centre the rotation in the middle of the spinner */
				font-weight: normal;
				animation: spin 1.25s linear infinite;
				animation-play-state: paused; /* Pause the play state so that when load is complete, there's no jerk back to original position */
			}
			.spinner.loading  {
				animation-play-state: running;
			}
		`;

		component.shadowRoot.append(style);
		const spinner = document.createElement("span");
		spinner.append(document.createTextNode("↻"));
		spinner.classList.add("spinner");
		component.shadowRoot.append(spinner);
		component.addEventListener("click", async () => {
			spinner.classList.add("loading");

			// Call an API function which only exists on the service worker
			const resp = await fetch('/sync', {
				method: 'POST',
			});
			spinner.classList.remove("loading");
			if (!resp.ok) {
				alert(`Sync failed: ${resp.statusText}`);
			}
		});

		// Every time the device comes back online, do a sync
		window.addEventListener("online", () => {
			component.click();
		})
	}
}
customElements.define('sync-button', SyncButton);
