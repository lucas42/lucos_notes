const TEMPLATE_CACHE = 'templates-v1';
const TEMPLATE_PATH = '/templates/';
import mustache from "mustache";


export async function fetchTemplates() {
	const cache = await caches.open(TEMPLATE_CACHE);
	await cache.addAll([
		TEMPLATE_PATH + "index.mustache",
		TEMPLATE_PATH + "list.mustache",
		TEMPLATE_PATH + "error.mustache",
	]);
}

export async function getTemplate(templateid) {
	const cache = await caches.open(TEMPLATE_CACHE);
	const request = new Request(TEMPLATE_PATH + templateid + '.mustache');
	const response = await cache.match(request);
	return response.text();
}

export async function populateTemplate(templateid, data) {
	const template = await(getTemplate(templateid));
	const html = mustache.render(template, data);
	return new Response(html,{headers:{'Content-Type':'text/html'}});
}