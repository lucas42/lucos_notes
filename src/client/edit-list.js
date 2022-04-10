
async function editList(slug, oldName) {
	const name = window.prompt("List Name", oldName || slug);
	if (name === null) return;
	await fetch('/api/list/'+encodeURIComponent(slug), {
		method: 'PUT',
		headers: {
			'Content-Type': "application/json",
		},
		body: JSON.stringify({ name }),
	});
}

export function newListButton(parentElement) {

	const button = document.createElement("button");
	button.append(document.createTextNode("New List"));
	button.addEventListener("click", async () => {
		const slug = window.prompt("List Slug");
		if (!slug) return console.warn("no slug given, giving up");
		await editList(slug);
	});
	parentElement.append(button);
}


export function editListButton(listNode) {
	const pencil = document.createElement("span");
	pencil.className = 'pencil';
	pencil.append(document.createTextNode("✎"));
	pencil.addEventListener('click', async () => {
		await editList(listNode.dataset.slug, listNode.dataset.name);
	});
	listNode.prepend(pencil);
}
