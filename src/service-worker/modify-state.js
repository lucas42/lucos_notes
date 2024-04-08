import { getOutstandingRequests } from 'restful-queue';

const dataUpdates = new BroadcastChannel("data_updates");

export async function modifyStateWithOutstandingRequests(state) {
	const outstandingRequests = await getOutstandingRequests();
	for (const request of outstandingRequests) {
		await modifyStateWithRequest(state, request);
	}
}

export async function modifyStateWithRequest(state, request) {
	let body = null;
	if (request.method === 'PUT') {
		body = await request.json();
	}
	const url = new URL(request.url);
	return modifyState(state, request.method, url.pathname, body, false);
}

export async function modifyState(state, method, pathname, body, hardDelete) {
	const urlparts = pathname.split('/');
	urlparts.shift(); //pathname always starts with a slash, so ignore first part.
	const component = urlparts.shift();
	if (component !== 'api') throw new Error("Can only modify state from API requests");

	const objectType = urlparts.shift();
	switch(objectType) {
		case 'list':
			const slug = urlparts.shift();
			if (method === 'PUT') {
				await state.setList(slug, body);
			} else if (method === 'DELETE') {
				await state.deleteList(slug, hardDelete);
			} else {
				throw new Error(`Unsupported method for lists ${method}`);
			}
			break;
		case 'item':
			const uuid = urlparts.shift();
			if (method === 'PUT') {
				await state.setItem(uuid, body);
			} else if (method === 'DELETE') {
				await state.deleteItem(uuid, hardDelete);
			} else {
				throw new Error(`Unsupported method for items ${method}`);
			}
			break;
		default:
			throw new Error(`Unknown type ${objectType}`);
	}
	dataUpdates.postMessage({method, path: pathname, body, hardDelete});
}