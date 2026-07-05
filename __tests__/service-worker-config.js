import { jest } from '@jest/globals';
import fetchConfig, { getConfig } from '../src/service-worker/config.js';

// The service worker's `caches` global isn't available in the jest 'node'
// test environment, so each test stubs it directly (same approach as
// mocking other browser/runtime globals — see __tests__/auth.js).

afterEach(() => {
	delete global.caches;
	jest.restoreAllMocks();
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
		expect(open).toHaveBeenCalledWith('config-v1');
		expect(match).toHaveBeenCalledWith('/config.json');
	});
});

describe('fetchConfig (default export)', () => {
	test('caches /config.json', async () => {
		const addAll = jest.fn().mockResolvedValue(undefined);
		const open = jest.fn().mockResolvedValue({ addAll });
		global.caches = { open };

		await fetchConfig();

		expect(open).toHaveBeenCalledWith('config-v1');
		expect(addAll).toHaveBeenCalledWith(['/config.json']);
	});

	test('does not throw when caching fails offline — install must not break', async () => {
		const addAll = jest.fn().mockRejectedValue(new Error('network unavailable'));
		const open = jest.fn().mockResolvedValue({ addAll });
		global.caches = { open };
		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		await expect(fetchConfig()).resolves.toBeUndefined();

		expect(consoleErrorSpy).toHaveBeenCalled();
	});
});
