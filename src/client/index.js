import './components/lucos-navbar.js';
import './load-service-worker.js';

let controls = document.createElement("div");
controls.id = "controls";
document.body.append(controls);


async function newList() {
	const slug = window.prompt("List Slug");
	if (!slug) return console.warn("no slug given, giving up");
	const name = window.prompt("List Name");
	await fetch('/api/list/'+encodeURIComponent(slug), {
		method: 'PUT',
		headers: {
			'Content-Type': "application/json",
		},
		body: JSON.stringify({ name }),
	});
}

if (document.body.dataset["type"] == "listoflists") {
	let newListButton = document.createElement("button");
	newListButton.append(document.createTextNode("New List"));
	newListButton.addEventListener("click", newList);
	controls.append(newListButton)
}