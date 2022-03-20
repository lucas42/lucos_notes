import './components/lucos-navbar.js';
import './load-service-worker.js';

let controls = document.createElement("div");
controls.id = "controls";
document.body.append(controls);


function newList() {
	alert("TODO: new list");
}

if (document.body.dataset["type"] == "listoflists") {
	let newListButton = document.createElement("button");
	newListButton.append(document.createTextNode("New List"));
	newListButton.addEventListener("click", newList);
	controls.append(newListButton)
}