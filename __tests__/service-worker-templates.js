import { jest } from '@jest/globals';
import { populateTemplate } from '../src/service-worker/templates.js';

// The service worker's `caches` global isn't available in the jest 'node'
// test environment (same approach as __tests__/service-worker-static-resources.js),
// so each test stubs it directly. `templates.js` also constructs `new
// Request(relativeUrl)` internally, which Node's fetch implementation can't
// resolve without a base URL (there's no document to provide one, unlike in
// a real browser/service-worker) — so tests stub the global `Request` too,
// resolving relative URLs against a dummy origin. This only affects the
// test environment; production code is untouched.

const TEMPLATE_SOURCES = {
	'page.mustache': '<page aithne-origin="{{aithne_origin}}">{{#name}}{{name}}{{/name}}{{^name}}(no name){{/name}}{{> *pagetype}}</page>',
	'list.mustache': '<list/>',
	'phrasebook.mustache': '<phrasebook/>',
	'listoflists.mustache': '<listoflists/>',
	'error.mustache': '<error/>',
};

function installFakeRequest() {
	const RealRequest = global.Request;
	class FakeRequest extends RealRequest {
		constructor(input, init) {
			const resolved = typeof input === 'string' && input.startsWith('/') ? 'http://localhost' + input : input;
			super(resolved, init);
		}
	}
	global.Request = FakeRequest;
	return () => { global.Request = RealRequest; };
}

function installFakeCaches(configCachedResponse) {
	global.caches = {
		open: jest.fn(async (name) => {
			if (name === 'resources-v1') {
				return { match: jest.fn().mockResolvedValue(configCachedResponse) };
			}
			// templates-v1
			return {
				match: jest.fn(async (request) => {
					const filename = request.url.split('/').pop();
					const source = TEMPLATE_SOURCES[filename];
					if (!source) return undefined;
					return { text: async () => source };
				}),
			};
		}),
	};
}

describe('populateTemplate', () => {
	let restoreRequest;
	let consoleWarnSpy;

	beforeEach(() => {
		restoreRequest = installFakeRequest();
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		restoreRequest();
		delete global.caches;
		consoleWarnSpy.mockRestore();
	});

	test('merges cached config into the render context — aithne_origin reaches the page template', async () => {
		installFakeCaches({ json: async () => ({ aithne_origin: 'https://aithne.l42.eu' }) });

		const response = await populateTemplate({ name: 'My List', pagetype: 'list' });
		const html = await response.text();

		// mustache HTML-escapes interpolated values (matches production
		// page.mustache, which also uses plain {{aithne_origin}} rather than
		// the unescaped {{{...}}} form) — browsers decode entities back to
		// the real value when parsing the attribute, as confirmed manually
		// via a live SW-served page in a real browser.
		expect(html).toContain('aithne-origin="https:&#x2F;&#x2F;aithne.l42.eu"');
		expect(consoleWarnSpy).not.toHaveBeenCalled();
	});

	test('page data wins over config on a key collision', async () => {
		installFakeCaches({ json: async () => ({ aithne_origin: 'https://aithne.l42.eu', name: 'FromConfig' }) });

		const response = await populateTemplate({ name: 'FromData', pagetype: 'list' });
		const html = await response.text();

		expect(html).toContain('FromData');
		expect(html).not.toContain('FromConfig');
	});

	test('warns loudly and still renders when the config cache is empty (fail loud, not silently)', async () => {
		installFakeCaches(undefined); // cache miss, e.g. before install completes

		const response = await populateTemplate({ name: 'My List', pagetype: 'list' });
		const html = await response.text();

		expect(html).toContain('aithne-origin=""');
		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('aithne_origin unavailable'));
	});
});
