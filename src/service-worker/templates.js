const TEMPLATE_CACHE = 'templates-v1';
const TEMPLATE_PATH = '/templates/';
import mustache from "mustache";


export async function fetchTemplates() {
	const cache = await caches.open(TEMPLATE_CACHE);
	await cache.addAll([
		TEMPLATE_PATH + "page.mustache",
		TEMPLATE_PATH + "listoflists.mustache",
		TEMPLATE_PATH + "list.mustache",
		TEMPLATE_PATH + "error.mustache",
	]);
}

async function getTemplate(templateid) {
	const cache = await caches.open(TEMPLATE_CACHE);
	const request = new Request(TEMPLATE_PATH + templateid + '.mustache');
	const response = await cache.match(request);
	return response.text();
}

async function getAllTemplates() {
	const [listTemplate, listoflistsTemplate, errorTemplate] = await Promise.all([
		getTemplate('list'),
		getTemplate('listoflists'),
		getTemplate('error'),
	]);
	return {
		'list': listTemplate,
		'listoflists': listoflistsTemplate,
		'error': errorTemplate,
	}
}

export async function populateTemplate(data) {
	const template = await getTemplate("page");
	const html = mustache.render(template, data, await getAllTemplates());
	return new Response(html,{headers:{'Content-Type':'text/html'}});
}