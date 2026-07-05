const CONFIG_CACHE = 'config-v1';
const CONFIG_URL = '/config.json';

/**
 * Caches the global template context (currently just aithne_origin) that the
 * server injects into every server-rendered page via res.locals. Run as its
 * own non-throwing step (mirrors the try/catch in static-resources.js),
 * separate from the atomic template/resource cache.addAll batches, so a
 * config fetch hiccup can never break service worker install.
 */
export default async function refresh() {
	try {
		const cache = await caches.open(CONFIG_CACHE);
		await cache.addAll([CONFIG_URL]);
	} catch (error) {
		console.error("Failed to cache config:", error.message);
	}
}

/**
 * Reads the cached global config for use in the SW render path
 * (see populateTemplate in templates.js). Returns {} if nothing is cached
 * yet (e.g. the very first install's fetch failed while offline), so callers
 * can safely merge the result without a null check.
 */
export async function getConfig() {
	const cache = await caches.open(CONFIG_CACHE);
	const response = await cache.match(CONFIG_URL);
	if (!response) return {};
	return response.json();
}
