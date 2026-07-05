const TEMPLATE_CACHE = 'templates-v1';
const TEMPLATE_PATH = '/templates/';
import mustache from "mustache";
import { getConfig } from './config.js';


export async function fetchTemplates() {
	const cache = await caches.open(TEMPLATE_CACHE);
	await cache.addAll([
		TEMPLATE_PATH + "page.mustache",
		TEMPLATE_PATH + "listoflists.mustache",
		TEMPLATE_PATH + "list.mustache",
		TEMPLATE_PATH + "phrasebook.mustache",
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
	const [listTemplate, phrasebookTemplate, listoflistsTemplate, errorTemplate] = await Promise.all([
		getTemplate('list'),
		getTemplate('phrasebook'),
		getTemplate('listoflists'),
		getTemplate('error'),
	]);
	return {
		'list': listTemplate,
		'phrasebook': phrasebookTemplate,
		'listoflists': listoflistsTemplate,
		'error': errorTemplate,
	}
}

export async function populateTemplate(data) {
	const template = await getTemplate("page");
	const config = await getConfig();
	if (!config.aithne_origin) {
		// Fail loud: a silently empty aithne-origin means the navbar's session
		// keepalive never fires and the user gets bounced to login ~15 minutes
		// in with no visible cause (see #447).
		console.warn("populateTemplate: config cache miss - aithne_origin unavailable, navbar keepalive will not fire");
	}
	// config first, so page-specific data wins on any key collision.
	const html = mustache.render(template, {...config, ...data}, await getAllTemplates());
	return new Response(html,{headers:{'Content-Type':'text/html'}});
}