const RESOURCE_CACHE = 'resources-v1';
const localUrls = [
	'/icon.png',
	'/style.css',
	'/client.js',
	'/ReenieBeanie.ttf',
];
const crossDomainUrls = [
	'https://l42.eu/logo.png',
];
export default async function refresh() {
	try {
		const cache = await caches.open(RESOURCE_CACHE);
		await cache.addAll(localUrls);

		// `addAll` doesn't work for URLs which need a `no-cors` request
		// Instead need to fetch them individually and call `put`
		Promise.all(crossDomainUrls.map(async url => {
			const request = new Request(url, {mode: 'no-cors'})
			const response = await fetch(request);
			await cache.put(request, response);
		}));
	} catch (error) {
		console.error("Failed to cache resources:", error.message);
	}
}