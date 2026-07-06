import { jest } from '@jest/globals';
import refresh, { getConfig } from '../src/service-worker/static-resources.js';

// The service worker's `caches` global isn't available in the jest 'node'
// test environment, so each test stubs it directly (same approach as
// __tests__/auth.js mocking other browser/runtime globals).

afterEach(() => {
	delete global.caches;
	jest.restoreAllMocks();
});

describe('refresh (default export)', () => {
	test('caches all local resources, including /config.json, in one batch', async () => {
		const addAll = jest.fn().mockResolvedValue(undefined);
		const open = jest.fn().mockResolvedValue({ addAll });
		global.caches = { open };

		await refresh();

		expect(open).toHaveBeenCalledWith('resources-v1');
		expect(addAll).toHaveBeenCalledWith(expect.arrayContaining(['/config.json', '/style.css', '/client.js']));
	});

	test('does not throw when caching fails offline — install must not break', async () => {
		const addAll = jest.fn().mockRejectedValue(new Error('network unavailable'));
		const open = jest.fn().mockResolvedValue({ addAll });
		global.caches = { open };
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		await expect(refresh()).resolves.toBeUndefined();

		expect(consoleErrorSpy).toHaveBeenCalled();
	});
});

describe('getConfig', () => {
	test('returns {} when nothing is cached (e.g. before install completes)', async () => {
		const match = jest.fn().mockResolvedValue(undefined);
		global.caches = { open: jest.fn().mockResolvedValue({ match }) };

		expect(await getConfig()).toEqual({});
	});

	test('returns the cached global config, parsed from JSON', async () => {
		const cachedResponse = { json: jest.fn().mockResolvedValue({ aithne_origin: 'https://aithne.l42.eu' }) };
		const match = jest.fn().mockResolvedValue(cachedResponse);
		const open = jest.fn().mockResolvedValue({ match });
		global.caches = { open };

		expect(await getConfig()).toEqual({ aithne_origin: 'https://aithne.l42.eu' });
		expect(open).toHaveBeenCalledWith('resources-v1');
		expect(match).toHaveBeenCalledWith('/config.json');
	});
});
