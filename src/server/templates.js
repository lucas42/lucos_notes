import mustache from "mustache";
import { readFile } from 'fs/promises';

async function getTemplate(templateid) {
	return readFile(`templates/${templateid}.mustache`, { encoding: 'utf8' });
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

export default async function templateEngine(filePath, data, callback) {
	const template = await readFile(filePath, { encoding: 'utf8' });
	const html = mustache.render(template, data, await getAllTemplates());
	callback(null, html);
}