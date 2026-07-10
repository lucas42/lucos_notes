import { jest } from '@jest/globals';

// update.js has top-level side effects (registers a BroadcastChannel listener
// and, as of this change, a self-level 'activate' listener) that run at import
// time — so each test stubs the required globals and then dynamically
// imports the module fresh (jest.resetModules() first), rather than a static
// import at the top of this file. Same rationale as the other
// service-worker-*.js test files: these globals don't exist in jest's 'node'
// test environment.

function makeBroadcastChannel() {
	const listeners = {};
	return {
		addEventListener: jest.fn((type, cb) => { listeners[type] = cb; }),
		postMessage: jest.fn(),
		_trigger: (type, data) => listeners[type]?.({ data }),
	};
}

beforeEach(() => {
	jest.resetModules();
});

afterEach(() => {
	delete global.BroadcastChannel;
	delete global.self;
});

test('service-worker-skip-waiting message calls self.skipWaiting()', async () => {
	const channel = makeBroadcastChannel();
	global.BroadcastChannel = jest.fn(() => channel);
	global.self = {
		skipWaiting: jest.fn(),
		clients: { claim: jest.fn().mockResolvedValue(undefined) },
		addEventListener: jest.fn(),
	};

	await import('../src/service-worker/update.js');

	channel._trigger('message', 'service-worker-skip-waiting');
	expect(global.self.skipWaiting).toHaveBeenCalledTimes(1);
});

test('ignores unrelated status messages', async () => {
	const channel = makeBroadcastChannel();
	global.BroadcastChannel = jest.fn(() => channel);
	global.self = {
		skipWaiting: jest.fn(),
		clients: { claim: jest.fn().mockResolvedValue(undefined) },
		addEventListener: jest.fn(),
	};

	await import('../src/service-worker/update.js');

	channel._trigger('message', 'streaming-opened');
	expect(global.self.skipWaiting).not.toHaveBeenCalled();
});

test('claims existing clients on activate — without this, the tab that clicked "update" never sees controllerchange and the navbar spin never clears', async () => {
	const channel = makeBroadcastChannel();
	global.BroadcastChannel = jest.fn(() => channel);
	const claim = jest.fn().mockResolvedValue(undefined);
	let activateHandler;
	global.self = {
		skipWaiting: jest.fn(),
		clients: { claim },
		addEventListener: jest.fn((type, cb) => {
			if (type === 'activate') activateHandler = cb;
		}),
	};

	await import('../src/service-worker/update.js');

	expect(global.self.addEventListener).toHaveBeenCalledWith('activate', expect.any(Function));
	expect(typeof activateHandler).toBe('function');

	const waitUntil = jest.fn();
	activateHandler({ waitUntil });

	expect(waitUntil).toHaveBeenCalledTimes(1);
	await waitUntil.mock.calls[0][0];
	expect(claim).toHaveBeenCalledTimes(1);
});
