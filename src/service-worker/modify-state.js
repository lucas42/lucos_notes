import { getOutstandingRequests } from './restful-queue.js';

export async function modifyStateWithOutstandingRequests(state) {
	const outstandingRequests = await getOutstandingRequests();
	for (const request of outstandingRequests) {
		await modifyStateWithRequest(state, request)
	}
}

export async function modifyStateWithRequest(state, request) {
	const url = new URL(request.url);
	const urlparts = url.pathname.split('/');
	urlparts.shift(); //pathname always starts with a slash, so ignore first part.
	const component = urlparts.shift();
	if (component !== 'api') throw new Error("Can only modify state from API requests");

	const objectType = urlparts.shift();
	switch(objectType) {
		case 'list':
			const slug = urlparts.shift();
			if (request.method === 'PUT') {
				return state.setList(slug, await request.json());
			} else {
				throw new Error(`Unsupported method for lists ${request.method}`);
			}
			break;
		case 'item':
			const uuid = urlparts.shift();
			if (request.method === 'PUT') {
				return state.setItem(uuid, await request.json());
			} else {
				throw new Error(`Unsupported method for items ${request.method}`);
			}
			break;
		case 'sync':
			// Inert call to trigger syncRequests() being called without side-effects
			break;
		default:
			throw new Error(`Unknown type ${objectType}`);
	}
}