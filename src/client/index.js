import './components/lucos-navbar.js';
import './load-service-worker.js';
import { editListButton, newListButton } from './edit-list.js';

function initControls() {
	const controls = document.createElement("div");
	controls.id = "controls";

	if (document.body.dataset["type"] == "listoflists") {
		newListButton(controls);
	}

	document.body.append(controls);
}
initControls();


if (document.body.dataset["type"] == "listoflists") {
	document.querySelectorAll(".list").forEach(editListButton);
}