const RESOURCE_CACHE = 'resources-v1';
const CONFIG_URL = '/config.json';
const localUrls = [
	'/icon.png',
	'/style.css',
	'/client.js',
	'/ReenieBeanie.ttf',
	'/manifest.json',
	CONFIG_URL,
];
export default async function refresh() {
	try {
		const cache = await caches.open(RESOURCE_CACHE);
		await cache.addAll(localUrls);
	} catch (error) {
		console.error("Failed to cache resources:", error.message);
	}
}

/**
 * Reads the cached global template context (currently just aithne_origin)
 * that the server injects into every server-rendered page via res.locals —
 * used by the SW render path (see populateTemplate in templates.js) so it
 * has the same globals available as a server render, even offline. Returns
 * {} if nothing is cached yet (e.g. the very first install's fetch failed
 * while offline), so callers can safely merge the result without a null
 * check.
 */
export async function getConfig() {
	const cache = await caches.open(RESOURCE_CACHE);
	const response = await cache.match(CONFIG_URL);
	if (!response) return {};
	return response.json();
}