import './components/lucos-navbar.js';
import './load-service-worker.js';
import { editListButton, newListButton } from './edit-list.js';
import { editItemButton, newItemButton } from './edit-item.js';

function initControls() {
	const controls = document.createElement("div");
	controls.id = "controls";

	if (document.body.dataset["type"] === "listoflists") {
		newListButton(controls);
	}
	if (document.body.dataset["type"] === "list") {
		newItemButton(controls);
	}

	document.body.append(controls);
}
initControls();


if (document.body.dataset["type"] === "listoflists") {
	document.querySelectorAll(".list").forEach(editListButton);
}
if (document.body.dataset["type"] === "list") {
	document.querySelectorAll(".item").forEach(editItemButton);
}