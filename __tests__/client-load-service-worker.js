import { jest } from '@jest/globals';

// load-service-worker.js runs at import time (top-level await), so each test
// stubs the browser globals and then dynamically imports it fresh.

function setup({ waiting }) {
	const channelListeners = {};
	global.BroadcastChannel = jest.fn(() => ({
		addEventListener: (type, cb) => { channelListeners[type] = cb; },
		postMessage: jest.fn(),
	}));
	const registration = {
		scope: '/',
		waiting,
		addEventListener: jest.fn(),
		update: jest.fn(),
	};
	global.navigator = {
		serviceWorker: {
			register: jest.fn().mockResolvedValue(registration),
			addEventListener: jest.fn(),
		},
	};
	global.window = { location: { reload: jest.fn() } };
	return { channelListeners, registration };
}

beforeEach(() => {
	jest.resetModules();
});

afterEach(() => {
	delete global.BroadcastChannel;
	delete global.navigator;
	delete global.window;
});

test('forwards service-worker-skip-waiting to the waiting worker via postMessage', async () => {
	const waiting = { postMessage: jest.fn() };
	const { channelListeners } = setup({ waiting });
	await import('../src/client/load-service-worker.js');

	channelListeners.message({ data: 'service-worker-skip-waiting' });
	expect(waiting.postMessage).toHaveBeenCalledWith('skip-waiting');
});

test('does not throw when there is no waiting worker', async () => {
	const { channelListeners } = setup({ waiting: null });
	await import('../src/client/load-service-worker.js');

	expect(() => channelListeners.message({ data: 'service-worker-skip-waiting' })).not.toThrow();
});

test('streaming-opened triggers an update check but does not skip waiting', async () => {
	const waiting = { postMessage: jest.fn() };
	const { channelListeners, registration } = setup({ waiting });
	await import('../src/client/load-service-worker.js');
	registration.update.mockClear();

	channelListeners.message({ data: 'streaming-opened' });
	expect(registration.update).toHaveBeenCalledTimes(1);
	expect(waiting.postMessage).not.toHaveBeenCalled();
});
