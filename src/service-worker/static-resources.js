const RESOURCE_CACHE = 'resources-v1';
const localUrls = [
	'/icon.png',
	'/style.css',
	'/client.js',
	'/ReenieBeanie.ttf',
];
export default async function refresh() {
	try {
		const cache = await caches.open(RESOURCE_CACHE);
		await cache.addAll(localUrls);
	} catch (error) {
		console.error("Failed to cache resources:", error.message);
	}
}