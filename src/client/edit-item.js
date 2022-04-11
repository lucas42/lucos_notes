import { v4 as uuidv4 } from 'uuid';

async function editItem(uuid, list, oldName, oldUrl) {
	const name = window.prompt("Item", oldName);
	if (name === null) return;
	const url = window.prompt("URL", oldUrl);
	if (url === null) return;
	const resp = await fetch('/api/item/'+encodeURIComponent(uuid), {
		method: 'PUT',
		headers: {
			'Content-Type': "application/json",
		},
		body: JSON.stringify({ name, url, list }),
	});
	if (!resp.ok) {
		alert("Failed to update Item");
	}
}

export function newItemButton(parentElement) {
	const button = document.createElement("button");
	button.append(document.createTextNode("Add Item"));
	button.addEventListener("click", async () => {
		await editItem(uuidv4());
	});
	parentElement.append(button);
}


export function editItemButton(itemNode) {
	const pencil = document.createElement("span");
	pencil.className = 'pencil';
	pencil.append(document.createTextNode("✎"));
	pencil.addEventListener('click', async () => {
		await editItem(itemNode.dataset.uuid, itemNode.dataset.list, itemNode.dataset.name, itemNode.dataset.url);
	});
	itemNode.prepend(pencil);
}
